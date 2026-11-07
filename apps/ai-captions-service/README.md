# V-Studio AI Auto-Captions Service

Microservicio de transcripción automática impulsado por **faster-whisper** con generación de timestamps palabra por palabra (*word-level timestamps*), diseñado específicamente para videos de formato corto (TikTok, Instagram Reels, YouTube Shorts).

## Características
- Timestamps de alta precisión por palabra.
- Agrupación automática de frases cortas estilo "Alex Hormozi".
- Asignación de colores para animación dinámica en WebGL.
- Soporte para archivos MP4, WebM, MP3, WAV, M4A, FLAC.
- Filtro VAD integrado para omitir silencios y optimizar sincronización.
- Endpoint de verificación `/health` y CORS habilitado.

## Ejecución Local
```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate # En Windows: .\venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar el servicio
python main.py
# O con uvicorn:
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## Ejecución con Docker
```bash
docker build -t vstudio-ai-captions .
docker run -p 8001:8001 vstudio-ai-captions
```

