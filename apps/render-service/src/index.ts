import dotenv from 'dotenv';
dotenv.config();

import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { processRenderJob, RenderJobData } from './workers/renderExport.worker';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

console.log(`[RenderService] Iniciando servicio de renderizado...`);
console.log(`[RenderService] Conectando a Redis en ${redisHost}:${redisPort}`);

const connection = new IORedis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
});

connection.on('connect', () => {
  console.log(`[RenderService] Conexión establecida con Redis exitosamente.`);
});

connection.on('error', (err) => {
  console.error(`[RenderService] Error en conexión Redis:`, err.message);
});

// Registrar el Worker de BullMQ para procesar la cola 'video-render'
const worker = new Worker<RenderJobData>(
  'video-render',
  async (job) => {
    return await processRenderJob(job);
  },
  {
    connection,
    concurrency: 2,
    lockDuration: 60000,
  }
);

worker.on('active', (job) => {
  console.log(`[Worker] Procesando trabajo ID ${job.id} (Proyecto: ${job.data.projectId})`);
});

worker.on('completed', (job, returnvalue) => {
  console.log(`[Worker] Trabajo ${job.id} finalizado con éxito:`, returnvalue);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Trabajo ${job?.id} falló:`, err.message);
});

// Manejo de apagado graceful
const shutdown = async () => {
  console.log(`[RenderService] Apagando worker de forma controlada...`);
  await worker.close();
  await connection.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

