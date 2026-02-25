'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { SynthesisRecord, SynthesisListResponse } from '@/domain/tts/types';
import {
  fetchSynthesisList,
  fetchSynthesisById,
  getSynthesisDownloadUrl,
} from '@/application/api/ttsApi';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export default function BoardListPage() {
  const [data, setData] = useState<SynthesisListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [detail, setDetail] = useState<SynthesisRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSynthesisList({
        page,
        size: pageSize,
        search: search.trim() || undefined,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  };

  const totalPages = data != null ? Math.max(0, Number(data.totalPages) || 0) : 0;

  const openDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const record = await fetchSynthesisById(id);
      setDetail(record ?? null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      return d.toLocaleString('ko-KR');
    } catch {
      return s;
    }
  };

  const truncate = (text: string, len: number) =>
    text.length <= len ? text : text.slice(0, len) + '…';

  return (
    <main style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.5rem', marginRight: 'auto' }}>합성 기록 목록</h1>
        <Link
          href="/"
          style={{
            padding: '8px 16px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
          }}
        >
          합성하기
        </Link>
      </div>

      <form onSubmit={handleSearch} style={{ marginBottom: '1rem', display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="텍스트, 모드, 언어로 검색…"
          style={{
            flex: 1,
            padding: '10px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 20px',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          검색
        </button>
      </form>

      {error && (
        <div style={{ padding: 12, background: 'rgba(239,68,68,0.15)', borderRadius: 8, color: 'var(--error)', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>목록 불러오는 중…</p>
      ) : data ? (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
          >
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>
              전체 {data.total}건 (페이지 {data.page + 1} / {Math.max(1, data.totalPages)})
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
              <span style={{ color: 'var(--muted)' }}>페이지 크기</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                style={{
                  padding: '6px 10px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
              background: 'var(--surface)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '12px', fontWeight: 600 }}>텍스트</th>
                  <th style={{ padding: '12px', fontWeight: 600 }}>모드</th>
                  <th style={{ padding: '12px', fontWeight: 600 }}>언어</th>
                  <th style={{ padding: '12px', fontWeight: 600 }}>생성일시</th>
                  <th style={{ padding: '12px', fontWeight: 600 }}>동작</th>
                </tr>
              </thead>
              <tbody>
                {(data.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>
                      저장된 합성 기록이 없습니다. 합성 시 &quot;목록에 저장&quot;을 켜면 여기에 표시됩니다.
                    </td>
                  </tr>
                ) : (
                  (data.items ?? []).map((item) => (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td style={{ padding: '12px', color: 'var(--muted)' }}>{item.id}</td>
                      <td style={{ padding: '12px', maxWidth: 240 }} title={item.text}>
                        {truncate(item.text, 40)}
                      </td>
                      <td style={{ padding: '12px' }}>{item.mode}</td>
                      <td style={{ padding: '12px' }}>{item.language}</td>
                      <td style={{ padding: '12px', fontSize: 13, color: 'var(--muted)' }}>
                        {formatDate(item.createdAt)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          type="button"
                          onClick={() => openDetail(item.id)}
                          style={{
                            marginRight: 8,
                            padding: '6px 12px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            color: 'var(--accent)',
                          }}
                        >
                          상세
                        </button>
                        <a
                          href={getSynthesisDownloadUrl(item.id)}
                          download={`synthesis-${item.id}.wav`}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            textDecoration: 'none',
                            display: 'inline-block',
                          }}
                        >
                          다운로드
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage(0)}
              style={{
                padding: '8px 12px',
                background: page <= 0 ? 'var(--border)' : 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
              }}
            >
              처음
            </button>
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={{
                padding: '8px 12px',
                background: page <= 0 ? 'var(--border)' : 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
              }}
            >
              이전
            </button>
            <span style={{ padding: '8px 12px', minWidth: 48, textAlign: 'center', color: 'var(--text)', fontSize: 14 }}>
              {page + 1} / {Math.max(1, totalPages)}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              style={{
                padding: '8px 12px',
                background: page >= totalPages - 1 ? 'var(--border)' : 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
              }}
            >
              다음
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(Math.max(0, totalPages - 1))}
              style={{
                padding: '8px 12px',
                background: page >= totalPages - 1 ? 'var(--border)' : 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
              }}
            >
              마지막
            </button>
          </div>
        </>
      ) : null}

      {detail !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="상세"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 24,
          }}
          onClick={() => setDetail(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              maxWidth: 520,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <p style={{ color: 'var(--muted)' }}>불러오는 중…</p>
            ) : detail ? (
              <>
                <h2 style={{ marginBottom: 16, fontSize: '1.25rem' }}>상세 #{detail.id}</h2>
                <dl style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                  <div>
                    <dt style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>텍스트</dt>
                    <dd style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{detail.text}</dd>
                  </div>
                  <div>
                    <dt style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>모드</dt>
                    <dd>{detail.mode}</dd>
                  </div>
                  <div>
                    <dt style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>언어</dt>
                    <dd>{detail.language}</dd>
                  </div>
                  {detail.speakerOrInstruct && (
                    <div>
                      <dt style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>스피커/지시</dt>
                      <dd>{detail.speakerOrInstruct}</dd>
                    </div>
                  )}
                  <div>
                    <dt style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>생성일시</dt>
                    <dd>{formatDate(detail.createdAt)}</dd>
                  </div>
                </dl>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <audio
                    controls
                    src={getSynthesisDownloadUrl(detail.id)}
                    style={{ width: '100%', marginBottom: 8 }}
                  />
                  <a
                    href={getSynthesisDownloadUrl(detail.id)}
                    download={`synthesis-${detail.id}.wav`}
                    style={{
                      padding: '10px 20px',
                      background: 'var(--accent)',
                      color: 'white',
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    WAV 다운로드
                  </a>
                  <button
                    type="button"
                    onClick={() => setDetail(null)}
                    style={{
                      padding: '10px 20px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text)',
                    }}
                  >
                    닫기
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
