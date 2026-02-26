export function base64ToWavUrl(base64: string, sampleRate: number): string {
  const trimmed = base64.replace(/\s/g, '');
  if (!trimmed.length) throw new Error('empty audio');
  const binary = atob(trimmed);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (bytes.length === 0) throw new Error('empty audio');
  const wav = buildWav(bytes, sampleRate, 1);
  const blob = new Blob([wav], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export function buildWav(pcm: Uint8Array, sampleRate: number, channels: number): ArrayBuffer {
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const dataSize = pcm.length;
  const riffSize = 36 + dataSize;
  const buf = new ArrayBuffer(44 + pcm.length);
  const view = new DataView(buf);
  let offset = 0;
  const write = (bytes: string) => {
    for (let i = 0; i < bytes.length; i++) view.setUint8(offset++, bytes.charCodeAt(i));
  };
  write('RIFF');
  view.setUint32(offset, riffSize, true); offset += 4;
  write('WAVE');
  write('fmt ');
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, channels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  write('data');
  view.setUint32(offset, dataSize, true); offset += 4;
  new Uint8Array(buf).set(pcm, 44);
  return buf;
}
