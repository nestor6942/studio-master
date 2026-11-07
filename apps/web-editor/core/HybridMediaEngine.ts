import * as PIXI from 'pixi.js';
import { DynamicCaptionRenderer, CaptionPhrase, CaptionPresetStyle } from '../modules/captions/DynamicCaptionRenderer';

export type AspectRatioPreset = '9:16' | '1:1' | '16:9';

export class HybridMediaEngine {
  private app: PIXI.Application;
  private captionRenderer: DynamicCaptionRenderer;
  private backgroundLayer: PIXI.Container;
  private videoSprite: PIXI.Sprite | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private backgroundGraphics: PIXI.Graphics;
  private watermarkText: PIXI.Text;
  private currentTime: number = 0;
  private canvasWidth: number = 1080;
  private canvasHeight: number = 1920;
  private phrases: CaptionPhrase[] = [];
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  constructor() {
    this.app = new PIXI.Application();
    this.captionRenderer = new DynamicCaptionRenderer();
    this.backgroundLayer = new PIXI.Container();
    this.backgroundGraphics = new PIXI.Graphics();
    this.watermarkText = new PIXI.Text({
      text: 'V-STUDIO PRO (60 FPS)',
      style: new PIXI.TextStyle({
        fontFamily: 'Montserrat, monospace',
        fontSize: 32,
        fontWeight: 'bold',
        fill: '#A78BFA',
      }),
    });
  }

  public async init(containerElement: HTMLElement, width = 1080, height = 1920): Promise<void> {
    this.canvasWidth = width;
    this.canvasHeight = height;

    await this.app.init({
      width,
      height,
      backgroundColor: 0x09090b,
      preference: 'webgl',
      antialias: true,
      powerPreference: 'high-performance',
    });

    containerElement.innerHTML = '';
    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.objectFit = 'contain';
    containerElement.appendChild(canvas);

    this.backgroundLayer.addChild(this.backgroundGraphics);
    this.app.stage.addChild(this.backgroundLayer);

    this.watermarkText.anchor.set(0.5, 0.5);
    this.app.stage.addChild(this.watermarkText);

    this.app.stage.addChild(this.captionRenderer.container);

    this.drawStudioBackdrop();
    this.seek(0);
  }

  public setPhrases(phrases: CaptionPhrase[]): void {
    this.phrases = phrases;
    this.seek(this.currentTime);
  }

  public setCaptionStyle(style: CaptionPresetStyle): void {
    this.captionRenderer.setStyle(style);
    this.seek(this.currentTime);
  }

  public setVideoSource(videoUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.videoElement) {
        this.videoElement.pause();
        this.videoElement.src = '';
      }

      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.playsInline = true;
      video.muted = false;
      video.src = videoUrl;

      video.onloadedmetadata = () => {
        this.videoElement = video;

        // Limpiar sprite anterior si existe
        if (this.videoSprite) {
          this.app.stage.removeChild(this.videoSprite);
          this.videoSprite.destroy();
          this.videoSprite = null;
        }

        try {
          const texture = PIXI.Texture.from(video);
          this.videoSprite = new PIXI.Sprite(texture);
          this.fitVideoToCanvas();

          // El sprite de video se coloca justo detrás de los subtítulos
          this.app.stage.addChildAt(this.videoSprite, 1);
        } catch (e) {
          console.warn('Fallback a renderizado por eventos de video:', e);
        }

        resolve(video.duration || 15);
      };

