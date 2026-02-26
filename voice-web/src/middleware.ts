import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/tts/')) {
    const start = Date.now()
    const res = NextResponse.next()
    const elapsed = Date.now() - start
    console.log(`${request.method} ${request.nextUrl.pathname} -> proxy ${res.status} ${elapsed}ms`)
    return res
  }
  return NextResponse.next()
}

export const config = { matcher: '/api/tts/:path*' }
