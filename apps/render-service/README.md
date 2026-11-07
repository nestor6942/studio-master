# V-Studio Render Service

Motor de renderizado de video en segundo plano para V-Studio Pro. Consume trabajos de la cola de BullMQ (`video-render`) conectada a Redis, renderiza composiciones a 30/60 FPS con subtítulos animados de alta calidad y exporta el archivo final a Cloudflare R2 / AWS S3 o almacenamiento local.

## Características
- Cola asíncrona respaldada por Redis + BullMQ.
- Renderizado de subtítulos avanzados con estilo Hormozi, Neon y Karaoke.
- Soporte dual de ejecución: CPU (libx264 estándar) y GPU (NVIDIA NVENC por hardware).
- Notificación de progreso en tiempo real (0% - 100%).
- Subida automática a S3 / R2 con CDN configurable.

## Ejecución Local
```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Iniciar worker
npm run start
```

## Ejecución con Docker
```bash
# Modo CPU estándar
docker build -t vstudio-render-worker .
docker run -e REDIS_HOST=localhost -p 3001:3001 vstudio-render-worker

# Modo GPU NVIDIA NVENC
docker build -f Dockerfile.gpu -t vstudio-gpu-render-worker .
docker run --gpus all vstudio-gpu-render-worker
```

