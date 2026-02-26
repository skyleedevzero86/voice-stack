'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { TtsMode } from '@/domain/tts/types';
import { LANGUAGES } from '@/domain/tts/constants';
import { useSynthesizeTts, useSpeakers } from '@/application/hooks/useTts';
import { uploadRefAudio, fetchSynthesisList, getSynthesisDownloadUrl } from '@/application/api/ttsApi';
import type { SynthesisListResponse } from '@/domain/tts/types';

const MODES: { value: TtsMode; label: string }[] = [
  { value: 'custom-voice', label: 'CustomVoice' },
  { value: 'voice-design', label: 'VoiceDesign' },
  { value: 'voice-clone', label: 'VoiceClone' },
];

export default function SynthesisPage() {
  const [mode, setMode] = useState<TtsMode>('custom-voice');
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('Auto');
  const [speaker, setSpeaker] = useState('');
  const [instruct, setInstruct] = useState('');
  const [refAudio, setRefAudio] = useState('');
  const [refText, setRefText] = useState('');
  const [saveToList, setSaveToList] = useState(false);
  const [refAudioFile, setRefAudioFile] = useState<File | null>(null);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [uploadRefSuccess, setUploadRefSuccess] = useState(false);

  const [listData, setListData] = useState<SynthesisListResponse | null>(null);
  const [listPage, setListPage] = useState(0);
  const listPageSize = 10;

  const { speakers, load: loadSpeakers } = useSpeakers();
  const { synthesize, loading, error, clearError } = useSynthesizeTts();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | undefined>(undefined);
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadSpeakers();
  }, [loadSpeakers]);

  useEffect(() => {
    if (speakers.length > 0 && !speaker) setSpeaker(speakers[0].id);
  }, [speakers, speaker]);

  useEffect(() => {
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const handleUploadRef = useCallback(async () => {
    if (!refAudioFile) return;
    setUploadingRef(true);
    setUploadRefSuccess(false);
    try {
      const { url } = await uploadRefAudio(refAudioFile);
      setRefAudio(url);
      setUploadRefSuccess(true);
    } catch {
      setRefAudio('');
      setUploadRefSuccess(false);
    } finally {
      setUploadingRef(false);
    }
  }, [refAudioFile]);

  const loadList = useCallback(async () => {
    try {
      const res = await fetchSynthesisList({
        page: listPage,
        size: listPageSize,
      });
      setListData(res);
    } catch {
      setListData(null);
    }
  }, [listPage]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearError();
      setBlobUrl(null);
      setSavedId(undefined);
      setAudioDurationSec(null);
      if (mode === 'voice-clone' && !refAudio.trim()) return;
      if (mode === 'voice-design' && !instruct.trim()) return;

      const result = await synthesize(mode, {
        text: text.trim(),
        language,
        speaker,
        instruct,
        refAudio: refAudio.trim(),
        refText: refText.trim(),
        save: saveToList,
      });
      if (result.blobUrl) {
        setBlobUrl(result.blobUrl);
        setSavedId(result.savedId);
      }
    },
    [
      mode,
      text,
      language,
      speaker,
      instruct,
      refAudio,
      refText,
      saveToList,
      synthesize,
      clearError,
    ]
  );

  const block =
    !text.trim() ||
    (mode === 'voice-design' && !instruct.trim()) ||
    (mode === 'voice-clone' && !refAudio.trim());

  return (
    <main style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
      <div
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginRight: 'auto' }}>Qwen3-TTS 합성</h1>
        <Link
          href="/board/list"
          style={{
            padding: '8px 16px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
          }}
        >
          합성 기록 목록
        </Link>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: 'var(--muted)' }}>
            모드
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                style={{
                  padding: '8px 16px',
                  background: mode === m.value ? 'var(--accent)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="text"
            style={{ display: 'block', marginBottom: 6, fontSize: 14, color: 'var(--muted)' }}
          >
            텍스트 *
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="합성할 문장을 입력하세요"
            required
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              resize: 'vertical',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="language"
            style={{ display: 'block', marginBottom: 6, fontSize: 14, color: 'var(--muted)' }}
          >
            언어
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
            }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        {mode === 'custom-voice' && (
          <>
            <div>
              <label
                htmlFor="speaker"
                style={{ display: 'block', marginBottom: 6, fontSize: 14, color: 'var(--muted)' }}
              >
                스피커
              </label>
              <select
                id="speaker"
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                }}
              >
                {speakers.length === 0 && (
                  <option value="">스피커 불러오는 중…</option>
                )}
                {speakers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.nativeLanguage})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="instruct-cv"
                style={{ display: 'block', marginBottom: 6, fontSize: 14, color: 'var(--muted)' }}
              >
                Instruct (선택)
              </label>
              <input
                id="instruct-cv"
                type="text"
                value={instruct}
                onChange={(e) => setInstruct(e.target.value)}
                placeholder="추가 지시사항"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                }}
              />
            </div>
          </>
        )}

        {mode === 'voice-design' && (
          <div>
            <label
              htmlFor="instruct-vd"
              style={{ display: 'block', marginBottom: 6, fontSize: 14, color: 'var(--muted)' }}
            >
              Instruct (자연어 설명) *
            </label>
            <textarea
              id="instruct-vd"
              value={instruct}
              onChange={(e) => setInstruct(e.target.value)}
              placeholder="음색, 감정 등을 자연어로 입력 (예: Very happy, female voice)"
              required
              rows={2}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                resize: 'vertical',
              }}
            />
          </div>
        )}

        {mode === 'voice-clone' && (
          <>
            <div>
              <label
                style={{ display: 'block', marginBottom: 6, fontSize: 14, color: 'var(--muted)' }}
              >
                참조 음성 (URL 또는 파일 업로드) *
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  value={refAudio}
                  onChange={(e) => setRefAudio(e.target.value)}
                  placeholder="http://... 또는 업로드 후 자동 입력"
                  style={{
                    flex: 1,
                    minWidth: 200,
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                  }}
                />
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setRefAudioFile(e.target.files?.[0] ?? null)}
                  style={{ color: 'var(--text)' }}
                />
                <button
                  type="button"
                  onClick={handleUploadRef}
                  disabled={!refAudioFile || uploadingRef}
                  style={{
                    padding: '10px 16px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                  }}
                >
                  {uploadingRef ? '업로드 중…' : '업로드'}
                </button>
              </div>
              {uploadRefSuccess && refAudio && (
                <p style={{ marginTop: 8, fontSize: 13, color: 'var(--success)' }}>
                  참조 음성이 설정되었습니다. 텍스트를 입력한 뒤 합성을 눌러 주세요.
                </p>
              )}
              {refAudio && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                    참조 음성 미리듣기
                  </div>
                  <audio controls src={refAudio} style={{ width: '100%', height: 36 }} />
                </div>
              )}
            </div>
            <div>
              <label
                htmlFor="refText"
                style={{ display: 'block', marginBottom: 6, fontSize: 14, color: 'var(--muted)' }}
              >
                참조 텍스트 (선택)
              </label>
              <input
                id="refText"
                type="text"
                value={refText}
                onChange={(e) => setRefText(e.target.value)}
                placeholder="참조 음성의 원문"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                }}
              />
            </div>
          </>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={saveToList}
            onChange={(e) => setSaveToList(e.target.checked)}
          />
          <span style={{ fontSize: 14 }}>목록에 저장</span>
        </label>

        {error && (
          <div
            style={{
              padding: 12,
              background: 'rgba(239,68,68,0.15)',
              borderRadius: 8,
              color: 'var(--error)',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || block}
          style={{
            padding: '12px 24px',
            background: block || loading ? 'var(--border)' : 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            alignSelf: 'flex-start',
          }}
        >
          {loading ? '합성 중…' : '합성'}
        </button>
      </form>

      {blobUrl && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>
              재생 {audioDurationSec != null && !Number.isNaN(audioDurationSec) && `(${audioDurationSec.toFixed(1)}초)`}
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--muted)' }}>
              속도
              <select
                value={playbackRate}
                onChange={(e) => setPlaybackRate(Number(e.target.value))}
                style={{
                  padding: '4px 8px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                }}
              >
                <option value={0.75}>0.75×</option>
                <option value={0.8}>0.8×</option>
                <option value={0.9}>0.9×</option>
                <option value={1}>1× (원래)</option>
                <option value={1.1}>1.1×</option>
                <option value={1.25}>1.25×</option>
              </select>
            </label>
          </div>
          <audio
            ref={audioRef}
            key={blobUrl}
            controls
            src={blobUrl}
            style={{ width: '100%', marginBottom: 8 }}
            onLoadedMetadata={(e) => {
              const el = e.currentTarget;
              setAudioDurationSec(el.duration);
              el.playbackRate = playbackRate;
            }}
            onLoadStart={() => setAudioDurationSec(null)}
            onError={(e) => console.error('[TTS 재생] 오디오 로드 실패:', e.currentTarget.error)}
          />
          {savedId !== undefined && (
            <Link
              href={`/board/list`}
              style={{
                display: 'inline-block',
                marginTop: 8,
                padding: '8px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--accent)',
              }}
            >
              목록에서 보기
            </Link>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: '1.1rem' }}>최근 합성 기록</h2>
          <Link
            href="/board/list"
            style={{
              fontSize: 14,
              padding: '6px 12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--accent)',
            }}
          >
            전체 목록
          </Link>
        </div>
        {listData && listData.items.length > 0 ? (
          <>
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                overflow: 'hidden',
                background: 'var(--surface)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '10px', fontWeight: 600 }}>ID</th>
                    <th style={{ padding: '10px', fontWeight: 600 }}>텍스트</th>
                    <th style={{ padding: '10px', fontWeight: 600 }}>모드</th>
                    <th style={{ padding: '10px', fontWeight: 600 }}>동작</th>
                  </tr>
                </thead>
                <tbody>
                  {listData.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px', color: 'var(--muted)' }}>{item.id}</td>
                      <td style={{ padding: '10px', maxWidth: 200 }} title={item.text}>
                        {item.text.length > 30 ? item.text.slice(0, 30) + '…' : item.text}
                      </td>
                      <td style={{ padding: '10px' }}>{item.mode}</td>
                      <td style={{ padding: '10px' }}>
                        <a
                          href={getSynthesisDownloadUrl(item.id)}
                          download={`synthesis-${item.id}.wav`}
                          style={{
                            padding: '6px 10px',
                            background: 'var(--accent)',
                            color: 'white',
                            borderRadius: 6,
                            textDecoration: 'none',
                            fontSize: 13,
                          }}
                        >
                          다운로드
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                disabled={listPage <= 0}
                onClick={() => setListPage((p) => Math.max(0, p - 1))}
                style={{
                  padding: '6px 12px',
                  background: listPage <= 0 ? 'var(--border)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 14,
                }}
              >
                이전
              </button>
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>
                {listPage + 1} / {Math.max(1, listData.totalPages)}
              </span>
              <button
                type="button"
                disabled={listPage >= listData.totalPages - 1}
                onClick={() => setListPage((p) => p + 1)}
                style={{
                  padding: '6px 12px',
                  background: listPage >= listData.totalPages - 1 ? 'var(--border)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 14,
                }}
              >
                다음
              </button>
              <span style={{ color: 'var(--muted)', fontSize: 13, marginLeft: 8 }}>
                전체 {listData.total}건
              </span>
            </div>
          </>
        ) : listData ? (
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            저장된 합성 기록이 없습니다. 합성 시 &quot;목록에 저장&quot;을 켜면 여기에 표시됩니다.
          </p>
        ) : null}
      </div>
    </main>
  );
}
