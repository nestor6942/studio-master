import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type AspectRatioPreset = '9:16' | '1:1' | '16:9';
export type CaptionPosition = 'top' | 'middle' | 'bottom';
export type CaptionPresetStyle = 'hormozi' | 'neon' | 'minimal' | 'bold';

export interface SubtitleWord {
  text: string;
  start: number;
  end: number;
  highlightColor?: string;
}

export interface SubtitlePhrase {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  words: SubtitleWord[];
  position: CaptionPosition;
  color: string;
  fontSize?: number;
}

export interface ClipItem {
  id: string;
  trackId: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'graphic';
  inPoint: number;
  outPoint: number;
  timelineStart: number;
  duration: number;
  color: string;
  src?: string;
}

export interface TrackItem {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'caption' | 'graphic';
  visible: boolean;
}

interface EditorState {
  projectTitle: string;
  aspectRatio: AspectRatioPreset;
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  zoomLevel: number;
  selectedClipId: string | null;
  selectedPhraseId: string | null;
  captionStyle: CaptionPresetStyle;
  videoUrl: string | null;
  videoFileName: string | null;
  audioUrl: string | null;
  activeSidebarTab: 'subtitles' | 'media' | 'styles';
  tracks: TrackItem[];
  clips: ClipItem[];
  phrases: SubtitlePhrase[];

  setProjectTitle: (title: string) => void;
  setAspectRatio: (ratio: AspectRatioPreset) => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  seekTo: (time: number) => void;
  setZoomLevel: (zoom: number) => void;
  setSelectedClip: (id: string | null) => void;
  setSelectedPhrase: (id: string | null) => void;
  setActiveSidebarTab: (tab: 'subtitles' | 'media' | 'styles') => void;
  setCaptionStyle: (style: CaptionPresetStyle) => void;

  // Acciones de Medios (Video y Audio)
  setVideoMedia: (url: string, fileName: string, duration: number) => void;
  removeVideoMedia: () => void;
  
  // Acciones de Subtítulos y Texto
  updatePhraseText: (id: string, newText: string) => void;
  updatePhraseTiming: (id: string, startTime: number, endTime: number) => void;
  updatePhrasePosition: (id: string, position: CaptionPosition) => void;
  updatePhraseColor: (id: string, color: string) => void;
  addPhrase: (text?: string, startTime?: number, duration?: number) => void;
  deletePhrase: (id: string) => void;
  setAllPhrases: (phrases: SubtitlePhrase[]) => void;

  // Acciones del Timeline
  splitClipAtPlayhead: () => void;
  deleteSelectedClip: () => void;
  toggleTrackVisibility: (trackId: string) => void;
}

