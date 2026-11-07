import os
import shutil
import tempfile
import logging
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ai-captions")

app = FastAPI(
    title="V-Studio AI Auto-Captions Service",
    description="Microservicio de transcripción automática con timestamps por palabra usando faster-whisper",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_size = os.getenv("WHISPER_MODEL", "base")
compute_type = os.getenv("COMPUTE_TYPE", "int8")
device = os.getenv("WHISPER_DEVICE", "cpu")

logger.info(f"Cargando modelo Faster-Whisper: {model_size} (Device: {device}, Compute: {compute_type})...")
try:
    from faster_whisper import WhisperModel
    whisper_model = WhisperModel(model_size, device=device, compute_type=compute_type)
    logger.info("Modelo Faster-Whisper cargado correctamente.")
except Exception as e:
    logger.warning(f"No se pudo inicializar faster-whisper de inmediato ({e}). Se inicializará bajo demanda.")
    whisper_model = None

def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        from faster_whisper import WhisperModel
        logger.info(f"Cargando modelo en primer uso: {model_size}...")
        whisper_model = WhisperModel(model_size, device=device, compute_type=compute_type)
    return whisper_model

class WordItem(BaseModel):
    text: str
    start: float
    end: float
    highlightColor: int = 16770560 # Hex #FFE600

class CaptionPhrase(BaseModel):
    id: str
    startTime: float
    endTime: float
    words: List[WordItem]

class TranscriptionResponse(BaseModel):
    language: str
    duration: float
    fullText: str
    phrases: List[CaptionPhrase]

@app.get("/")
def root():
    return {
        "service": "V-Studio AI Auto-Captions",
        "status": "online",
        "model": model_size,
        "device": device
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model": model_size,
        "compute_type": compute_type,
        "device": device
    }

@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_word_level(
    file: UploadFile = File(...),
    language: Optional[str] = Query(default=None, description="Idioma del audio (ej. 'es', 'en', o auto)"),
    max_words_per_phrase: int = Query(default=4, ge=1, le=10, description="Palabras por grupo para subtítulos cortos virales")
):
    """
    Recibe un archivo de audio o video (MP4, MP3, WAV, WEBM, M4A) y retorna subtítulos palabra por palabra.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido")

    # Extension temporal adecuada
    ext = os.path.splitext(file.filename)[1].lower()
    if not ext:
        ext = ".wav"

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        model = get_whisper_model()
        logger.info(f"Procesando transcripción de archivo: {file.filename} ({os.path.getsize(tmp_path)} bytes)")

        # Transcripción con word timestamps
        target_lang = language if language and language != "auto" else None
        segments, info = model.transcribe(
            tmp_path,
            word_timestamps=True,
            language=target_lang,
            vad_filter=True, # Remueve silencios
            vad_parameters=dict(min_silence_duration_ms=400)
        )

        all_words: List[WordItem] = []
        full_text_parts = []
        total_duration = getattr(info, "duration", 0.0)

        # Paleta de colores para palabras destacadas
        highlight_palette = [
            16770560, # Amarillo #FFE600
            11027197, # Morado #A855F7
            2278750,  # Verde Neón #22C55E
            15485081  # Rosa Fucsia #EC4899
        ]

        color_idx = 0
        for segment in segments:
            full_text_parts.append(segment.text.strip())
            if segment.words:
                for w in segment.words:
                    clean_word = w.word.strip()
                    if not clean_word:
                        continue
                    all_words.append(WordItem(
                        text=clean_word,
                        start=round(w.start, 2),
                        end=round(w.end, 2),
                        highlightColor=highlight_palette[color_idx % len(highlight_palette)]
                    ))
                    color_idx += 1

        # Agrupar en frases de estilo viral corto (Hormozi / Reels)
        phrases: List[CaptionPhrase] = []
        chunk_size = max_words_per_phrase
        for i in range(0, len(all_words), chunk_size):
            chunk = all_words[i:i + chunk_size]
            if not chunk:
                continue
            phrase_start = chunk[0].start
            phrase_end = chunk[-1].end
            phrases.append(CaptionPhrase(
                id=f"phrase_{len(phrases)}",
                startTime=phrase_start,
                endTime=phrase_end,
                words=chunk
            ))

        detected_lang = getattr(info, "language", language or "es")
        return TranscriptionResponse(
            language=detected_lang,
            duration=round(total_duration, 2),
            fullText=" ".join(full_text_parts),
            phrases=phrases
        )

    except Exception as err:
        logger.error(f"Error durante transcripción: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Fallo en procesamiento de audio: {str(err)}")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)

