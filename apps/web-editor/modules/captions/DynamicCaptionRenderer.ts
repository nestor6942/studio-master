import * as PIXI from 'pixi.js';

export interface WordTimestamp {
  text: string;
  start: number;
  end: number;
  highlightColor?: number;
}

export interface CaptionPhrase {
  id: string;
  startTime: number;
  endTime: number;
  words: WordTimestamp[];
}

export type CaptionPresetStyle = 'hormozi' | 'neon' | 'minimal' | 'karaoke';

export class DynamicCaptionRenderer {
  public container: PIXI.Container;
  private wordSprites: PIXI.Text[] = [];
  private highlightBox: PIXI.Graphics;
  private activePhraseId: string | null = null;
  private presetStyle: CaptionPresetStyle = 'hormozi';

  constructor() {
    this.container = new PIXI.Container();
    this.highlightBox = new PIXI.Graphics();
    this.container.addChild(this.highlightBox);
  }

  public setStyle(style: CaptionPresetStyle): void {
    this.presetStyle = style;
    this.activePhraseId = null; // Fuerza reconstrucción
  }

  public buildPhraseLayout(phrase: CaptionPhrase, canvasWidth: number, canvasHeight: number): void {
    if (this.activePhraseId === phrase.id) return;
    this.activePhraseId = phrase.id;

    // Destruir sprites antiguos
    for (const sprite of this.wordSprites) {
      sprite.destroy();
    }
    this.wordSprites = [];

    const spacing = Math.max(12, Math.round(canvasWidth * 0.018));
    const fontSize = Math.max(36, Math.round(canvasWidth * 0.055));
    let totalWidth = 0;

    for (const wordData of phrase.words) {
      const textStyle = new PIXI.TextStyle({
        fontFamily: 'Montserrat, Arial Black, Impact, sans-serif',
        fontSize: fontSize,
        fontWeight: '900',
        fill: '#FFFFFF',
        stroke: { color: '#000000', width: Math.round(fontSize * 0.18), join: 'round' },
        dropShadow: {
          alpha: 0.8,
          angle: Math.PI / 4,
          blur: 4,
          color: '#000000',
          distance: 6,
        },
      });

      const textObj = new PIXI.Text({
        text: wordData.text.toUpperCase(),
        style: textStyle,
      });

      textObj.anchor.set(0.5, 0.5);
      this.container.addChild(textObj);
      this.wordSprites.push(textObj);
      totalWidth += textObj.width + spacing;
    }

    totalWidth -= spacing;

    // Centrado horizontal
    let currentX = (canvasWidth - totalWidth) / 2;
    // Posición vertical: en el tercio inferior seguro (aprox 72% de la altura)
    const baseY = canvasHeight * 0.72;

    for (const sprite of this.wordSprites) {
      sprite.x = currentX + sprite.width / 2;
      sprite.y = baseY;
      currentX += sprite.width + spacing;
    }
  }

  public updateAtTime(currentTime: number, phrase: CaptionPhrase): void {
    this.highlightBox.clear();

    phrase.words.forEach((word, index) => {
      const sprite = this.wordSprites[index];
      if (!sprite) return;

      const isSpokenNow = currentTime >= word.start && currentTime <= word.end;

      if (isSpokenNow) {
        const duration = Math.max(0.05, word.end - word.start);
        const progress = (currentTime - word.start) / duration;
        const popScale = progress < 0.25 ? 1.25 : 1.15;

        sprite.scale.set(popScale);

        // Estilos según el preset
        if (this.presetStyle === 'hormozi') {
          sprite.style.fill = 0xffe600; // Amarillo intenso
          // Dibujar píldora redondeada morada detrás
          const boxPaddingX = 20;
          const boxPaddingY = 12;
          this.highlightBox
            .roundRect(
              sprite.x - (sprite.width * popScale) / 2 - boxPaddingX,
              sprite.y - (sprite.height * popScale) / 2 - boxPaddingY,
              sprite.width * popScale + boxPaddingX * 2,
              sprite.height * popScale + boxPaddingY * 2,
              18
            )
            .fill({ color: 0x7c3aed, alpha: 0.95 });
        } else if (this.presetStyle === 'neon') {
          sprite.style.fill = 0x22c55e; // Verde neón
        } else {
          sprite.style.fill = 0x38bdf8; // Azul cielo
        }
      } else {
        sprite.scale.set(1.0);
        // Palabras ya habladas se atenúan sutilmente para dar ritmo
        sprite.style.fill = currentTime > word.end ? 0x94a3b8 : 0xffffff;
      }
    });
  }

  public clear(): void {
    this.highlightBox.clear();
    for (const sprite of this.wordSprites) {
      sprite.destroy();
    }
    this.wordSprites = [];
    this.activePhraseId = null;
  }
}

