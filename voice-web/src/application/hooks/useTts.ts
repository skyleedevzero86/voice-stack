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
        const saveOpt = params.save ? { save: true as const } : undefined;
        let data: TtsResponse;
        let savedId: number | undefined;
        if (mode === 'custom-voice') {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_VOICE_API_URL || ''}/api/tts/custom-voice${saveOpt ? '?save=true' : ''}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: params.text,
                language: params.language,
                speaker: params.speaker,
                instruct: params.instruct || undefined,
              }),
            }
          );
          savedId = res.headers.get('X-Synthesis-Id') ? parseInt(res.headers.get('X-Synthesis-Id')!, 10) : undefined;
          data = await res.json();
        } else if (mode === 'voice-design') {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_VOICE_API_URL || ''}/api/tts/voice-design${saveOpt ? '?save=true' : ''}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: params.text,
                language: params.language,
                instruct: params.instruct,
              }),
            }
          );
          savedId = res.headers.get('X-Synthesis-Id') ? parseInt(res.headers.get('X-Synthesis-Id')!, 10) : undefined;
          data = await res.json();
        } else {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_VOICE_API_URL || ''}/api/tts/voice-clone${saveOpt ? '?save=true' : ''}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: params.text,
                language: params.language,
                refAudio: params.refAudio,
                refText: params.refText ?? undefined,
              }),
            }
          );
          savedId = res.headers.get('X-Synthesis-Id') ? parseInt(res.headers.get('X-Synthesis-Id')!, 10) : undefined;
          data = await res.json();
        }
        if (!data.success) {
          setError(data.message ?? '합성 실패');
          return { blobUrl: null };
        }
        if (data.audioBase64 && data.sampleRate) {
          const blobUrl = base64ToWavUrl(data.audioBase64, data.sampleRate);
          return { blobUrl, savedId };
        }
        return { blobUrl: null, savedId };
      } catch (err) {
        setError(err instanceof Error ? err.message : '요청 실패');
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