      video.onerror = (e) => {
        reject(new Error('No se pudo cargar el archivo de video'));
      };
    });
  }

  private fitVideoToCanvas(): void {
    if (!this.videoSprite || !this.videoElement) return;

    const vw = this.videoElement.videoWidth || this.canvasWidth;
    const vh = this.videoElement.videoHeight || this.canvasHeight;
    const scale = Math.max(this.canvasWidth / vw, this.canvasHeight / vh);

    this.videoSprite.width = vw * scale;
    this.videoSprite.height = vh * scale;
    this.videoSprite.x = (this.canvasWidth - this.videoSprite.width) / 2;
    this.videoSprite.y = (this.canvasHeight - this.videoSprite.height) / 2;
  }

  public drawStudioBackdrop(): void {
    this.backgroundGraphics.clear();

    // Fondo oscuro con degradado sutil
    this.backgroundGraphics
      .rect(0, 0, this.canvasWidth, this.canvasHeight)
      .fill({ color: 0x09090b });

    if (!this.videoSprite) {
      // Si no hay video cargado, mostrar un marco de estudio cinemático
      const paddingX = Math.round(this.canvasWidth * 0.08);
      const paddingY = Math.round(this.canvasHeight * 0.12);

      this.backgroundGraphics
        .roundRect(
          paddingX,
          paddingY,
          this.canvasWidth - paddingX * 2,
          this.canvasHeight - paddingY * 2,
          36
        )
        .fill({ color: 0x181824, alpha: 0.7 })
        .stroke({ color: 0x7c3aed, width: 4 });

      // Cuadrícula sutil
      const gridStep = 80;
      for (let x = paddingX; x <= this.canvasWidth - paddingX; x += gridStep) {
        this.backgroundGraphics
          .moveTo(x, paddingY)
          .lineTo(x, this.canvasHeight - paddingY)
          .stroke({ color: 0x27273a, width: 1 });
      }

      this.watermarkText.visible = true;
      this.watermarkText.x = this.canvasWidth / 2;
      this.watermarkText.y = this.canvasHeight * 0.38;
    } else {
      this.watermarkText.visible = false;
    }
  }

  public setAspectRatio(preset: AspectRatioPreset): void {
    const dimensions: Record<AspectRatioPreset, { w: number; h: number }> = {
      '9:16': { w: 1080, h: 1920 },
      '1:1':  { w: 1080, h: 1080 },
      '16:9': { w: 1920, h: 1080 },
    };

    const target = dimensions[preset];
    this.canvasWidth = target.w;
    this.canvasHeight = target.h;

    if (this.app.renderer) {
      this.app.renderer.resize(this.canvasWidth, this.canvasHeight);
      this.fitVideoToCanvas();
      this.drawStudioBackdrop();
      this.seek(this.currentTime);
    }
  }

  public play(): void {
    if (this.videoElement && this.videoElement.paused) {
      this.videoElement.play().catch(() => {});
    }
  }

  public pause(): void {
    if (this.videoElement && !this.videoElement.paused) {
      this.videoElement.pause();
    }
  }

  public seek(timeInSeconds: number): void {
    this.currentTime = Math.max(0, timeInSeconds);

    if (this.videoElement && Math.abs(this.videoElement.currentTime - this.currentTime) > 0.15) {
      this.videoElement.currentTime = this.currentTime;
    }

    // Buscar frase activa
    const activePhrase = this.phrases.find(
      (p) => this.currentTime >= p.startTime && this.currentTime <= p.endTime
    );

    if (activePhrase) {
      this.captionRenderer.buildPhraseLayout(activePhrase, this.canvasWidth, this.canvasHeight);
      this.captionRenderer.updateAtTime(this.currentTime, activePhrase);
    } else {
      this.captionRenderer.clear();
    }
  }

  /**
   * Exportación directa en el navegador utilizando MediaRecorder y el stream del Canvas a 60 FPS
   */
  public startClientRecording(): void {
    const canvas = this.app.canvas as HTMLCanvasElement;
    const stream = canvas.captureStream(60);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
  }

  public stopClientRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(new Blob(this.recordedChunks, { type: 'video/webm' }));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const videoBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
        this.recordedChunks = [];
        resolve(videoBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  public destroy(): void {
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement = null;
    }
    this.app.destroy(true, { children: true, texture: true });
  }
}

