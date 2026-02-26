import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Qwen3-TTS Voice',
  description: 'Text-to-Speech with Qwen3-TTS (CustomVoice, VoiceDesign, VoiceClone)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
