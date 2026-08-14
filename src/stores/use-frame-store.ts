import { create } from "zustand";
import { persist } from "zustand/middleware";
import { migrateFrames } from "@/lib/frame-migrate";
import type { Frame, CreateFrameInput } from "@/lib/schemas";

interface FrameState {
  frames: Frame[];
  selectedFrameId: string | null;

  getFramesByProject: (projectId: string) => Frame[];
  /** 某一集的分鏡;`order` 仍是專案內的鏡號,不重新編號 */
  getFramesByEpisode: (episodeId: string) => Frame[];
  getFrame: (id: string) => Frame | undefined;
  setSelectedFrameId: (id: string | null) => void;

  addFrame: (projectId: string, input?: Partial<CreateFrameInput>) => Frame;
  appendFrames: (projectId: string, inputs: Partial<CreateFrameInput>[]) => Frame[];
  insertFrameAfter: (afterFrameId: string, input?: Partial<CreateFrameInput>) => Frame;
  importFrames: (frames: Frame[]) => void;
  updateFrame: (id: string, data: Partial<Frame>) => void;
  /**
   * 標記某一格的圖有變動(D4)。`hasImage` 一併設定,`imageVersion` 遞增 ——
   * 所有透過 `useImageStorage` 讀圖的地方都會因為版本號改變而重載。
   */
  bumpImageVersion: (id: string, hasImage: boolean) => void;
  deleteFrame: (id: string) => void;
  deleteFramesByProject: (projectId: string) => void;
  /** 刪除季/集後把指向它們的分鏡改回「未指定」,不刪分鏡也不留斷掉的參照 */
  clearEpisodeAssignments: (episodeIds: string[]) => void;
  reorderFrames: (projectId: string, orderedIds: string[]) => void;
  splitFrame: (frameId: string, dialogueSegments: string[]) => number;
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

      getFramesByEpisode: (episodeId) => {
        return get()
          .frames.filter((f) => f.episodeId === episodeId)
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
          hasImage: false,
          imageVersion: 0,
        };
        set((state) => ({ frames: [...state.frames, frame] }));
        return frame;
      },

      appendFrames: (projectId, inputs) => {
        const start = get().getFramesByProject(projectId).length;
        const newFrames: Frame[] = inputs.map((input, i) => ({
          id: crypto.randomUUID(),
          projectId,
          order: start + i,
          prompt: input.prompt ?? "",
          dialogue: input.dialogue ?? "",
          speaker: input.speaker ?? "",
          cameraMovement: input.cameraMovement ?? "Fixed",
          duration: input.duration ?? 8,
          style: input.style ?? "Cinematic",
          mood: input.mood ?? "Moody/Dramatic",
          hasImage: false,
          imageVersion: 0,
        }));
        set((state) => ({ frames: [...state.frames, ...newFrames] }));
        return newFrames;
      },

      insertFrameAfter: (afterFrameId, input) => {
        const afterFrame = get().getFrame(afterFrameId);
        if (!afterFrame) return get().addFrame("", input);

        const newOrder = afterFrame.order + 1;
        const frame: Frame = {
          id: crypto.randomUUID(),
          projectId: afterFrame.projectId,
          order: newOrder,
          prompt: input?.prompt ?? "",
          dialogue: input?.dialogue ?? "",
          speaker: input?.speaker ?? "",
          cameraMovement: input?.cameraMovement ?? afterFrame.cameraMovement,
          duration: input?.duration ?? afterFrame.duration,
          style: input?.style ?? afterFrame.style,
          mood: input?.mood ?? afterFrame.mood,
          hasImage: false,
          imageVersion: 0,
        };

        set((state) => ({
          frames: [
            ...state.frames.map((f) => {
              if (f.projectId === afterFrame.projectId && f.order >= newOrder) {
                return { ...f, order: f.order + 1 };
              }
              return f;
            }),
            frame,
          ],
        }));
        return frame;
      },

      importFrames: (newFrames) => {
        if (newFrames.length === 0) return;
        const projectId = newFrames[0].projectId;
        set((state) => ({
          frames: [
            ...state.frames.filter((f) => f.projectId !== projectId),
            ...newFrames,
          ],
        }));
      },

      updateFrame: (id, data) => {
        set((state) => ({
          frames: state.frames.map((f) =>
            f.id === id ? { ...f, ...data } : f
          ),
        }));
      },

      bumpImageVersion: (id, hasImage) => {
        set((state) => ({
          frames: state.frames.map((f) =>
            f.id === id
              ? { ...f, hasImage, imageVersion: (f.imageVersion ?? 0) + 1 }
              : f
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

      clearEpisodeAssignments: (episodeIds) => {
        if (episodeIds.length === 0) return;
        const targets = new Set(episodeIds);
        set((state) => ({
          frames: state.frames.map((f) =>
            f.episodeId && targets.has(f.episodeId)
              ? { ...f, episodeId: undefined }
              : f
          ),
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

      splitFrame: (frameId, dialogueSegments) => {
        const original = get().getFrame(frameId);
        if (!original || dialogueSegments.length < 2) return 0;

        const newFrames: Frame[] = dialogueSegments.map((seg, i) => ({
          id: crypto.randomUUID(),
          projectId: original.projectId,
          order: original.order + i,
          prompt: original.prompt,
          dialogue: seg,
          speaker: original.speaker,
          cameraMovement: original.cameraMovement,
          duration: 8,
          style: original.style,
          mood: original.mood,
          // 拆鏡產生的新分鏡不繼承原鏡的圖 —— 畫面內容已經不同了
          hasImage: false,
          imageVersion: 0,
        }));

        const shiftAmount = newFrames.length - 1;

        set((state) => ({
          frames: [
            ...state.frames
              .filter((f) => f.id !== frameId)
              .map((f) => {
                if (f.projectId === original.projectId && f.order > original.order) {
                  return { ...f, order: f.order + shiftAmount };
                }
                return f;
              }),
            ...newFrames,
          ],
        }));

        return newFrames.length;
      },
    }),
    {
      name: "frameforge-frames",
      partialize: (state) => ({ frames: state.frames }),
      version: 1,
      /**
       * v0 → v1:`imageBase64Key` 拆成 `hasImage` + `imageVersion`(技術債 D3)。
       *
       * 換算邏輯在 `lib/frame-migrate.ts`,**與備份還原共用同一份** ——
       * 兩邊各寫一次的話,匯入舊備份會走到沒遷移的那條路。
       *
       * `partialize` 只存 frames,所以這裡收到的 state 只有那一個欄位。
       */
      migrate: (persisted, version) => {
        const state = persisted as { frames?: unknown };
        if (version === 0) {
          return { frames: migrateFrames(state?.frames) };
        }
        return state as { frames: Frame[] };
      },
    }
  )
);
