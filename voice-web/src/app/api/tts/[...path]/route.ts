import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 600;

const BACKEND = process.env.VOICE_API_URL || 'http://localhost:8081';

async function proxy(req: NextRequest, segments: string[]) {
  const target = `${BACKEND}/api/tts/${segments.join('/')}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  const ct = req.headers.get('content-type');
  if (ct) headers['Content-Type'] = ct;

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer(),
      signal: AbortSignal.timeout(600_000),
    });

    const resHeaders = new Headers();
    upstream.headers.forEach((v, k) => {
      if (!['transfer-encoding', 'content-encoding'].includes(k.toLowerCase())) {
        resHeaders.set(k, v);
      }
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
    const message = isTimeout
      ? 'TTS 처리 시간이 초과되었습니다. CPU 모드에서는 voice-clone이 오래 걸릴 수 있습니다.'
      : `백엔드 연결 실패: ${err instanceof Error ? err.message : String(err)}`;
    return NextResponse.json(
      { success: false, message },
      { status: isTimeout ? 504 : 502 },
    );
  }
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
