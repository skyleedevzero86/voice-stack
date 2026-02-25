import base64
import json
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 8000
SAMPLE_RATE = 24000
SILENT_SEC = 0.3
SILENT_PCM_BYTES = int(SAMPLE_RATE * SILENT_SEC * 2)
SILENT_BASE64 = base64.b64encode(b"\x00" * SILENT_PCM_BYTES).decode("ascii")


class TtsStubHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path not in ("/tts/custom-voice", "/tts/voice-design", "/tts/voice-clone"):
            self.send_json(404, {"success": False, "message": "Not found"})
            return
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(body.decode("utf-8"))
        except Exception:
            data = {}
        self.send_json(200, {
            "success": True,
            "audioBase64": SILENT_BASE64,
            "sampleRate": SAMPLE_RATE,
        })

    def send_json(self, status, obj):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(obj).encode("utf-8"))

    def log_message(self, format, *args):
        print(f"[tts-stub] {args[0]}")


def main():
    server = HTTPServer(("", PORT), TtsStubHandler)
    print(f"TTS stub listening on http://localhost:{PORT}")
    print("voice-api can use TTS_SERVICE_URL=http://localhost:8000")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
        sys.exit(0)


if __name__ == "__main__":
    main()
