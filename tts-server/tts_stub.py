import base64
import json
import math
import io
import os
import subprocess
import sys
import time
import tempfile
import threading
import wave
from typing import Optional
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

PORT = 8000
TARGET_SAMPLE_RATE = 24000
DURATION_SEC = 2.0
BEEP_SEC = 2.0  
BEEP_HZ = 440
GENERATE_TIMEOUT_SEC = int(os.getenv("QWEN_TTS_TIMEOUT", "300"))

def make_pcm():
    total_samples = int(TARGET_SAMPLE_RATE * DURATION_SEC) * 2
    beep_samples = int(TARGET_SAMPLE_RATE * BEEP_SEC)
    buf = bytearray(total_samples)
    for i in range(beep_samples):
        val = int(32767 * 0.5 * math.sin(2 * math.pi * BEEP_HZ * i / TARGET_SAMPLE_RATE)) 
        lo = val & 0xFF
        hi = (val >> 8) & 0xFF
        buf[i * 2] = lo
        buf[i * 2 + 1] = hi
    return bytes(buf)

FALLBACK_PCM = make_pcm()
FALLBACK_BASE64 = base64.b64encode(FALLBACK_PCM).decode("ascii")

try:
    import pyttsx3  
except Exception:
    pyttsx3 = None

try:
    import numpy as np
except Exception:
    np = None

try:
    import torch
except Exception:
    torch = None

try:
    from qwen_tts import Qwen3TTSModel
except Exception:
    Qwen3TTSModel = None

_MODE_MODEL_DEFAULTS = {
    "custom-voice": "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
    "voice-design": "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
    "voice-clone":  "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
}

_qwen_models: dict[str, object] = {}
_qwen_errors: dict[str, str] = {}

def _normalize_to_pcm16_mono(raw: bytes, sample_width: int, channels: int, sample_rate: int) -> tuple[bytes, int]:
    if sample_width != 2:
        return b"", sample_rate
    if channels <= 1:
        return raw, sample_rate
    frame_size = sample_width * channels
    out = bytearray()
    for i in range(0, len(raw), frame_size):
        frame = raw[i:i + frame_size]
        if len(frame) < frame_size:
            break
        out.extend(frame[0:2])
    return bytes(out), sample_rate

def _floats_to_pcm16(wav: "np.ndarray") -> bytes:
    if np is None:
        return b""
    arr = np.asarray(wav, dtype=np.float32)
    arr = np.clip(arr, -1.0, 1.0)
    return (arr * 32767.0).astype(np.int16).tobytes()

def _is_path_or_url(s: str) -> bool:
    if s.startswith(("http://", "https://")):
        return True
    if s.startswith("/"):
        return True
    if len(s) >= 3 and s[1] == ":" and s[2] in ("/", "\\"):
        return True
    try:
        return len(s) < 1024 and os.path.exists(s)
    except (OSError, ValueError):
        return False


def _detect_audio_ext(data: bytes) -> str:
    if data[:4] == b"RIFF":
        return ".wav"
    if data[4:8] == b"ftyp":
        return ".m4a"
    if data[:3] == b"ID3" or (len(data) >= 2 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0):
        return ".mp3"
    if data[:4] == b"OggS":
        return ".ogg"
    if data[:4] == b"fLaC":
        return ".flac"
    return ".wav"


_LIBROSA_NATIVE_EXTS = {".wav", ".flac", ".ogg"}


def _find_ffmpeg() -> str:
    import shutil
    found = shutil.which("ffmpeg")
    if found:
        return found
    if sys.platform == "win32":
        local = os.environ.get("LOCALAPPDATA", "")
        winget_links = os.path.join(local, "Microsoft", "WinGet", "Links", "ffmpeg.exe")
        if os.path.isfile(winget_links):
            return winget_links
        pkgs = os.path.join(local, "Microsoft", "WinGet", "Packages")
        if os.path.isdir(pkgs):
            for d in os.listdir(pkgs):
                if "ffmpeg" in d.lower():
                    bin_dir = os.path.join(pkgs, d)
                    for root, dirs, files in os.walk(bin_dir):
                        if "ffmpeg.exe" in files:
                            return os.path.join(root, "ffmpeg.exe")
    return "ffmpeg"


