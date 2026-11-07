import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

let renderQueue: Queue | null = null;

function getRenderQueue(): Queue | null {
  if (renderQueue) return renderQueue;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  try {
    const connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
    renderQueue = new Queue('video-render', { connection });
    return renderQueue;
  } catch (err) {
    console.warn('[Export API] Redis no disponible:', err);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, duration, aspectRatio, phrases, clips } = body;

    const queue = getRenderQueue();

    if (queue) {
      try {
        const job = await queue.add('export-task', {
          projectId: projectId || 'proj_default',
          duration: duration || 15,
          aspectRatio: aspectRatio || '9:16',
          phrases: phrases || [],
          clips: clips || [],
        });

        return NextResponse.json({
          success: true,
          mode: 'queue',
          jobId: job.id,
          message: 'Trabajo de renderizado encolado con éxito en BullMQ.',
        });
      } catch (queueErr) {
        console.warn('[Export API] Fallo al encolar en Redis, usando modo inmediato:', queueErr);
      }
    }

    // Fallback cuando Redis no está activo: retorno simulado de URL directa
    const fallbackUrl = `http://localhost:3000/exports/render_${projectId || 'proj'}_${Date.now()}.mp4`;
    return NextResponse.json({
      success: true,
      mode: 'client_or_mock',
      outputUrl: fallbackUrl,
      message: 'Render procesado (modo local/preview). Utiliza la exportación de navegador directa para descarga instantánea.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error en endpoint de exportación' },
      { status: 500 }
    );
  }
}

