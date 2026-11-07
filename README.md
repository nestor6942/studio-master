# 🚀 V-Studio Pro: Monorepo Total

> **Editor de Video WebGL Híbrido + Subtítulos Animados con IA (Faster-Whisper) + Render Worker GPU/NVENC + Auto-Publicador Multicanal (TikTok, Reels, Shorts)**

![Architecture](https://img.shields.io/badge/Architecture-Monorepo-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-cyan)
![PixiJS](https://img.shields.io/badge/Pixi.js-v8-e91e63)
![Faster-Whisper](https://img.shields.io/badge/AI-Faster--Whisper-purple)
![BullMQ](https://img.shields.io/badge/Queue-BullMQ%20%2B%20Redis-red)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)

---

## 📋 Resumen del Proyecto

**V-Studio Pro** es una plataforma integral de producción de video de formato corto para creadores, agencias y automatización de contenido viral:

1. **🎨 Web Editor (Next.js 15 + Pixi.js v8 + Zustand + Tailwind CSS)**:
   - Motor WebGL de alto rendimiento a 60 FPS con composición en tiempo real.
   - Soporte para relaciones de aspecto instantáneas: **9:16 (Vertical TikTok/Reels)**, **1:1 (Cuadrado)** y **16:9 (Horizontal)**.
   - Overlay de **Zonas Seguras** (Safe Zones) para TikTok e Instagram Reels.
   - Línea de tiempo multipista interactiva (Subtítulos IA, Gráficos/Stickers, Video, Audio).
   - Herramientas de edición en vivo: corte de clips (`✂ Dividir Clip`), eliminación (`🗑 Eliminar`), zoom y scrubbing sincronizado.
   - **Exportación local directa**: Graba el canvas a 60 FPS y descarga el video (WebM/MP4) directamente desde el navegador sin necesidad de servidores externos.

2. **🧠 AI Captions Service (Python 3.11 + FastAPI + faster-whisper)**:
   - Microservicio de transcripción automática palabra por palabra (*word-level timestamps*).
   - Generación de frases con estilo **Alex Hormozi** (resaltado amarillo dinámico `#FFE600`, fondo píldora violeta `#7C3AED`, escalado pop 1.25x).
   - Filtro VAD integrado para omitir silencios y optimizar sincronización.
   - Soporte para múltiples idiomas (Español, Inglés y detección automática).

3. **⚡ Render Service (Node.js + BullMQ + Redis + FFmpeg + Docker GPU NVENC)**:
   - Procesamiento en segundo plano de colas de renderizado a gran escala.
   - Generador automático de subtítulos de alta calidad (.ASS con tipografías y efectos integrados).
   - Soporte dual: **CPU estándar (libx264)** para desarrollo y **GPU NVIDIA (NVENC h264_nvenc)** para producción ultrarrápida.
   - Carga automática a Cloudflare R2 / AWS S3 o almacenamiento local accesible.

4. **📱 Social Auto-Publisher (TikTok, Instagram Reels, YouTube Shorts, Facebook)**:
   - Módulo unificado para programar y publicar videos con copies y hashtags optimizados.
   - Validación de requisitos y límites por plataforma en tiempo real.

5. **🗄️ Base de Datos (PostgreSQL 16)**:
   - Esquema relacional optimizado para espacios de trabajo (`workspaces`), proyectos (`projects`), cuentas sociales conectadas (`social_accounts`), publicaciones programadas (`scheduled_publications`) y tareas de render (`render_jobs`).

---

## 🏗️ Estructura del Monorepo

```
studio-master/
├── apps/
│   ├── web-editor/              # Frontend Next.js 15 + Pixi.js v8 + Zustand
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── captions/generate/route.ts
│   │   │   │   ├── render/export/route.ts
│   │   │   │   └── social/publish/route.ts
│   │   │   ├── editor/[projectId]/page.tsx
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── core/
│   │   │   └── HybridMediaEngine.ts
│   │   ├── modules/
│   │   │   ├── captions/DynamicCaptionRenderer.ts
│   │   │   └── social/SocialPublisherService.ts
│   │   └── store/
│   │       └── useEditorStore.ts
│   │
│   ├── ai-captions-service/     # Microservicio Python faster-whisper
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   └── render-service/          # Worker Node.js + BullMQ + FFmpeg
│       ├── src/
│       │   ├── index.ts
│       │   ├── workers/renderExport.worker.ts
│       │   └── services/storage.ts
│       ├── Dockerfile
│       └── Dockerfile.gpu
│
├── database/
│   └── init.sql                 # DDL PostgreSQL con esquemas e índices
│
├── .env.example                 # Variables de entorno modelo
├── .gitignore
├── docker-compose.yml           # Orquestación multicontenedor completa
├── package.json                 # Configuración de workspaces npm
└── vstudio-master-install.sh    # Script instalador automatizado
```

---

## ⚡ Inicio Rápido (Modo Local)

### 1. Requisitos Previos
- **Node.js**: v20 o superior
- **Python**: 3.10 o superior (para el servicio de subtítulos)
- **Git**

### 2. Configurar Variables de Entorno
Copia el archivo `.env.example` a `.env`:
```bash
cp .env.example .env
```

### 3. Instalar Dependencias del Monorepo
Desde la raíz del proyecto:
```bash
npm install
```

### 4. Iniciar el Editor Web
```bash
npm run dev:editor
```
Abre tu navegador en: [http://localhost:3000](http://localhost:3000)

### 5. Iniciar el Microservicio de Subtítulos IA (Opcional para IA en vivo)
```bash
cd apps/ai-captions-service
python -m venv venv
# En Linux/Mac:
source venv/bin/activate
# En Windows:
.\venv\Scripts\activate

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

---

## 🐳 Despliegue con Docker Compose

Para levantar toda la infraestructura (Base de Datos, Redis, IA y Render Workers):

```bash
# Iniciar servicios estándar (CPU)
docker compose up -d

# Para servidores con GPU NVIDIA (aceleración NVENC):
docker compose --profile gpu up -d
```

### Servicios Disponibles:
| Servicio | URL / Puerto | Descripción |
|---|---|---|
| **Web Editor** | `http://localhost:3000` | Interfaz de edición y timeline WebGL |
| **AI Captions** | `http://localhost:8001` | API Faster-Whisper para transcripción |
| **PostgreSQL** | `localhost:5432` | Base de datos relacional |
| **Redis** | `localhost:6379` | Broker de colas BullMQ |

---

## 🎯 Correcciones y Mejoras Implementadas

En la revisión técnica del instalador original (`vstudio-master-install.sh.txt`), se detectaron y resolvieron los siguientes fallos críticos:
1. **Render Service Incompleto**: El instalador creaba un `package.json` y referenciaba `dist/workers/renderExport.worker.js`, pero no contenía ningún código fuente. Se implementó el worker completo con BullMQ, FFmpeg y exportación con subtítulos ASS.
2. **Falta de Web Editor en Docker**: `docker-compose.yml` omitía el contenedor del editor web; se integró con healthchecks y redes compartidas.
3. **Carencia de Reproducción Real de Video**: El motor WebGL únicamente dibujaba un fondo decorativo; se actualizó para cargar y sincronizar archivos de video/audio reales (`HTMLVideoElement` con canvas WebGL).
4. **Exportación en el Navegador**: Se añadió soporte con `MediaRecorder` para exportar a 60 FPS directamente en el cliente sin requerir GPU en servidores externos.
5. **Herramientas de Edición**: Se implementaron las funciones vacías de corte (`splitClipAtPlayhead`) y borrado (`deleteSelectedClip`) en el store Zustand.
6. **Integración UI para Subtítulos IA**: Se añadió el flujo completo para solicitar transcripciones al servicio Python o usar el fallback inteligente.

---

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.