def _ensure_wav_format(file_path: str, ext: str) -> str:
    if ext in _LIBROSA_NATIVE_EXTS:
        return file_path
    wav_path = file_path.rsplit(".", 1)[0] + ".wav"
    ffmpeg_bin = _find_ffmpeg()
    try:
        result = subprocess.run(
            [ffmpeg_bin, "-y", "-i", file_path, "-ar", "16000", "-ac", "1", "-f", "wav", wav_path],
            capture_output=True, timeout=30,
        )
        if result.returncode == 0 and os.path.exists(wav_path):
            print(f"[qwen3] ffmpeg: {ext} -> WAV 변환 완료")
            os.remove(file_path)
            return wav_path
        print(f"[qwen3] ffmpeg 실패: {result.stderr.decode(errors='replace')[:200]}")
    except FileNotFoundError:
        print(f"[qwen3] ffmpeg 미설치 (경로: {ffmpeg_bin})")
    except Exception as e:
        print(f"[qwen3] ffmpeg 변환 오류: {e}")
    try:
        from pydub import AudioSegment
        ffmpeg_for_pydub = _find_ffmpeg()
        if ffmpeg_for_pydub != "ffmpeg":
            AudioSegment.converter = ffmpeg_for_pydub
            ffprobe = ffmpeg_for_pydub.replace("ffmpeg", "ffprobe")
            if os.path.isfile(ffprobe):
                AudioSegment.ffprobe = ffprobe
        audio = AudioSegment.from_file(file_path)
        audio.export(wav_path, format="wav")
        print(f"[qwen3] pydub: {ext} -> WAV 변환 완료")
        os.remove(file_path)
        return wav_path
    except Exception as e:
        print(f"[qwen3] pydub 변환 실패: {e}")
    raise RuntimeError(
        f"참조 오디오가 {ext} 형식입니다. "
        "librosa는 WAV/FLAC/OGG만 직접 읽을 수 있습니다. "
        "ffmpeg를 설치하세요: winget install ffmpeg (또는 WAV 파일을 업로드하세요)"
    )


def _get_model_id(mode: str) -> str:
    override = os.getenv("QWEN_TTS_MODEL", "").strip()
    if override:
        return override
    return _MODE_MODEL_DEFAULTS.get(mode, _MODE_MODEL_DEFAULTS["custom-voice"])


def _load_qwen_model(mode: str) -> tuple[Optional[object], Optional[str]]:
    if Qwen3TTSModel is None:
        return None, "qwen_tts 패키지 없음 (pip install qwen-tts)"
    if torch is None:
        return None, "torch 패키지 없음 (pip install torch)"
    model_id = _get_model_id(mode)
    if model_id in _qwen_models:
        return _qwen_models[model_id], None
    if model_id in _qwen_errors:
        return None, _qwen_errors[model_id]
    device = os.getenv("QWEN_TTS_DEVICE", "cpu")
    dtype_name = os.getenv("QWEN_TTS_DTYPE", "float32").lower()
    dtype = torch.float32
    if dtype_name == "bfloat16":
        dtype = torch.bfloat16
    elif dtype_name == "float16":
        dtype = torch.float16
    kwargs = {
        "device_map": device,
        "dtype": dtype,
    }
    attn_impl = os.getenv("QWEN_TTS_ATTN_IMPL", "").strip()
    if attn_impl:
        kwargs["attn_implementation"] = attn_impl
    print(f"[qwen3] 모델 로드 중: {model_id} (mode={mode})...")
    try:
        model = Qwen3TTSModel.from_pretrained(model_id, **kwargs)
        _qwen_models[model_id] = model
        print(f"[qwen3] 모델 로드 완료: {model_id}")
        return model, None
    except Exception as e:
        err = f"Qwen3 모델 로드 실패 ({model_id}): {e}"
        _qwen_errors[model_id] = err
        return None, err