const initialPhrases: SubtitlePhrase[] = [
  {
    id: 'phrase_1',
    startTime: 0.0,
    endTime: 3.5,
    text: 'EDITA Y PUBLICA EN UN CLIC',
    position: 'bottom',
    color: '#FFE600',
    words: [
      { text: 'EDITA', start: 0.0, end: 1.0, highlightColor: '#FFE600' },
      { text: 'Y PUBLICA', start: 1.0, end: 2.2, highlightColor: '#A855F7' },
      { text: 'EN UN CLIC', start: 2.2, end: 3.5, highlightColor: '#22C55E' },
    ],
  },
  {
    id: 'phrase_2',
    startTime: 3.5,
    endTime: 8.0,
    text: 'DIRECTO A TIKTOK Y REELS',
    position: 'bottom',
    color: '#22C55E',
    words: [
      { text: 'DIRECTO A', start: 3.5, end: 4.8, highlightColor: '#FFE600' },
      { text: 'TIKTOK', start: 4.8, end: 6.2, highlightColor: '#EC4899' },
      { text: 'Y REELS', start: 6.2, end: 8.0, highlightColor: '#A855F7' },
    ],
  },
  {
    id: 'phrase_3',
    startTime: 8.0,
    endTime: 15.0,
    text: 'RENDER 60 FPS EN VIVO',
    position: 'bottom',
    color: '#38BDF8',
    words: [
      { text: 'RENDER', start: 8.0, end: 10.0, highlightColor: '#FFE600' },
      { text: '60 FPS', start: 10.0, end: 12.0, highlightColor: '#38BDF8' },
      { text: 'EN VIVO', start: 12.0, end: 15.0, highlightColor: '#22C55E' },
    ],
  },
];

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    projectTitle: 'Campaña Viral Automatizada',
    aspectRatio: '9:16',
    isPlaying: false,
    currentTime: 0,
    totalDuration: 15,
    zoomLevel: 60,
    selectedClipId: null,
    selectedPhraseId: 'phrase_1',
    captionStyle: 'hormozi',
    videoUrl: null,
    videoFileName: null,
    audioUrl: null,
    activeSidebarTab: 'subtitles',
    phrases: initialPhrases,

    tracks: [
      { id: 'track_cap', name: 'Subtítulos IA', type: 'caption', visible: true },
      { id: 'track_vid', name: 'Video Principal', type: 'video', visible: true },
      { id: 'track_aud', name: 'Música / Audio', type: 'audio', visible: true },
    ],

    clips: [
      {
        id: 'clip_cap_1',
        trackId: 'track_cap',
        name: 'Subtítulos Dinámicos',
        type: 'text',
        inPoint: 0,
        outPoint: 15,
        timelineStart: 0,
        duration: 15,
        color: 'bg-purple-600/90 border-purple-400',
      },
    ],

    setProjectTitle: (title) => set({ projectTitle: title }),
    setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
    togglePlay: () => set({ isPlaying: !get().isPlaying }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),

    seekTo: (time) => {
      const clamped = Math.max(0, Math.min(time, get().totalDuration));
      set({ currentTime: clamped });
    },

    setZoomLevel: (zoom) => set({ zoomLevel: Math.max(20, Math.min(140, zoom)) }),
    setSelectedClip: (id) => set({ selectedClipId: id }),
    setSelectedPhrase: (id) => set({ selectedPhraseId: id }),
    setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
    setCaptionStyle: (style) => set({ captionStyle: style }),

    // Cargar Video y sincronizar con Timeline
    setVideoMedia: (url, fileName, duration) => {
      const roundedDuration = Math.max(5, Math.round(duration));
      set((state) => {
        state.videoUrl = url;
        state.videoFileName = fileName;
        state.totalDuration = roundedDuration;

        // Remover clip de video anterior si existía
        state.clips = state.clips.filter((c) => c.trackId !== 'track_vid');

        // Añadir nuevo clip de video al timeline
        state.clips.push({
          id: `clip_vid_${Date.now()}`,
          trackId: 'track_vid',
          name: fileName,
          type: 'video',
          inPoint: 0,
          outPoint: roundedDuration,
          timelineStart: 0,
          duration: roundedDuration,
          color: 'bg-emerald-600/90 border-emerald-400',
          src: url,
        });

        // Asegurar que el clip de subtítulos abarque la duración completa
        const capClip = state.clips.find((c) => c.trackId === 'track_cap');
        if (capClip) {
          capClip.duration = roundedDuration;
          capClip.outPoint = roundedDuration;
        }
      });
    },

    // Eliminar video del lienzo y del timeline
    removeVideoMedia: () => {
      set((state) => {
        state.videoUrl = null;
        state.videoFileName = null;
        state.clips = state.clips.filter((c) => c.trackId !== 'track_vid');
      });
    },

    // Edición directa de texto de subtítulos
    updatePhraseText: (id, newText) => {
      set((state) => {
        const phrase = state.phrases.find((p) => p.id === id);
        if (phrase) {
          phrase.text = newText;
          // Reconstruir palabras divididas para timestamps proporcionales
          const wordsList = newText.trim().split(/\s+/).filter(Boolean);
          const duration = Math.max(0.2, phrase.endTime - phrase.startTime);
          const wordDur = duration / Math.max(1, wordsList.length);

          phrase.words = wordsList.map((w, idx) => ({
            text: w,
            start: Number((phrase.startTime + idx * wordDur).toFixed(2)),
            end: Number((phrase.startTime + (idx + 1) * wordDur).toFixed(2)),
            highlightColor: phrase.color,
          }));
        }
      });
    },

    updatePhraseTiming: (id, startTime, endTime) => {
      set((state) => {
        const phrase = state.phrases.find((p) => p.id === id);
        if (phrase) {
          phrase.startTime = Math.max(0, startTime);
          phrase.endTime = Math.max(phrase.startTime + 0.3, endTime);
        }
      });
    },

    updatePhrasePosition: (id, position) => {
      set((state) => {
        const phrase = state.phrases.find((p) => p.id === id);
        if (phrase) {
          phrase.position = position;
        }
      });
    },

    updatePhraseColor: (id, color) => {
      set((state) => {
        const phrase = state.phrases.find((p) => p.id === id);
        if (phrase) {
          phrase.color = color;
          phrase.words.forEach((w) => (w.highlightColor = color));
        }
      });
    },

    addPhrase: (text = 'NUEVO TEXTO', startTime, duration = 3.0) => {
      set((state) => {
        const start = startTime !== undefined ? startTime : state.currentTime;
        const end = Math.min(state.totalDuration, start + duration);
        const newId = `phrase_${Date.now()}`;
        const wordsList = text.trim().split(/\s+/).filter(Boolean);
        const wordDur = (end - start) / Math.max(1, wordsList.length);

        state.phrases.push({
          id: newId,
          startTime: start,
          endTime: end,
          text: text,
          position: 'bottom',
          color: '#FFE600',
          words: wordsList.map((w, idx) => ({
            text: w,
            start: Number((start + idx * wordDur).toFixed(2)),
            end: Number((start + (idx + 1) * wordDur).toFixed(2)),
            highlightColor: '#FFE600',
          })),
        });

        // Ordenar por tiempo de inicio
        state.phrases.sort((a, b) => a.startTime - b.startTime);
        state.selectedPhraseId = newId;
      });
    },

    deletePhrase: (id) => {
      set((state) => {
        state.phrases = state.phrases.filter((p) => p.id !== id);
        if (state.selectedPhraseId === id) {
          state.selectedPhraseId = state.phrases[0]?.id || null;
        }
      });
    },

    setAllPhrases: (newPhrases) => {
      set((state) => {
        state.phrases = newPhrases;
        if (newPhrases.length > 0) {
          const maxEnd = Math.max(...newPhrases.map((p) => p.endTime));
          if (maxEnd > state.totalDuration) {
            state.totalDuration = Math.round(maxEnd);
          }
        }
      });
    },

    // Dividir clip en el playhead
    splitClipAtPlayhead: () => {
      const { selectedClipId, currentTime, clips } = get();
      const clipIndex = clips.findIndex((c) => c.id === selectedClipId);
      if (clipIndex === -1) return;

      const targetClip = clips[clipIndex];
      const relativeTime = currentTime - targetClip.timelineStart;

      if (relativeTime > 0.3 && relativeTime < targetClip.duration - 0.3) {
        set((state) => {
          const original = state.clips[clipIndex];
          const splitPoint = currentTime;
          const firstDuration = splitPoint - original.timelineStart;
          const secondDuration = original.duration - firstDuration;

          const partA: ClipItem = {
            ...original,
            duration: firstDuration,
            outPoint: original.inPoint + firstDuration,
          };

          const partB: ClipItem = {
            ...original,
            id: `clip_${Date.now()}`,
            name: `${original.name} (Parte 2)`,
            timelineStart: splitPoint,
            inPoint: original.inPoint + firstDuration,
            duration: secondDuration,
          };

          state.clips.splice(clipIndex, 1, partA, partB);
          state.selectedClipId = partB.id;
        });
      }
    },

    // Eliminar clip seleccionado y sincronizar con los medios reales
    deleteSelectedClip: () => {
      const { selectedClipId, clips } = get();
      if (!selectedClipId) return;

      const targetClip = clips.find((c) => c.id === selectedClipId);

      set((state) => {
        state.clips = state.clips.filter((c) => c.id !== selectedClipId);
        state.selectedClipId = null;

        // Si eliminó el clip de video, limpiar el video de la pantalla
        if (targetClip?.trackId === 'track_vid') {
          state.videoUrl = null;
          state.videoFileName = null;
        }

        // Si eliminó el clip de subtítulos, limpiar subtítulos
        if (targetClip?.trackId === 'track_cap') {
          state.phrases = [];
        }
      });
    },

    toggleTrackVisibility: (trackId) => {
      set((state) => {
        const track = state.tracks.find((t) => t.id === trackId);
        if (track) track.visible = !track.visible;
      });
    },
  }))
);
