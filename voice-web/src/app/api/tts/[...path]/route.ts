import { NextRequest, NextResponse } from 'next/server';
import http from 'node:http';

export const maxDuration = 600;

const BACKEND_URL = process.env.VOICE_API_URL || 'http://localhost:8081';

function proxyViaHttp(
  method: string,
  target: URL,
  headers: Record<string, string>,
  body: Buffer | undefined,
): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve) => {
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port || 80,
        path: target.pathname + target.search,
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const h = new Headers();
          for (const [k, v] of Object.entries(res.headers)) {
            if (v && !['transfer-encoding', 'content-encoding'].includes(k.toLowerCase())) {
              h.set(k, Array.isArray(v) ? v.join(', ') : v);
            }
          }
          resolve(new NextResponse(buf, { status: res.statusCode ?? 502, headers: h }));
        });
      },
    );

    req.setTimeout(600_000, () => {
      req.destroy();
      resolve(
        NextResponse.json(
          { success: false, message: 'TTS 처리 시간이 초과되었습니다. CPU 모드에서는 voice-clone이 오래 걸릴 수 있습니다.' },
          { status: 504 },
        ),
      );
    });

    req.on('error', (err) => {
      resolve(
        NextResponse.json(
          { success: false, message: `백엔드 연결 실패: ${err.message}` },
          { status: 502 },
        ),
      );
    });

    if (body) req.write(body);
    req.end();
  });
}

async function proxy(req: NextRequest, segments: string[]) {
  const target = new URL(`${BACKEND_URL}/api/tts/${segments.join('/')}${req.nextUrl.search}`);
  const headers: Record<string, string> = {};
  const ct = req.headers.get('content-type');
  if (ct) headers['Content-Type'] = ct;
  const body = ['GET', 'HEAD'].includes(req.method)
    ? undefined
    : Buffer.from(await req.arrayBuffer());
  return proxyViaHttp(req.method, target, headers, body);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(req, path);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(req, path);
}