def _run_with_timeout(fn, timeout_sec: int, label: str):
    result = [None]
    error = [None]

    def _worker():
        try:
            result[0] = fn()
        except Exception as e:
            error[0] = e

    t = threading.Thread(target=_worker, daemon=True)
    t.start()
    t.join(timeout=timeout_sec)
    if t.is_alive():
        print(f"[qwen3] {label} 타임아웃 ({timeout_sec}초 초과). 무한 생성 감지.")
        raise RuntimeError(
            f"TTS 생성이 {timeout_sec}초를 초과했습니다. "
            "모델이 무한 생성 상태일 수 있습니다. QWEN_TTS_TIMEOUT 환경변수로 제한 시간을 조정할 수 있습니다."
        )
    if error[0]:
        raise error[0]
    return result[0]


def _qwen_generate(payload: dict, mode: str) -> tuple[bytes, int]:
    if np is None:
        raise RuntimeError("numpy 패키지 없음 (pip install numpy)")
    model, err = _load_qwen_model(mode)
    if model is None:
        raise RuntimeError(err or "Qwen3 모델 미사용 상태")
    text = str(payload.get("text") or "").strip()
    language = str(payload.get("language") or "Auto")
    speaker = str(payload.get("speaker") or "Vivian")
    instruct = str(payload.get("instruct") or "")
    if mode == "voice-design":
        if not instruct:
            instruct = "A calm, natural voice."
        wavs, sr = _run_with_timeout(
            lambda: model.generate_voice_design(text=text, language=language, instruct=instruct),
            GENERATE_TIMEOUT_SEC, "voice-design",
        )
    elif mode == "voice-clone":
        ref_audio_raw = payload.get("refAudio")
        ref_text = (payload.get("refText") or "").strip() or None
        x_vector_only = bool(payload.get("xVectorOnlyMode", False))
        if not ref_text:
            x_vector_only = True
        if not ref_audio_raw:
            raise RuntimeError("voice-clone 모드는 refAudio가 필요합니다.")
        ref_audio_val = ref_audio_raw
        temp_ref_path = None
        converted_path = None
        if not _is_path_or_url(ref_audio_raw):
            try:
                audio_bytes = base64.b64decode(ref_audio_raw)
                ext = _detect_audio_ext(audio_bytes)
                fd, temp_ref_path = tempfile.mkstemp(suffix=ext)
                os.write(fd, audio_bytes)
                os.close(fd)
                print(f"[qwen3] ref_audio base64 -> temp file {temp_ref_path} ({len(audio_bytes)} bytes, ext={ext})")
                converted_path = _ensure_wav_format(temp_ref_path, ext)
                ref_audio_val = converted_path
            except Exception as e:
                print(f"[qwen3] ref_audio 처리 실패: {e}")
                raise
        try:
            wavs, sr = _run_with_timeout(
                lambda: model.generate_voice_clone(
                    text=text, language=language, ref_audio=ref_audio_val,
                    ref_text=ref_text, x_vector_only_mode=x_vector_only,
                ),
                GENERATE_TIMEOUT_SEC, "voice-clone",
            )
        finally:
            for p in (temp_ref_path, converted_path):
                if p and os.path.exists(p):
                    try:
                        os.remove(p)
                    except OSError:
                        pass
    else:
        wavs, sr = _run_with_timeout(
            lambda: model.generate_custom_voice(
                text=text, language=language, speaker=speaker,
                instruct=instruct if instruct else None,
            ),
            GENERATE_TIMEOUT_SEC, "custom-voice",
        )
    if not wavs:
        raise RuntimeError("Qwen3 출력 오디오 없음")
    pcm = _floats_to_pcm16(wavs[0])
    if not pcm:
        raise RuntimeError("Qwen3 출력 PCM 변환 실패")
    return pcm, int(sr)

