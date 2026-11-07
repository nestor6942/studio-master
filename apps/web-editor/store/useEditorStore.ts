import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { AspectRatioPreset, HybridMediaEngine } from '../core/HybridMediaEngine';
import { CaptionPhrase, CaptionPresetStyle } from '../modules/captions/DynamicCaptionRenderer';

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
}

interface EditorState {
  projectTitle: string;
  aspectRatio: AspectRatioPreset;
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  zoomLevel: number;
  selectedClipId: string | null;
  captionStyle: CaptionPresetStyle;
  tracks: TrackItem[];
  clips: ClipItem[];
  phrases: CaptionPhrase[];
  engineInstance: HybridMediaEngine | null;

  setProjectTitle: (title: string) => void;
  setEngineInstance: (engine: HybridMediaEngine) => void;
  setAspectRatio: (ratio: AspectRatioPreset) => void;
  togglePlay: () => void;
  seekTo: (time: number) => void;
  setZoomLevel: (zoom: number) => void;
  setSelectedClip: (id: string | null) => void;
  splitClipAtPlayhead: () => void;
  deleteSelectedClip: () => void;
  loadMediaFile: (file: File) => Promise<void>;
  setCaptionPhrases: (phrases: CaptionPhrase[]) => void;
  setCaptionStyle: (style: CaptionPresetStyle) => void;
}

const defaultDemoPhrases: CaptionPhrase[] = [
  {
    id: 'p1',
    startTime: 0,
    endTime: 3.5,
    words: [
      { text: 'EDITA', start: 0.0, end: 0.9 },
      { text: 'Y PUBLICA', start: 0.9, end: 2.1 },
      { text: 'EN UN CLIC', start: 2.1, end: 3.5 },
    ],
  },
  {
    id: 'p2',
    startTime: 3.5,
    endTime: 8.0,
    words: [
      { text: 'DIRECTO A', start: 3.5, end: 4.8 },
      { text: 'TIKTOK', start: 4.8, end: 6.2 },
      { text: 'Y REELS', start: 6.2, end: 8.0 },
    ],
  },
  {
    id: 'p3',
    startTime: 8.0,
    endTime: 15.0,
    words: [
      { text: 'RENDER', start: 8.0, end: 10.0 },
      { text: '60 FPS', start: 10.0, end: 12.0 },
      { text: 'EN GPU', start: 12.0, end: 15.0 },
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
    selectedClipId: 'clip_vid_1',
    captionStyle: 'hormozi',
    engineInstance: null,
    phrases: defaultDemoPhrases,

    tracks: [
      { id: 'track_cap', name: 'Subtítulos IA', type: 'caption' },
      { id: 'track_gfx', name: 'Gráficos / Stickers', type: 'graphic' },
      { id: 'track_vid', name: 'Video Principal', type: 'video' },
      { id: 'track_aud', name: 'Música & Beat Sync', type: 'audio' },
    ],

    clips: [
      {
        id: 'clip_cap_1',
        trackId: 'track_cap',
        name: 'Auto-Captions (Hormozi)',
        type: 'text',
        inPoint: 0,
        outPoint: 15,
        timelineStart: 0,
        duration: 15,
        color: 'bg-purple-600/90 border-purple-400',
      },
      {
        id: 'clip_gfx_1',
        trackId: 'track_gfx',
        name: 'Sticker Flecha CTA',
        type: 'graphic',
        inPoint: 0,
        outPoint: 6,
        timelineStart: 1.5,
        duration: 6,
        color: 'bg-pink-600/90 border-pink-400',
      },
      {
        id: 'clip_vid_1',
        trackId: 'track_vid',
        name: 'Toma_Principal_4K_Proxy.mp4',
        type: 'video',
        inPoint: 0,
        outPoint: 15,
        timelineStart: 0,
        duration: 15,
        color: 'bg-emerald-600/90 border-emerald-400',
      },
      {
        id: 'clip_aud_1',
        trackId: 'track_aud',
        name: 'Phonk_Beat_Trending.wav',
        type: 'audio',
        inPoint: 0,
        outPoint: 15,
        timelineStart: 0,
        duration: 15,
        color: 'bg-amber-600/90 border-amber-400',
      },
    ],

    setProjectTitle: (title) => set({ projectTitle: title }),

    setEngineInstance: (engine) => {
      engine.setPhrases(get().phrases);
      set({ engineInstance: engine });
    },

    setAspectRatio: (ratio) => {
      const engine = get().engineInstance;
      if (engine) engine.setAspectRatio(ratio);
      set({ aspectRatio: ratio });
    },

    togglePlay: () => {
      const nextPlay = !get().isPlaying;
      const engine = get().engineInstance;
      if (engine) {
        if (nextPlay) engine.play();
        else engine.pause();
      }
      set({ isPlaying: nextPlay });
    },

    seekTo: (time) => {
      const clamped = Math.max(0, Math.min(time, get().totalDuration));
      const engine = get().engineInstance;
      if (engine) engine.seek(clamped);
      set({ currentTime: clamped });
    },

    setZoomLevel: (zoom) => set({ zoomLevel: Math.max(20, Math.min(160, zoom)) }),

    setSelectedClip: (id) => set({ selectedClipId: id }),

    splitClipAtPlayhead: () => {
      const { selectedClipId, currentTime, clips } = get();
      const clipIndex = clips.findIndex((c) => c.id === selectedClipId);
      if (clipIndex === -1) return;

      const targetClip = clips[clipIndex];
      const relativeTime = currentTime - targetClip.timelineStart;

      // Solo dividir si el cursor está dentro del rango del clip con un margen mínimo
      if (relativeTime > 0.2 && relativeTime < targetClip.duration - 0.2) {
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

    deleteSelectedClip: () => {
      const { selectedClipId } = get();
      if (!selectedClipId) return;

      set((state) => {
        state.clips = state.clips.filter((c) => c.id !== selectedClipId);
        state.selectedClipId = null;
      });
    },

    loadMediaFile: async (file: File) => {
      const engine = get().engineInstance;
      if (!engine) return;

      const url = URL.createObjectURL(file);
      try {
        const videoDuration = await engine.setVideoSource(url);
        const roundedDuration = Math.max(5, Math.round(videoDuration));

        set((state) => {
          state.totalDuration = roundedDuration;
          const existingVid = state.clips.find((c) => c.trackId === 'track_vid');
          if (existingVid) {
            existingVid.name = file.name;
            existingVid.duration = roundedDuration;
            existingVid.outPoint = roundedDuration;
            existingVid.src = url;
          }
        });
      } catch (err) {
        console.error('Error cargando archivo:', err);
      }
    },

    setCaptionPhrases: (phrases) => {
      const engine = get().engineInstance;
      if (engine) engine.setPhrases(phrases);

      const maxEndTime = phrases.length > 0 ? phrases[phrases.length - 1].endTime : 15;

      set((state) => {
        state.phrases = phrases;
        const capClip = state.clips.find((c) => c.trackId === 'track_cap');
        if (capClip) {
          capClip.duration = maxEndTime;
          capClip.outPoint = maxEndTime;
        }
      });
    },

    setCaptionStyle: (style) => {
      const engine = get().engineInstance;
      if (engine) engine.setCaptionStyle(style);
      set({ captionStyle: style });
    },
  }))
);

