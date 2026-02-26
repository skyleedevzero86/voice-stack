'use client';

import { useState, useCallback } from 'react';
import type { TtsMode, TtsResponse, Speaker } from '@/domain/tts/types';
import { base64ToWavUrl } from '@/domain/tts/audio';
import {
  fetchCustomVoice,
  fetchVoiceDesign,
  fetchVoiceClone,
  fetchSpeakers,
} from '@/application/api/ttsApi';

async function safeParseTtsResponse(
  res: Response,
  save: boolean | undefined,
): Promise<{ data: TtsResponse; savedId?: number }> {
  const rawId = res.headers.get('X-Synthesis-Id');
  const savedId = rawId ? parseInt(rawId, 10) : undefined;
  if (save && rawId) console.log('[저장 로직] 서버에서 저장된 합성 ID 수신: X-Synthesis-Id=', rawId);
  if (save && !rawId) console.warn('[저장 로직] 서버에서 저장 ID 없음 (X-Synthesis-Id 헤더 없음).');

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `서버 오류 (${res.status})`);
  }

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text().catch(() => '');
    throw new Error(text || '서버가 JSON이 아닌 응답을 반환했습니다.');
  }

  const data: TtsResponse = await res.json();
  return { data, savedId };
}

export function useSynthesizeTts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const synthesize = useCallback(
    async (
      mode: TtsMode,
      params: {
        text: string;
        language: string;
        speaker: string;
        instruct: string;
        refAudio: string;
        refText: string;
        save?: boolean;
      }
    ): Promise<{ blobUrl: string | null; savedId?: number }> => {
      setError(null);
      setLoading(true);
      try {
        const saveQ = params.save ? '?save=true' : '';
        const base = process.env.NEXT_PUBLIC_VOICE_API_URL || '';
        let res: Response;
        if (mode === 'custom-voice') {
          res = await fetch(`${base}/api/tts/custom-voice${saveQ}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: params.text,
              language: params.language,
              speaker: params.speaker,
              instruct: params.instruct || undefined,
            }),
          });
        } else if (mode === 'voice-design') {
          res = await fetch(`${base}/api/tts/voice-design${saveQ}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: params.text,
              language: params.language,
              instruct: params.instruct,
            }),
          });
        } else {
          res = await fetch(`${base}/api/tts/voice-clone${saveQ}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: params.text,
              language: params.language,
              refAudio: params.refAudio,
              refText: params.refText ?? undefined,
            }),
          });
        }
        const { data, savedId } = await safeParseTtsResponse(res, params.save);
        if (!data.success) {
          setError(data.message ?? '합성 실패');
          return { blobUrl: null };
        }
        if (data.audioBase64 && data.sampleRate) {
          const len = data.audioBase64.length;
          const durationSec = (len * 3) / 4 / 2 / data.sampleRate;
          console.log('[TTS] 오디오 수신:', { audioBase64Len: len, sampleRate: data.sampleRate, 예상재생시간초: durationSec.toFixed(2) });
          const blobUrl = base64ToWavUrl(data.audioBase64, data.sampleRate);
          return { blobUrl, savedId };
        }
        setError('오디오 데이터를 받지 못했습니다. TTS 서비스와 백엔드 연결을 확인하세요.');
        return { blobUrl: null, savedId };
      } catch (err) {
        const msg =
          err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))
            ? '백엔드에 연결할 수 없습니다. backend를 실행했는지, .env.local에 NEXT_PUBLIC_VOICE_API_URL=http://localhost:8081 이 설정돼 있는지 확인하세요.'
            : err instanceof Error
              ? err.message
              : '요청 실패';
        setError(msg);
        return { blobUrl: null };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return { synthesize, loading, error, clearError };
}

export function useSpeakers() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await fetchSpeakers();
      if (data.speakers) setSpeakers(data.speakers);
    } catch {
      setSpeakers([]);
    }
  }, []);

  return { speakers, load };
}