def _pyttsx3_generate(text: str) -> tuple[bytes, int]:
    cleaned = (text or "").strip()
    if not cleaned:
        return FALLBACK_PCM, TARGET_SAMPLE_RATE
    if pyttsx3 is None:
        return FALLBACK_PCM, TARGET_SAMPLE_RATE
    wav_path = None
    try:
        fd, wav_path = tempfile.mkstemp(prefix="tts_stub_", suffix=".wav")
        os.close(fd)
        engine = pyttsx3.init()
        engine.setProperty("rate", 170)
        engine.save_to_file(cleaned, wav_path)
        engine.runAndWait()
        with wave.open(wav_path, "rb") as wf:
            raw = wf.readframes(wf.getnframes())
            pcm, rate = _normalize_to_pcm16_mono(raw, wf.getsampwidth(), wf.getnchannels(), wf.getframerate())
            if not pcm:
                return FALLBACK_PCM, TARGET_SAMPLE_RATE
            return pcm, rate
    except Exception:
        return FALLBACK_PCM, TARGET_SAMPLE_RATE
    finally:
        if wav_path and os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except OSError:
                pass

def synthesize_text_pcm(payload: dict, mode: str) -> tuple[bytes, int, str]:
    engine = os.getenv("TTS_ENGINE", "auto").strip().lower()
    qwen_device = os.getenv("QWEN_TTS_DEVICE", "cpu").strip().lower()
    allow_qwen_on_cpu = os.getenv("QWEN_TTS_ENABLE_CPU", "0").strip() == "1"
    can_try_qwen_auto = not (qwen_device == "cpu" and not allow_qwen_on_cpu)
    text = str(payload.get("text") or "")
    need_qwen = mode in ("voice-clone", "voice-design")
    if engine == "qwen3" or (engine == "auto" and can_try_qwen_auto) or (engine == "auto" and need_qwen):
        try:
            pcm, sr = _qwen_generate(payload, mode)
            return pcm, sr, "qwen3"
        except Exception as e:
            if engine == "qwen3" or need_qwen:
                print(f"[qwen3] {mode} 모드 실패: {e}")
            else:
                print(f"[qwen3] 자동 모드 실패, fallback 사용: {e}")
            if need_qwen:
                msg = str(e).strip()
                if not msg:
                    msg = type(e).__name__
                raise RuntimeError(f"{mode} 합성 실패: {msg}")
    elif engine == "auto" and qwen_device == "cpu" and not allow_qwen_on_cpu:
        print("[qwen3] 자동 모드에서 CPU 실행은 너무 느릴 수 있어 건너뜀. QWEN_TTS_ENABLE_CPU=1 또는 TTS_ENGINE=qwen3 로 강제 가능.")
    if engine in ("pyttsx3", "auto"):
        pcm, sr = _pyttsx3_generate(text)
        return pcm, sr, "pyttsx3" if pyttsx3 is not None else "fallback-beep"
    return FALLBACK_PCM, TARGET_SAMPLE_RATE, "fallback-beep"


class TtsStubHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/tts/info":
            body = json.dumps(
                {
                    "engineMode": os.getenv("TTS_ENGINE", "auto"),
                    "pyttsx3Installed": pyttsx3 is not None,
                    "qwenTtsInstalled": Qwen3TTSModel is not None,
                    "torchInstalled": torch is not None,
                    "numpyInstalled": np is not None,
                    "qwenModels": {m: _get_model_id(m) for m in _MODE_MODEL_DEFAULTS},
                    "qwenLoadedModels": list(_qwen_models.keys()),
                    "qwenErrors": _qwen_errors or None,
                    "sampleRate": TARGET_SAMPLE_RATE,
                    "fallbackAudioBase64Len": len(FALLBACK_BASE64),
                }
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        start = time.perf_counter()
        if self.path not in ("/tts/custom-voice", "/tts/voice-design", "/tts/voice-clone"):
            body = json.dumps({"success": False, "message": "Not found"}).encode("utf-8")
            self.send_response(404)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            elapsed = int((time.perf_counter() - start) * 1000)
            print(f"POST {self.path} 404 {elapsed}ms")
            return
        length = int(self.headers.get("Content-Length", 0))
        req_body = self.rfile.read(length) if length else b"{}"
        payload_map = {}
        try:
            payload_map = json.loads(req_body.decode("utf-8"))
            if not isinstance(payload_map, dict):
                payload_map = {}
        except Exception:
            pass
        mode = "custom-voice"
        if self.path.endswith("/voice-design"):
            mode = "voice-design"
        elif self.path.endswith("/voice-clone"):
            mode = "voice-clone"
        try:
            pcm, sample_rate, used_engine = synthesize_text_pcm(payload_map, mode)
        except RuntimeError as e:
            err_body = json.dumps({"success": False, "message": str(e)}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(err_body)))
            self.end_headers()
            self.wfile.write(err_body)
            elapsed = int((time.perf_counter() - start) * 1000)
            print(f"POST {self.path} err {elapsed}ms | mode={mode} error={e}")
            return
        audio_base64 = base64.b64encode(pcm).decode("ascii")
        payload = json.dumps({"success": True, "audioBase64": audio_base64, "sampleRate": sample_rate}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
        self.wfile.flush()
        elapsed = int((time.perf_counter() - start) * 1000)
        audio_len = len(audio_base64)
        text_len = len(str(payload_map.get("text") or ""))
        print(
            f"POST {self.path} 200 {elapsed}ms {len(payload)} | "
            f"engine={used_engine} mode={mode} "
            f"textLen={text_len} audioBase64Len={audio_len}, sampleRate={sample_rate}"
        )

    def log_message(self, format, *args):
        pass


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


def main():
    try:
        server = ThreadingHTTPServer(("", PORT), TtsStubHandler)
    except OSError as e:
        if e.errno == 98 or "10048" in str(e) or "Address already in use" in str(e):
            print(f"오류: 포트 {PORT}이 이미 사용 중입니다. 기존 tts_stub 프로세스를 종료한 뒤 다시 실행하세요.")
            print("  Windows: netstat -ano | findstr :8000  후 해당 PID로 taskkill /PID <pid> /F")
        else:
            raise
        sys.exit(1)
    print(f"TTS stub listening on http://localhost:{PORT}")
    print(f"  엔진 모드: {os.getenv('TTS_ENGINE', 'auto')} (qwen3 -> pyttsx3 -> fallback)")
    print(f"  qwen_tts 설치: {Qwen3TTSModel is not None}, torch 설치: {torch is not None}, numpy 설치: {np is not None}")
    print(f"  pyttsx3 설치: {pyttsx3 is not None}")
    override = os.getenv("QWEN_TTS_MODEL", "").strip()
    if override:
        print(f"  QWEN_TTS_MODEL 오버라이드: {override} (모든 모드에 동일 모델 사용)")
    else:
        for m, mid in _MODE_MODEL_DEFAULTS.items():
            print(f"  {m:16s} -> {mid}")
    print(f"  fallback 비프: {DURATION_SEC}초, base64 길이={len(FALLBACK_BASE64)}")
    print("  상태 확인: 브라우저에서 http://localhost:8000/tts/info")
    if Qwen3TTSModel is None:
        print("  참고: qwen-tts 미설치. 설치: pip install qwen-tts")
    if torch is None:
        print("  참고: torch 미설치. 설치: pip install torch")
    if np is None:
        print("  참고: numpy 미설치. 설치: pip install numpy")
    if pyttsx3 is None:
        print("  참고: pyttsx3 미설치 시 마지막 fallback은 비프음입니다. 설치: pip install pyttsx3")
    print("voice-api can use TTS_SERVICE_URL=http://localhost:8000")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
        sys.exit(0)


if __name__ == "__main__":
    main()
