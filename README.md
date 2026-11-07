# 🚀 V-Studio Pro: Monorepo Total

> **Editor de Video WebGL Híbrido + Subtítulos Animados con IA (Faster-Whisper) + Render Worker GPU/NVENC + Auto-Publicador Multicanal (TikTok, Reels, Shorts)**

![Architecture](https://img.shields.io/badge/Architecture-Monorepo-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-cyan)
![PixiJS](https://img.shields.io/badge/Pixi.js-v8-e91e63)
![Faster-Whisper](https://img.shields.io/badge/AI-Faster--Whisper-purple)
![BullMQ](https://img.shields.io/badge/Queue-BullMQ%20%2B%20Redis-red)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)
![Netlify](https://img.shields.io/badge/Netlify-Configured-00C7B7)

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

## 🌐 Despliegue en Netlify (Paso a Paso)

El proyecto está 100% preconfigurado con archivos `netlify.toml` listos para monorepo y compatibilidad total con **Next.js 15**:

1. Inicia sesión en tu cuenta de [Netlify](https://app.netlify.com/).
2. Haz clic en **"Add new site"** ➔ **"Import an existing project"**.
3. Selecciona **GitHub** y autoriza tu repositorio **`nestor6942/studio-master`**.
4. Netlify detectará automáticamente la configuración gracias a `netlify.toml`:
   - **Base directory**: `apps/web-editor`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node.js Version**: `20`
5. Haz clic en **"Deploy Site"**. ¡Netlify compilará y publicará tu editor web automáticamente con HTTPS gratuito!

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
│   │   ├── store/
│   │   │   └── useEditorStore.ts
│   │   └── netlify.toml         # Configuración Netlify para la app
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
├── .nvmrc                       # Node 20 para Netlify/Vercel
├── docker-compose.yml           # Orquestación multicontenedor completa
├── netlify.toml                 # Configuración Netlify raíz
├── package.json                 # Workspaces de npm
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

---

## 🐳 Despliegue con Docker Compose

Para levantar toda la infraestructura (Base de Datos, Redis, IA y Render Workers):

```bash
# Iniciar servicios estándar (CPU)
docker compose up -d

# Para servidores con GPU NVIDIA (aceleración NVENC):
docker compose --profile gpu up -d
```

---

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.
