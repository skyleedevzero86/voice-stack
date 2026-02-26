export type TtsMode = 'custom-voice' | 'voice-design' | 'voice-clone';

export interface TtsResponse {
  success: boolean;
  audioBase64?: string;
  sampleRate?: number;
  errorCode?: string;
  message?: string;
}

export interface Speaker {
  id: string;
  name: string;
  description: string;
  nativeLanguage: string;
}

export interface SpeakersResponse {
  speakers: Speaker[];
}

export interface CustomVoicePayload {
  text: string;
  language: string;
  speaker: string;
  instruct?: string;
}

export interface VoiceDesignPayload {
  text: string;
  language: string;
  instruct: string;
}

export interface VoiceClonePayload {
  text: string;
  language: string;
  refAudio: string;
  refText?: string;
}

export interface SynthesisRecord {
  id: number;
  text: string;
  mode: string;
  language: string;
  speakerOrInstruct: string | null;
  storageKey: string;
  createdAt: string;
}

export interface SynthesisListResponse {
  items: SynthesisRecord[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
