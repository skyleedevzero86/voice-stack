'use client';

import Link from 'next/link';

export default function BoardListError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.25rem', marginBottom: 12 }}>목록을 불러올 수 없습니다</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 16 }}>{error.message}</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '10px 20px',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          다시 시도
        </button>
        <Link
          href="/"
          style={{
            padding: '10px 20px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
          }}
        >
          합성하기
        </Link>
      </div>
    </main>
  );
}
