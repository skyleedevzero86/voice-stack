import type {
  TtsResponse,
  SpeakersResponse,
  CustomVoicePayload,
  VoiceDesignPayload,
  VoiceClonePayload,
  SynthesisRecord,
  SynthesisListResponse,
} from '@/domain/tts/types';

const API_BASE = process.env.NEXT_PUBLIC_VOICE_API_URL || '';

function base(): string {
  return API_BASE || '';
}

export async function fetchCustomVoice(
  payload: CustomVoicePayload,
  options?: { save?: boolean }
): Promise<TtsResponse> {
  const url = `${base()}/api/tts/custom-voice${options?.save ? '?save=true' : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: payload.text,
      language: payload.language,
      speaker: payload.speaker,
      instruct: payload.instruct ?? undefined,
    }),
  });
  return res.json();
}

export async function fetchVoiceDesign(
  payload: VoiceDesignPayload,
  options?: { save?: boolean }
): Promise<TtsResponse> {
  const url = `${base()}/api/tts/voice-design${options?.save ? '?save=true' : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchVoiceClone(
  payload: VoiceClonePayload,
  options?: { save?: boolean }
): Promise<TtsResponse> {
  const url = `${base()}/api/tts/voice-clone${options?.save ? '?save=true' : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: payload.text,
      language: payload.language,
      refAudio: payload.refAudio,
      refText: payload.refText ?? undefined,
    }),
  });
  return res.json();
}

export async function fetchSpeakers(): Promise<SpeakersResponse> {
  const res = await fetch(`${base()}/api/tts/speakers`);
  return res.json();
}

export interface LanguagesResponse {
  languages: string[];
}

export async function fetchLanguages(): Promise<LanguagesResponse> {
  const res = await fetch(`${base()}/api/tts/languages`);
  return res.json();
}

export interface UploadRefAudioResponse {
  url: string;
  key: string;
}

export async function uploadRefAudio(file: File): Promise<UploadRefAudioResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${base()}/api/tts/upload-ref-audio`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || '업로드 실패');
  }
  return res.json();
}

export async function fetchSynthesisList(params: {
  page?: number;
  size?: number;
  search?: string;
}): Promise<SynthesisListResponse> {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set('page', String(params.page));
  if (params.size != null) sp.set('size', String(params.size));
  if (params.search != null && params.search.trim()) sp.set('search', params.search.trim());
  const res = await fetch(`${base()}/api/tts/synthesis?${sp.toString()}`);
  if (!res.ok) throw new Error('목록 조회 실패');
  return res.json();
}

export async function fetchSynthesisById(id: number): Promise<SynthesisRecord | null> {
  const res = await fetch(`${base()}/api/tts/synthesis/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('상세 조회 실패');
  return res.json();
}

export function getSynthesisDownloadUrl(id: number): string {
  return `${base()}/api/tts/synthesis/${id}/download`;
}
