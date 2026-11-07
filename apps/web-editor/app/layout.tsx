import './globals.css';
import React from 'react';

export const metadata = {
  title: 'V-Studio Pro | Editor WebGL Híbrido & Auto-Publisher Viral',
  description: 'Editor de video WebGL a 60 FPS con subtítulos animados por IA (Whisper) y exportación directa a TikTok, Instagram Reels y YouTube Shorts',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}

