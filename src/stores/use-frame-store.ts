import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Frame, CreateFrameInput } from "@/lib/schemas";

interface FrameState {
  frames: Frame[];
  selectedFrameId: string | null;

  getFramesByProject: (projectId: string) => Frame[];
  getFrame: (id: string) => Frame | undefined;
  setSelectedFrameId: (id: string | null) => void;

  addFrame: (projectId: string, input?: Partial<CreateFrameInput>) => Frame;
  importFrames: (frames: Frame[]) => void;
  updateFrame: (id: string, data: Partial<Frame>) => void;
  deleteFrame: (id: string) => void;
  deleteFramesByProject: (projectId: string) => void;
  reorderFrames: (projectId: string, orderedIds: string[]) => void;
}

export const useFrameStore = create<FrameState>()(
  persist(
    (set, get) => ({
      frames: [],
      selectedFrameId: null,

      getFramesByProject: (projectId) => {
        return get()
          .frames.filter((f) => f.projectId === projectId)
          .sort((a, b) => a.order - b.order);
      },

      getFrame: (id) => {
        return get().frames.find((f) => f.id === id);
      },

      setSelectedFrameId: (id) => {
        set({ selectedFrameId: id });
      },

      addFrame: (projectId, input) => {
        const existing = get().getFramesByProject(projectId);
        const frame: Frame = {
          id: crypto.randomUUID(),
          projectId,
          order: existing.length,
          prompt: input?.prompt ?? "",
          dialogue: input?.dialogue ?? "",
          speaker: input?.speaker ?? "",
          cameraMovement: input?.cameraMovement ?? "Fixed",
          duration: input?.duration ?? 8,
          style: input?.style ?? "Cinematic",
          mood: input?.mood ?? "Moody/Dramatic",
        };
        set((state) => ({ frames: [...state.frames, frame] }));
        return frame;
      },

      importFrames: (newFrames) => {
        set((state) => {
          const existingIds = new Set(state.frames.map((f) => f.id));
          const toAdd = newFrames.filter((f) => !existingIds.has(f.id));
          return { frames: [...state.frames, ...toAdd] };
        });
      },

      updateFrame: (id, data) => {
        set((state) => ({
          frames: state.frames.map((f) =>
            f.id === id ? { ...f, ...data } : f
          ),
        }));
      },

      deleteFrame: (id) => {
        const frame = get().getFrame(id);
        if (!frame) return;

        set((state) => {
          const remaining = state.frames
            .filter((f) => f.id !== id)
            .map((f) => {
              if (f.projectId === frame.projectId && f.order > frame.order) {
                return { ...f, order: f.order - 1 };
              }
              return f;
            });
          return {
            frames: remaining,
            selectedFrameId:
              state.selectedFrameId === id ? null : state.selectedFrameId,
          };
        });
      },

      deleteFramesByProject: (projectId) => {
        set((state) => ({
          frames: state.frames.filter((f) => f.projectId !== projectId),
        }));
      },

      reorderFrames: (projectId, orderedIds) => {
        set((state) => ({
          frames: state.frames.map((f) => {
            if (f.projectId !== projectId) return f;
            const newOrder = orderedIds.indexOf(f.id);
            return newOrder !== -1 ? { ...f, order: newOrder } : f;
          }),
        }));
      },
    }),
    {
      name: "frameforge-frames",
      partialize: (state) => ({ frames: state.frames }),
    }
  )
);
