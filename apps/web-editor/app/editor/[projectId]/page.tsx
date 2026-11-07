'use client';

import React, { useEffect, useRef, useState, use } from 'react';
import { useParams } from 'next/navigation';
import { useEditorStore } from '../../../store/useEditorStore';
import { HybridMediaEngine, AspectRatioPreset } from '../../../core/HybridMediaEngine';
import { CaptionPresetStyle } from '../../../modules/captions/DynamicCaptionRenderer';
import { SocialPlatform, PlatformPublishResult } from '../../../modules/social/SocialPublisherService';

export default function EditorWorkspace({ params }: { params?: Promise<{ projectId: string }> }) {
  const routeParams = useParams();
  const projectId = (routeParams?.projectId as string) || 'proj_viral_001';

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Estados de UI y modales
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isCaptionsModalOpen, setIsCaptionsModalOpen] = useState(false);
  const [isRecordingClient, setIsRecordingClient] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  // Estados de publicación en redes
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(['tiktok', 'instagram', 'youtube']);
  const [postCaption, setPostCaption] = useState('Nuevo video creado y editado a 60 FPS en V-Studio Pro 🚀');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<PlatformPublishResult[] | null>(null);

  // Estados de transcripción IA
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
    captionStyle,
    setEngineInstance,
    setAspectRatio,
    togglePlay,
    seekTo,
    setZoomLevel,
    setSelectedClip,
    splitClipAtPlayhead,
    deleteSelectedClip,
    loadMediaFile,
    setCaptionPhrases,
    setCaptionStyle,
  } = useEditorStore();

  // Inicializar motor WebGL Pixi v8
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const engine = new HybridMediaEngine();
    engine.init(canvasContainerRef.current, 1080, 1920).then(() => {
      setEngineInstance(engine);
    });

    return () => {
      engine.destroy();
    };
  }, [setEngineInstance]);

  // Bucle de reproducción a 60 FPS
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = useEditorStore.getState().currentTime + dt;
      if (next >= totalDuration) {
        useEditorStore.getState().seekTo(0);
        useEditorStore.getState().togglePlay();
      } else {
        useEditorStore.getState().seekTo(next);
        rafId = requestAnimationFrame(loop);
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDuration]);

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadMediaFile(file);
    }
  };

  const handleGenerateCaptions = async (audioFile?: File) => {
    setIsTranscribing(true);
    setTranscribeMessage('Procesando audio con Faster-Whisper IA...');

    try {
      const formData = new FormData();
      if (audioFile) {
        formData.append('file', audioFile);
      } else {
        // Enviar un archivo de audio sintético si no hay archivo adjunto
        const emptyAudioBlob = new Blob([new Uint8Array(44)], { type: 'audio/wav' });
        formData.append('file', emptyAudioBlob, 'input_audio.wav');
      }
      formData.append('language', captionLanguage);

      const res = await fetch('/api/captions/generate', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.phrases) {
        setCaptionPhrases(data.phrases);
        setTranscribeMessage(`✅ ${data.phrases.length} frases generadas con timestamps por palabra.`);
      } else {
        setTranscribeMessage(`Advertencia: ${data.error || 'No se pudieron generar subtítulos'}`);
      }
    } catch (err: any) {
      setTranscribeMessage(`Error de conexión con el servicio de subtítulos: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

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

  const handleClientExportAndDownload = async () => {
    const engine = useEditorStore.getState().engineInstance;
    if (!engine) return;

    setIsRecordingClient(true);
    setRecordProgress(0);

    // Rebobinar al inicio
    seekTo(0);
    engine.startClientRecording();

    if (!isPlaying) togglePlay();

    // Esperar hasta completar duración
    const totalMs = totalDuration * 1000;
    const interval = setInterval(() => {
      const curr = useEditorStore.getState().currentTime;
      setRecordProgress(Math.min(100, Math.round((curr / totalDuration) * 100)));
    }, 200);

    setTimeout(async () => {
      clearInterval(interval);
      if (useEditorStore.getState().isPlaying) togglePlay();
      const videoBlob = await engine.stopClientRecording();
      setIsRecordingClient(false);

      // Disparar descarga automática
      const downloadUrl = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${projectTitle.replace(/\s+/g, '_')}_60fps.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    }, totalMs + 500);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      {/* Inputs de archivo ocultos */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="video/*,audio/*"
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

      {/* Header superior */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-500 animate-pulse" />
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
              {ratio === '9:16' ? '📱 9:16' : ratio === '1:1' ? '⏹ 1:1' : '🖥 16:9'}
            </button>
          ))}
        </div>

        {/* Acciones del proyecto */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition"
          >
            📁 Subir Medio
          </button>

          <button
            onClick={() => setIsCaptionsModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition"
          >
            ✨ Subtítulos IA
          </button>

          <button
            onClick={() => setShowSafeZones(!showSafeZones)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition ${
              showSafeZones
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-500'
            }`}
          >
            👁 Safe Zone
          </button>

          <button
            onClick={() => {
              setPublishResults(null);
              setIsPublishModalOpen(true);
            }}
            className="px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:opacity-90 text-white rounded-lg shadow-lg shadow-violet-500/20 transition"
          >
            🚀 Exportar & Publicar
          </button>
        </div>
      </header>

      {/* Área central con Canvas WebGL */}
      <div className="flex flex-1 min-h-0 bg-zinc-950 relative">
        <main className="flex-1 flex items-center justify-center p-4">
          <div
            className="relative shadow-2xl rounded-lg border border-zinc-800/80 bg-black overflow-hidden flex items-center justify-center"
            style={{
              height: '100%',
              maxHeight: '480px',
              aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '1:1' ? '1/1' : '16/9',
            }}
          >
            <div ref={canvasContainerRef} className="w-full h-full" />

            {/* Overlay de Zonas Seguras para TikTok / Reels */}
            {showSafeZones && aspectRatio === '9:16' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
                {/* Cabecera TikTok */}
                <div className="h-[14%] bg-rose-500/10 border-b border-dashed border-rose-500/40 flex items-center justify-center text-[10px] font-semibold text-rose-300 tracking-wider">
                  ZONA SUPERIOR (NOMBRES / BÚSQUEDA)
                </div>

                {/* Margen lateral derecho (Likes, Comentarios, Compartir) */}
                <div className="absolute right-0 top-[20%] bottom-[25%] w-[16%] bg-amber-500/10 border-l border-dashed border-amber-500/40 flex items-center justify-center text-[9px] text-amber-300 [writing-mode:vertical-rl]">
                  ICONOS SOCIALES
                </div>

                {/* Zona inferior (Título, Audio, Botones CTA) */}
                <div className="h-[20%] bg-rose-500/10 border-t border-dashed border-rose-500/40 flex items-center justify-center text-[10px] font-semibold text-rose-300 tracking-wider">
                  ZONA INFERIOR (DESCRIPCIÓN Y AUDIO)
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Barra de Controles y Transporte */}
      <div className="h-12 bg-zinc-900 border-y border-zinc-800 px-4 flex items-center justify-between shrink-0">
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

        {/* Herramientas de edición sobre la línea de tiempo */}
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
            🗑 Eliminar
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

      {/* Línea de tiempo multipista */}
      <section className="h-48 bg-zinc-950 flex overflow-hidden shrink-0">
        {/* Cabeceras de pistas */}
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

        {/* Carril de pistas y clips */}
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

          {/* Línea roja del cursor de reproducción */}
          <div
            style={{ left: `${currentTime * zoomLevel}px` }}
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none"
          >
            <div className="w-2.5 h-2.5 bg-rose-500 -ml-1 rounded-full shadow" />
          </div>
        </div>
      </section>

      {/* Modal 1: Subtítulos IA (Whisper) */}
      {isCaptionsModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h2 className="text-base font-bold text-white">Auto-Captions IA (Faster-Whisper)</h2>
              </div>
              <button onClick={() => setIsCaptionsModalOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-zinc-400">
              Genera automáticamente subtítulos dinámicos sincronizados palabra por palabra con estilos virales para retener a tu audiencia.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Estilo de Subtítulo:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['hormozi', 'neon', 'minimal'] as CaptionPresetStyle[]).map((style) => (
                    <button
                      key={style}
                      onClick={() => setCaptionStyle(style)}
                      className={`p-2 rounded-lg border text-xs capitalize transition ${
                        captionStyle === style
                          ? 'bg-violet-600/30 border-violet-500 text-white font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {style === 'hormozi' ? '🔥 Hormozi Pop' : style === 'neon' ? '⚡ Neon Glow' : '◽ Minimal'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Idioma del Audio:</label>
                <select
                  value={captionLanguage}
                  onChange={(e) => setCaptionLanguage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200"
                >
                  <option value="es">Español (Auto-puntuación)</option>
                  <option value="en">English (US/UK)</option>
                  <option value="auto">Detección Automática</option>
                </select>
              </div>

              {transcribeMessage && (
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-violet-300 font-mono">
                  {transcribeMessage}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => audioFileInputRef.current?.click()}
                className="text-xs text-zinc-400 hover:text-white underline"
              >
                Cargar archivo de audio externo
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsCaptionsModalOpen(false)}
                  className="px-4 py-2 text-xs bg-zinc-800 rounded-lg text-zinc-300"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => handleGenerateCaptions()}
                  disabled={isTranscribing}
                  className="px-5 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-lg shadow disabled:opacity-50"
                >
                  {isTranscribing ? 'Transcribiendo...' : '⚡ Generar Ahora'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Exportar y Publicar en Redes */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">🚀 Exportación y Auto-Publicador Multicanal</h2>
              <button onClick={() => setIsPublishModalOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            {/* Selector de plataformas */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Publicar directamente en:</label>
              <div className="grid grid-cols-4 gap-2">
                {(['tiktok', 'instagram', 'youtube', 'facebook'] as SocialPlatform[]).map((net) => (
                  <button
                    key={net}
                    onClick={() => togglePlatform(net)}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      selectedPlatforms.includes(net)
                        ? 'bg-violet-600/20 border-violet-500 text-white font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <div className="text-xs capitalize">{net}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Texto y hashtags */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Copy / Descripción del Post:</label>
              <textarea
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                rows={3}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-white outline-none focus:border-violet-500"
              />
            </div>

            {/* Descarga local instantánea vs Render en nube */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Descarga Instantánea Local:</span>
                <span className="text-[10px] text-emerald-400 font-mono">60 FPS WebCodecs</span>
              </div>
              <button
                onClick={handleClientExportAndDownload}
                disabled={isRecordingClient}
                className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 transition disabled:opacity-50"
              >
                {isRecordingClient
                  ? `Grabando Canvas... (${recordProgress}%)`
                  : '📥 Descargar Video Renderizado (Navegador)'}
              </button>
            </div>

            {/* Resultados de publicación */}
            {publishResults && (
              <div className="space-y-1.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/60 text-xs">
                <div className="font-semibold text-emerald-300">✅ Publicaciones procesadas:</div>
                {publishResults.map((r) => (
                  <div key={r.platform} className="flex items-center justify-between text-zinc-300">
                    <span className="capitalize font-mono">{r.platform}:</span>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-400 hover:underline truncate max-w-[220px]"
                    >
                      {r.url || 'Publicado'}
                    </a>
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
                disabled={isPublishing || selectedPlatforms.length === 0}
                className="px-5 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition disabled:opacity-50"
              >
                {isPublishing ? 'Publicando en redes...' : '🚀 Publicar en Redes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

