'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  useEditorStore,
  AspectRatioPreset,
  CaptionPosition,
  CaptionPresetStyle,
  SubtitlePhrase,
} from '../../../store/useEditorStore';
import { SocialPlatform, PlatformPublishResult } from '../../../modules/social/SocialPublisherService';

export default function EditorWorkspace() {
  const routeParams = useParams();
  const projectId = (routeParams?.projectId as string) || 'proj_viral_001';

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

  // Estados de Modales y Grabación
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isCaptionsModalOpen, setIsCaptionsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  // Estados de Publicación Social
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(['tiktok', 'instagram', 'youtube']);
  const [postCaption, setPostCaption] = useState('Nuevo video viral creado y editado a 60 FPS con V-Studio Pro 🚀');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<PlatformPublishResult[] | null>(null);

  // Estados de Transcripción IA
  const [captionLanguage, setCaptionLanguage] = useState('es');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeMessage, setTranscribeMessage] = useState<string | null>(null);

  const {
    projectTitle,
    setProjectTitle,
    aspectRatio,
    isPlaying,
    currentTime,
    totalDuration,
    zoomLevel,
    tracks,
    clips,
    phrases,
    selectedClipId,
    selectedPhraseId,
    captionStyle,
    videoUrl,
    videoFileName,
    activeSidebarTab,
    setAspectRatio,
    togglePlay,
    setIsPlaying,
    seekTo,
    setZoomLevel,
    setSelectedClip,
    setSelectedPhrase,
    setActiveSidebarTab,
    setCaptionStyle,
    setVideoMedia,
    removeVideoMedia,
    updatePhraseText,
    updatePhraseTiming,
    updatePhrasePosition,
    updatePhraseColor,
    addPhrase,
    deletePhrase,
    setAllPhrases,
    splitClipAtPlayhead,
    deleteSelectedClip,
  } = useEditorStore();

  // Sincronizar reproducción del elemento <video> real
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (isPlaying) {
      video.play().catch((err) => {
        console.warn('Autoplay bloqueado por el navegador:', err);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, videoUrl]);

  // Sincronizar tiempo de video con el playhead
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (Math.abs(video.currentTime - currentTime) > 0.25) {
      video.currentTime = currentTime;
    }
  }, [currentTime, videoUrl]);

  // Bucle de tiempo continuo a 60 FPS durante la reproducción
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const next = useEditorStore.getState().currentTime + dt;
      if (next >= totalDuration) {
        useEditorStore.getState().seekTo(0);
        useEditorStore.getState().setIsPlaying(false);
      } else {
        useEditorStore.getState().seekTo(next);
        rafId = requestAnimationFrame(loop);
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDuration]);

  // Carga de archivo de video real
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;

    tempVideo.onloadedmetadata = () => {
      const duration = tempVideo.duration || 15;
      setVideoMedia(url, file.name, duration);
      seekTo(0);
    };

    tempVideo.onerror = () => {
      alert('No se pudo leer el archivo de video. Intenta con formato MP4 o WebM.');
    };
  };

  // Frase activa en el tiempo actual
  const activePhrase = phrases.find(
    (p) => currentTime >= p.startTime && currentTime <= p.endTime
  );

  // Transcripción automática con Faster-Whisper
  const handleGenerateCaptions = async (audioFile?: File) => {
    setIsTranscribing(true);
    setTranscribeMessage('Generando subtítulos con IA...');

    try {
      const formData = new FormData();
      if (audioFile) {
        formData.append('file', audioFile);
      } else {
        const dummyBlob = new Blob([new Uint8Array(44)], { type: 'audio/wav' });
        formData.append('file', dummyBlob, 'audio.wav');
      }
      formData.append('language', captionLanguage);

      const res = await fetch('/api/captions/generate', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.phrases) {
        const mappedPhrases: SubtitlePhrase[] = data.phrases.map((p: any, idx: number) => ({
          id: p.id || `phrase_ai_${idx}`,
          startTime: p.startTime,
          endTime: p.endTime,
          text: p.words?.map((w: any) => w.text).join(' ') || `Frase ${idx + 1}`,
          position: 'bottom' as CaptionPosition,
          color: '#FFE600',
          words: p.words || [],
        }));

        setAllPhrases(mappedPhrases);
        setTranscribeMessage(`✅ ${mappedPhrases.length} subtítulos generados con éxito.`);
      } else {
        setTranscribeMessage(`Aviso: ${data.error || 'Usando subtítulos de muestra'}`);
      }
    } catch (err: any) {
      setTranscribeMessage(`Error conectando con el servicio de IA: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Publicación en redes sociales
  const handlePublishToSocials = async () => {
    if (selectedPlatforms.length === 0) return;
    setIsPublishing(true);
    try {
      const res = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: projectTitle,
          caption: postCaption,
          hashtags: ['viral', 'reels', 'tiktok', 'shorts', 'vstudio'],
          platforms: selectedPlatforms,
          videoCdnUrl: `https://cdn.vstudio.app/renders/${projectId}.mp4`,
        }),
      });
      const data = await res.json();
      if (data.results) setPublishResults(data.results);
    } finally {
      setIsPublishing(false);
    }
  };

  // Grabación y exportación de video real directo desde el navegador
  const handleExportVideo = async () => {
    setIsRecording(true);
    setRecordProgress(0);

    const canvas = hiddenCanvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;

    const width = aspectRatio === '9:16' ? 1080 : aspectRatio === '1:1' ? 1080 : 1920;
    const height = aspectRatio === '9:16' ? 1920 : aspectRatio === '1:1' ? 1080 : 1080;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    seekTo(0);
    if (video) video.currentTime = 0;

    const stream = canvas.captureStream(60);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recordedChunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 10000000 });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `${projectTitle.replace(/\s+/g, '_')}_render.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);
      setIsRecording(false);
      setIsExportModalOpen(false);
    };

    recorder.start(100);

    // Dibujar cada fotograma combinando el video y los subtítulos
    let animId: number;
    let recStartTime = performance.now();
    const durationMs = totalDuration * 1000;

    if (video) video.play().catch(() => {});

    const renderFrame = () => {
      const elapsed = performance.now() - recStartTime;
      const progress = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setRecordProgress(progress);

      const curSec = elapsed / 1000;

      // 1. Dibujar fondo o fotograma de video
      if (video && video.readyState >= 2) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        const vw = video.videoWidth || width;
        const vh = video.videoHeight || height;
        const scale = Math.max(width / vw, height / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        const dx = (width - dw) / 2;
        const dy = (height - dh) / 2;
        ctx.drawImage(video, dx, dy, dw, dh);
      } else {
        // Fondo elegante si no hay video cargado
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Dibujar subtítulos activos
      const phraseNow = phrases.find((p) => curSec >= p.startTime && curSec <= p.endTime);
      if (phraseNow) {
        const posY =
          phraseNow.position === 'top'
            ? height * 0.18
            : phraseNow.position === 'middle'
            ? height * 0.5
            : height * 0.75;

        ctx.font = '900 64px Montserrat, Arial Black, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Píldora de fondo morada estilo Hormozi
        const textMetrics = ctx.measureText(phraseNow.text.toUpperCase());
        const boxW = textMetrics.width + 60;
        const boxH = 90;

        ctx.fillStyle = 'rgba(124, 58, 237, 0.95)';
        ctx.beginPath();
        ctx.roundRect(width / 2 - boxW / 2, posY - boxH / 2, boxW, boxH, 20);
        ctx.fill();

        // Borde negro del texto
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(phraseNow.text.toUpperCase(), width / 2, posY);

        // Relleno de color dinámico
        ctx.fillStyle = phraseNow.color || '#FFE600';
        ctx.fillText(phraseNow.text.toUpperCase(), width / 2, posY);
      }

      if (elapsed < durationMs) {
        animId = requestAnimationFrame(renderFrame);
      } else {
        if (video) video.pause();
        recorder.stop();
      }
    };

    animId = requestAnimationFrame(renderFrame);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 select-none overflow-hidden font-sans">
      {/* Canvas invisible para exportación de video */}
      <canvas ref={hiddenCanvasRef} className="hidden" />

      {/* Inputs de carga ocultos */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
      />
      <input
        type="file"
        ref={audioFileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleGenerateCaptions(file);
        }}
        accept="audio/*,video/*"
        className="hidden"
      />

      {/* 1. Header Superior */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-violet-500 animate-pulse" />
            <span className="font-black text-sm tracking-wide bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
              V-STUDIO PRO
            </span>
          </div>
          <span className="text-zinc-700">|</span>
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="text-xs bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-violet-500 text-zinc-200 outline-none px-1 py-0.5"
            placeholder="Título del Proyecto"
          />
        </div>

        {/* Selector de relación de aspecto */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          {(['9:16', '1:1', '16:9'] as AspectRatioPreset[]).map((ratio) => (
            <button
              key={ratio}
              onClick={() => setAspectRatio(ratio)}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                aspectRatio === ratio
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {ratio === '9:16' ? '📱 9:16 (TikTok/Reels)' : ratio === '1:1' ? '⏹ 1:1' : '🖥 16:9'}
            </button>
          ))}
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSafeZones(!showSafeZones)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition ${
              showSafeZones
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-500'
            }`}
          >
            {showSafeZones ? '👁 Safe Zones: ON' : '👁 Safe Zones: OFF'}
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-emerald-500/50 bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/20"
          >
            📥 Descargar Video
          </button>

          <button
            onClick={() => {
              setPublishResults(null);
              setIsPublishModalOpen(true);
            }}
            className="px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:opacity-90 text-white rounded-lg shadow-lg shadow-violet-500/20 transition"
          >
            🚀 Publicar en Redes
          </button>
        </div>
      </header>

      {/* 2. Cuerpo Principal (Sidebar Editor + Visor de Video) */}
      <div className="flex flex-1 min-h-0 bg-zinc-950 overflow-hidden">
        {/* Panel Izquierdo: Editor de Texto, Subtítulos y Medios */}
        <aside className="w-80 border-r border-zinc-800 bg-zinc-900/60 flex flex-col shrink-0">
          {/* Selector de Pestañas del Panel */}
          <div className="flex border-b border-zinc-800 bg-zinc-900 text-xs">
            <button
              onClick={() => setActiveSidebarTab('subtitles')}
              className={`flex-1 py-2.5 font-bold transition border-b-2 ${
                activeSidebarTab === 'subtitles'
                  ? 'border-violet-500 text-violet-400 bg-zinc-950/40'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              📝 Texto / Subtítulos
            </button>
            <button
              onClick={() => setActiveSidebarTab('media')}
              className={`flex-1 py-2.5 font-bold transition border-b-2 ${
                activeSidebarTab === 'media'
                  ? 'border-violet-500 text-violet-400 bg-zinc-950/40'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              📁 Video ({videoUrl ? '1' : '0'})
            </button>
            <button
              onClick={() => setActiveSidebarTab('styles')}
              className={`flex-1 py-2.5 font-bold transition border-b-2 ${
                activeSidebarTab === 'styles'
                  ? 'border-violet-500 text-violet-400 bg-zinc-950/40'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              🎨 Estilos
            </button>
          </div>

          {/* Contenido de la pestaña: SUBTÍTULOS Y TEXTO */}
          {activeSidebarTab === 'subtitles' && (
            <div className="flex-1 flex flex-col min-h-0 p-3 space-y-3 overflow-y-auto">
              <div className="flex gap-2">
                <button
                  onClick={() => addPhrase('NUEVO TEXTO', currentTime, 3.0)}
                  className="flex-1 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition shadow flex items-center justify-center gap-1.5"
                >
                  <span>+</span> Añadir Texto / Subtítulo
                </button>
                <button
                  onClick={() => setIsCaptionsModalOpen(true)}
                  className="px-3 py-2 text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 rounded-lg transition"
                  title="Auto-subtítulos con IA"
                >
                  ✨ IA
                </button>
              </div>

              {/* Lista interactiva de frases para escribir directamente */}
              <div className="space-y-2.5">
                {phrases.map((phrase, idx) => {
                  const isCurrent = currentTime >= phrase.startTime && currentTime <= phrase.endTime;
                  const isSelected = selectedPhraseId === phrase.id;

                  return (
                    <div
                      key={phrase.id}
                      onClick={() => setSelectedPhrase(phrase.id)}
                      className={`p-3 rounded-xl border transition space-y-2.5 ${
                        isCurrent
                          ? 'border-violet-500 bg-violet-950/20 shadow-md ring-1 ring-violet-500/50'
                          : isSelected
                          ? 'border-zinc-700 bg-zinc-900'
                          : 'border-zinc-800/80 bg-zinc-950/50 hover:border-zinc-700'
                      }`}
                    >
                      {/* Cabecera de la frase: Tiempos y Eliminar */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1 font-mono">
                          <span className="text-violet-400 font-bold">#{idx + 1}</span>
                          <input
                            type="number"
                            step="0.1"
                            value={phrase.startTime}
                            onChange={(e) => updatePhraseTiming(phrase.id, Number(e.target.value), phrase.endTime)}
                            className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-center text-zinc-200"
                          />
                          <span>-</span>
                          <input
                            type="number"
                            step="0.1"
                            value={phrase.endTime}
                            onChange={(e) => updatePhraseTiming(phrase.id, phrase.startTime, Number(e.target.value))}
                            className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-center text-zinc-200"
                          />
                          <span>s</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePhrase(phrase.id);
                          }}
                          className="text-zinc-500 hover:text-rose-400 p-1"
                          title="Eliminar este subtítulo"
                        >
                          🗑
                        </button>
                      </div>

                      {/* Campo para ESCRIBIR EL TEXTO DIRECTAMENTE */}
                      <div>
                        <input
                          type="text"
                          value={phrase.text}
                          onChange={(e) => updatePhraseText(phrase.id, e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-violet-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold tracking-wide outline-none"
                          placeholder="Escribe el texto aquí..."
                        />
                      </div>

                      {/* Configuración rápida: Posición y Color */}
                      <div className="flex items-center justify-between pt-1">
                        {/* Selector de posición */}
                        <div className="flex gap-1 bg-zinc-900 p-0.5 rounded border border-zinc-800 text-[10px]">
                          {(['top', 'middle', 'bottom'] as CaptionPosition[]).map((pos) => (
                            <button
                              key={pos}
                              onClick={() => updatePhrasePosition(phrase.id, pos)}
                              className={`px-1.5 py-0.5 rounded capitalize ${
                                phrase.position === pos
                                  ? 'bg-violet-600 text-white font-bold'
                                  : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              {pos === 'top' ? 'Arr' : pos === 'middle' ? 'Cen' : 'Abj'}
                            </button>
                          ))}
                        </div>

                        {/* Paleta de colores */}
                        <div className="flex gap-1.5">
                          {['#FFE600', '#22C55E', '#EC4899', '#38BDF8', '#FFFFFF'].map((color) => (
                            <button
                              key={color}
                              onClick={() => updatePhraseColor(phrase.id, color)}
                              style={{ backgroundColor: color }}
                              className={`w-4 h-4 rounded-full border transition ${
                                phrase.color === color ? 'ring-2 ring-violet-400 border-white' : 'border-zinc-800'
                              }`}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contenido de la pestaña: GESTIÓN DE MEDIOS */}
          {activeSidebarTab === 'media' && (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
                <div className="font-bold text-zinc-200">Video Principal:</div>
                {videoUrl ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 space-y-1">
                      <div className="font-semibold text-emerald-400 truncate">🎬 {videoFileName}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">Duración: {totalDuration}s</div>
                    </div>
                    <button
                      onClick={removeVideoMedia}
                      className="w-full py-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/60 rounded-lg font-semibold transition"
                    >
                      🗑 Quitar Video del Proyecto
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-center py-4">
                    <p className="text-zinc-500 text-[11px]">No hay video cargado.</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold transition shadow"
                    >
                      📁 Cargar Video Ahora
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contenido de la pestaña: ESTILOS GLOBALES */}
          {activeSidebarTab === 'styles' && (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs">
              <div className="space-y-2">
                <label className="font-bold text-zinc-300">Preset de Subtítulo:</label>
                {(['hormozi', 'neon', 'minimal'] as CaptionPresetStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => setCaptionStyle(style)}
                    className={`w-full p-3 rounded-xl border text-left transition ${
                      captionStyle === style
                        ? 'bg-violet-600/20 border-violet-500 text-white font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="capitalize">{style === 'hormozi' ? '🔥 Hormozi Pop (Viral)' : style === 'neon' ? '⚡ Neon Glow' : '◽ Minimal Clean'}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Visor Central: Video Real + Subtítulos Superpuestos */}
        <main className="flex-1 bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
          <div
            className="relative shadow-2xl rounded-2xl border border-zinc-800 bg-black overflow-hidden flex items-center justify-center select-none"
            style={{
              height: '100%',
              maxHeight: '520px',
              aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '1:1' ? '1/1' : '16/9',
            }}
          >
            {/* Elemento de Video HTML5 REAL */}
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                className="w-full h-full object-contain"
                onEnded={() => setIsPlaying(false)}
              />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-900/50 transition border border-dashed border-zinc-800 text-center p-6 space-y-3"
              >
                <div className="w-14 h-14 rounded-full bg-violet-600/10 border border-violet-500/30 flex items-center justify-center text-2xl">
                  📁
                </div>
                <div>
                  <div className="font-bold text-sm text-zinc-200">Haz clic para subir un video</div>
                  <div className="text-[11px] text-zinc-500 mt-1">Soporta MP4, WebM o MOV</div>
                </div>
              </div>
            )}

            {/* Capa de Subtítulos Superpuestos Sincronizados */}
            {activePhrase && (
              <div
                className={`absolute inset-x-4 pointer-events-none flex justify-center z-10 ${
                  activePhrase.position === 'top'
                    ? 'top-[18%]'
                    : activePhrase.position === 'middle'
                    ? 'top-[50%] -translate-y-1/2'
                    : 'bottom-[18%]'
                }`}
              >
                <div
                  className="px-6 py-2.5 rounded-2xl shadow-2xl backdrop-blur-sm transform transition-all duration-100 flex items-center justify-center"
                  style={{
                    backgroundColor: captionStyle === 'hormozi' ? 'rgba(124, 58, 237, 0.95)' : 'rgba(0,0,0,0.7)',
                    transform: 'scale(1.05)',
                  }}
                >
                  <span
                    className="font-black text-2xl tracking-wider text-center"
                    style={{
                      color: activePhrase.color || '#FFE600',
                      textShadow: '0 2px 8px rgba(0,0,0,0.8), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
                    }}
                  >
                    {activePhrase.text.toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            {/* Zonas Seguras de TikTok / Reels */}
            {showSafeZones && aspectRatio === '9:16' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10">
                <div className="h-[14%] bg-rose-500/10 border-b border-dashed border-rose-500/40 flex items-center justify-center text-[10px] font-bold text-rose-300 tracking-wider">
                  ZONA SUPERIOR (TIKTOK / REELS)
                </div>
                <div className="absolute right-0 top-[20%] bottom-[25%] w-[16%] bg-amber-500/10 border-l border-dashed border-amber-500/40 flex items-center justify-center text-[9px] text-amber-300 [writing-mode:vertical-rl] font-bold">
                  BOTONES SOCIALES
                </div>
                <div className="h-[20%] bg-rose-500/10 border-t border-dashed border-rose-500/40 flex items-center justify-center text-[10px] font-bold text-rose-300 tracking-wider">
                  ZONA INFERIOR (COPY Y AUDIO)
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 3. Barra de Transporte */}
      <div className="h-12 bg-zinc-900 border-y border-zinc-800 px-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => seekTo(0)}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
            title="Ir al inicio"
          >
            ⏮
          </button>
          <button
            onClick={togglePlay}
            className="h-8 w-8 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-bold flex items-center justify-center shadow transition"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <span className="font-mono text-xs text-violet-400">
            {currentTime.toFixed(2)}s / {totalDuration.toFixed(2)}s
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={splitClipAtPlayhead}
            className="px-3 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
          >
            ✂ Dividir Clip
          </button>
          <button
            onClick={deleteSelectedClip}
            className="px-3 py-1 text-xs rounded bg-zinc-800 hover:bg-rose-900/50 hover:text-rose-300 text-zinc-300 border border-zinc-700 transition"
          >
            🗑 Eliminar Clip Seleccionado
          </button>
          <div className="h-4 w-px bg-zinc-800 mx-2" />
          <span className="text-[11px] text-zinc-500">Zoom:</span>
          <input
            type="range"
            min={20}
            max={120}
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="w-20 accent-violet-600"
          />
        </div>
      </div>

      {/* 4. Línea de Tiempo Multipista */}
      <section className="h-44 bg-zinc-950 flex overflow-hidden shrink-0">
        <div className="w-48 bg-zinc-900 border-r border-zinc-800 shrink-0 select-none">
          {tracks.map((t) => (
            <div
              key={t.id}
              className="h-11 border-b border-zinc-800 px-3 flex items-center justify-between text-xs font-medium text-zinc-300"
            >
              <span className="truncate">{t.name}</span>
              <span className="text-[10px] text-zinc-600 uppercase font-mono">{t.type}</span>
            </div>
          ))}
        </div>

        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekTo((e.clientX - rect.left) / zoomLevel);
          }}
          className="flex-1 relative overflow-x-auto cursor-pointer bg-zinc-950"
        >
          <div className="relative" style={{ width: `${Math.max(totalDuration * zoomLevel + 200, 1000)}px` }}>
            {tracks.map((t) => (
              <div key={t.id} className="h-11 border-b border-zinc-900 relative">
                {clips
                  .filter((c) => c.trackId === t.id)
                  .map((c) => {
                    const isSelected = selectedClipId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClip(c.id);
                        }}
                        style={{
                          left: `${c.timelineStart * zoomLevel}px`,
                          width: `${c.duration * zoomLevel}px`,
                        }}
                        className={`absolute top-1 bottom-1 rounded-md border px-2.5 flex items-center text-[11px] font-semibold text-white transition-all shadow-sm ${
                          c.color
                        } ${isSelected ? 'ring-2 ring-white border-white' : ''}`}
                      >
                        <span className="truncate">{c.name}</span>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>

          <div
            style={{ left: `${currentTime * zoomLevel}px` }}
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none"
          >
            <div className="w-2.5 h-2.5 bg-rose-500 -ml-1 rounded-full shadow" />
          </div>
        </div>
      </section>

      {/* Modal: Descargar Video Grabado */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white">📥 Descargar Video Renderizado</h2>
            <p className="text-xs text-zinc-400">
              El motor grabará los fotogramas del video junto con los subtítulos y estilos que editaste a 60 FPS.
            </p>

            {isRecording ? (
              <div className="space-y-2 py-4">
                <div className="flex justify-between text-xs text-zinc-300">
                  <span>Procesando video...</span>
                  <span className="font-mono text-emerald-400">{recordProgress}%</span>
                </div>
                <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-150"
                    style={{ width: `${recordProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 text-xs bg-zinc-800 rounded-lg text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExportVideo}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow"
                >
                  ⚡ Iniciar Descarga
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Auto-Subtítulos IA */}
      {isCaptionsModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">✨ Subtítulos Automáticos con IA</h2>
              <button onClick={() => setIsCaptionsModalOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-zinc-400">
              Transcribe el audio de tu video con marcas de tiempo precisas para formato corto.
            </p>
            {transcribeMessage && (
              <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-violet-300">
                {transcribeMessage}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsCaptionsModalOpen(false)} className="px-4 py-2 text-xs bg-zinc-800 rounded-lg text-zinc-300">
                Cerrar
              </button>
              <button
                onClick={() => handleGenerateCaptions()}
                disabled={isTranscribing}
                className="px-5 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-lg shadow disabled:opacity-50"
              >
                {isTranscribing ? 'Generando...' : '⚡ Generar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Publicación Social */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">🚀 Publicación en Redes Sociales</h2>
              <button onClick={() => setIsPublishModalOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['tiktok', 'instagram', 'youtube'] as SocialPlatform[]).map((net) => (
                <button
                  key={net}
                  onClick={() =>
                    setSelectedPlatforms((prev) =>
                      prev.includes(net) ? prev.filter((p) => p !== net) : [...prev, net]
                    )
                  }
                  className={`p-2.5 rounded-xl border text-center transition ${
                    selectedPlatforms.includes(net)
                      ? 'bg-violet-600/20 border-violet-500 text-white font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                  }`}
                >
                  <div className="text-xs uppercase">{net}</div>
                </button>
              ))}
            </div>
            <textarea
              value={postCaption}
              onChange={(e) => setPostCaption(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-white outline-none focus:border-violet-500"
            />
            {publishResults && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 rounded-xl text-xs space-y-1">
                <div className="font-bold text-emerald-300">✅ Publicado con éxito:</div>
                {publishResults.map((r) => (
                  <div key={r.platform} className="text-zinc-300 capitalize">
                    {r.platform}: <a href={r.url} target="_blank" rel="noreferrer" className="text-violet-400 underline">{r.url}</a>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsPublishModalOpen(false)} className="px-4 py-2 text-xs bg-zinc-800 rounded-lg text-zinc-300">
                Cerrar
              </button>
              <button
                onClick={handlePublishToSocials}
                disabled={isPublishing}
                className="px-5 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-lg shadow"
              >
                {isPublishing ? 'Publicando...' : '🚀 Publicar Ahora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
