# Voice Stack

TTS(음성 합성) 웹 애플리케이션 스택. **CustomVoice**, **VoiceDesign**, **VoiceClone** 모드를 지원합니다.

## 구조

| 디렉터리       | 설명                                                     | 기술 스택                          |
| -------------- | -------------------------------------------------------- | ---------------------------------- |
| **backend**    | API 서버 (음성 합성 프록시, 합성 기록, 참조 음성 업로드) | Kotlin 2.2, Spring Boot 4, Java 21 |
| **voice-web**  | 프론트엔드 (합성 폼, 목록/페이징, 참조 음성 미리듣기)    | Next.js 15, React 19, pnpm         |
| **tts-server** | TTS 스텁 (실제 TTS 없이 개발용)                          | Python 3, HTTP 서버                |

- 백엔드는 외부 TTS 서비스(`TTS_SERVICE_URL`)를 호출합니다. 로컬 개발 시 **tts-server**를 스텁으로 사용할 수 있습니다.
- 참조 음성(VoiceClone) 저장은 MinIO를 사용합니다 (선택).

## 사전 요구 사항

- **Java 21** (backend)
- **Node.js** + **pnpm** (voice-web)
- **Python 3** (tts-server 스텁 사용 시)
- (선택) **MinIO** — 참조 음성 업로드/저장용

## 설정

### voice-web

`voice-web/.env.local` (또는 `.env`)에 백엔드 주소를 넣습니다.

```env
NEXT_PUBLIC_VOICE_API_URL=http://localhost:8081
VOICE_API_URL=http://localhost:8081
```

- `NEXT_PUBLIC_VOICE_API_URL`: 브라우저에서 호출할 API 베이스 URL.
- `VOICE_API_URL`: Next 서버의 rewrites 대상 (기본값 `http://localhost:8081`).

`.env.example`을 복사해 사용할 수 있습니다.

### backend

- **application.yml** / 환경 변수:
  - `TTS_SERVICE_URL`: TTS 서비스 URL (기본 `http://localhost:8000`, tts-server 스텁)
  - `DASHSCOPE_API_KEY`: DashScope(阿里) TTS 사용 시 API 키
  - `VOICE_WEB_ORIGIN`: CORS 허용 오리진 (기본 `http://localhost:3000`)
  - MinIO: `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` 등

## 실행 순서

1. **TTS 서비스** (둘 중 하나)
   - **스텁**: `tts-server` 실행 → `http://localhost:8000`
   - 또는 실제 TTS 서비스 URL을 `TTS_SERVICE_URL`로 설정
2. **backend** → `http://localhost:8081`
3. **voice-web** → `http://localhost:3000`
4. (선택) **MinIO** — VoiceClone 참조 음성 업로드 시 필요

### 각 서비스 실행 방법

**tts-server (스텁)**

```bash
cd tts-server
python tts_stub.py
# 또는 Windows: run.bat
```

- 포트 **8000**에서 `/tts/custom-voice`, `/tts/voice-design`, `/tts/voice-clone` 요청에 무음 오디오(base64)를 반환합니다.

**backend**

```bash
cd backend
./gradlew bootRun
```

- 기본 포트 **8081**.

**voice-web**

```bash
cd voice-web
pnpm install
pnpm dev
```

- 기본 포트 **3000**. 브라우저에서 `http://localhost:3000` 접속.

## Instruct (선택) 사용 방법

**Instruct (선택)**은 **CustomVoice** 모드에서만 쓰는 **추가 지시문**입니다.

- **스피커**: 미리 정해진 목소리(예: Ryan)를 고릅니다.
- **Instruct (선택)**: 그 목소리에 더해, **말투·감정·톤** 등을 짧게 적는 칸입니다.

**예시**

- 비어 둠 → 스피커 기본 톤으로만 합성
- `"Very happy"` → 기쁜 톤
- `"Whisper"` → 속삭이는 느낌
- `"Slow and clear"` → 천천히, 또렷하게

백엔드는 이 값을 그대로 외부 TTS API(`TtsGateway.synthesizeCustomVoice(..., instruct)`)로 넘깁니다.  
선택 사항이라 **비워 두면** `""`로 전달되고, **VoiceDesign**처럼 필수가 아닙니다.

**VoiceDesign**의 **Instruct (자연어 설명)** 는 “스피커 선택 없이 음색·감정만 설명”하는 모드라서, 그쪽에서는 Instruct가 필수입니다.
