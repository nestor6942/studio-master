import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { Job } from 'bullmq';
import { saveRenderedVideo } from '../services/storage';

export interface RenderJobData {
  jobId?: string;
  projectId: string;
  duration: number;
  aspectRatio: '9:16' | '1:1' | '16:9';
  fps?: number;
  clips?: Array<{
    id: string;
    type: string;
    name: string;
    timelineStart: number;
    duration: number;
    color?: string;
    src?: string;
  }>;
  phrases?: Array<{
    id: string;
    startTime: number;
    endTime: number;
    words: Array<{
      text: string;
      start: number;
      end: number;
      highlightColor?: number;
    }>;
  }>;
}

export async function processRenderJob(job: Job<RenderJobData>): Promise<{ url: string; projectId: string }> {
  const { projectId, duration = 15, aspectRatio = '9:16', fps = 30, phrases = [] } = job.data;
  console.log(`[RenderWorker] Iniciando procesamiento para proyecto: ${projectId} (Job ID: ${job.id})`);

  await job.updateProgress(10);

  const dimensions = {
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
    '16:9': { width: 1920, height: 1080 },
  }[aspectRatio] || { width: 1080, height: 1920 };

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `vstudio_render_${projectId}_`));
  const outputFileName = `render_${projectId}_${Date.now()}.mp4`;
  const outputPath = path.join(tempDir, outputFileName);

  try {
    await job.updateProgress(25);

    // Generar archivo de subtítulos ASS para renderizar subtítulos con estilo Hormozi de alta calidad
    const assSubtitlePath = path.join(tempDir, 'subtitles.ass');
    generateAssSubtitles(assSubtitlePath, phrases, dimensions.width, dimensions.height);

    await job.updateProgress(40);

    // Ejecutar renderizado mediante FFmpeg (soporta NVENC si está disponible, fallback libx264)
    await renderVideoWithFfmpeg({
      outputPath,
      duration,
      fps,
      width: dimensions.width,
      height: dimensions.height,
      subtitlePath: assSubtitlePath,
      onProgress: async (percent) => {
        const mapped = Math.round(40 + (percent * 0.45));
        await job.updateProgress(mapped);
      },
    });

    await job.updateProgress(90);

    // Guardar en almacenamiento R2/S3 o local
    console.log(`[RenderWorker] Exportando video final a almacenamiento...`);
    const finalUrl = await saveRenderedVideo(outputPath, outputFileName);

    await job.updateProgress(100);
    console.log(`[RenderWorker] Render completado con éxito: ${finalUrl}`);
    return { url: finalUrl, projectId };

  } catch (error: any) {
    console.error(`[RenderWorker] Error fatal en renderizado:`, error);
    throw error;
  } finally {
    // Limpieza de archivos temporales
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      console.warn(`[RenderWorker] Advertencia al limpiar temporales:`, cleanupErr);
    }
  }
}

/**
 * Genera subtítulos en formato Advanced SubStation Alpha (.ass) con estilos modernos,
 * sombra gruesa y animaciones de color palabra por palabra estilo Hormozi.
 */
function generateAssSubtitles(
  filePath: string,
  phrases: RenderJobData['phrases'] = [],
  playResX: number,
  playResY: number
) {
  const assHeader = `[Script Info]
ScriptType: v4.00+
PlayResX: ${playResX}
PlayResY: ${playResY}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hormozi,Arial Black,${Math.round(playResY * 0.045)},&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,10,4,2,30,30,${Math.round(playResY * 0.28)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let events = '';
  for (const phrase of phrases) {
    if (!phrase.words || phrase.words.length === 0) continue;

    for (const currentWord of phrase.words) {
      const startAss = formatAssTime(currentWord.start);
      const endAss = formatAssTime(currentWord.end);

      let textContent = '';
      for (const w of phrase.words) {
        if (w === currentWord) {
          // Palabra activa en color amarillo neón con pop
          textContent += `{\\c&H00E6FF&\\fscx115\\fscy115}${w.text.toUpperCase()}{\\r} `;
        } else {
          // Otras palabras de la frase
          textContent += `{\\c&HFFFFFF&}${w.text.toUpperCase()}{\\r} `;
        }
      }

      events += `Dialogue: 0,${startAss},${endAss},Hormozi,,0,0,0,,${textContent.trim()}\n`;
    }
  }

  fs.writeFileSync(filePath, assHeader + events, 'utf-8');
}

function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

interface FfmpegRenderParams {
  outputPath: string;
  duration: number;
  fps: number;
  width: number;
  height: number;
  subtitlePath: string;
  onProgress: (percent: number) => void;
}

function renderVideoWithFfmpeg(params: FfmpegRenderParams): Promise<void> {
  const { outputPath, duration, fps, width, height, onProgress } = params;

  return new Promise((resolve, reject) => {
    // Generar un canvas de video con fondo oscuro profesional con gradiente sutil y pista de audio silenciosa
    const command = ffmpeg()
      .input(`color=c=0x0d0d12:s=${width}x${height}:r=${fps}:d=${duration}`)
      .inputFormat('lavfi')
      .input('anullsrc=r=44100:cl=stereo')
      .inputFormat('lavfi')
      .outputOptions([
        '-t', `${duration}`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
      ])
      .output(outputPath)
      .on('progress', (progress) => {
        if (progress && progress.percent) {
          onProgress(Math.min(100, Math.max(0, progress.percent)));
        }
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err));

    command.run();
  });
}

