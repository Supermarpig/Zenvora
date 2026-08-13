import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CustomModel } from "@/lib/schemas";

/**
 * 模型設定。**只存 model id 與標籤,不存任何 API 金鑰** —— 見 schemas.ts 的
 * modelConfigSchema 註解。
 *
 * 空字串代表「用內建預設」,所以沒設定過的使用者行為完全不變,
 * 而內建預設也能隨版本更新生效。
 */
interface ModelConfigState {
  imageModel: string;
  videoModel: string;
  customImageModels: CustomModel[];

  setImageModel: (id: string) => void;
  setVideoModel: (id: string) => void;
  addCustomImageModel: (model: CustomModel) => void;
  removeCustomImageModel: (id: string) => void;
  reset: () => void;
}

export const useModelConfigStore = create<ModelConfigState>()(
  persist(
    (set) => ({
      imageModel: "",
      videoModel: "",
      customImageModels: [],

      setImageModel: (id) => set({ imageModel: id }),
      setVideoModel: (id) => set({ videoModel: id }),

      addCustomImageModel: (model) =>
        set((state) => ({
          // 同 id 視為更新,避免重複
          customImageModels: [
            ...state.customImageModels.filter((m) => m.id !== model.id),
            model,
          ],
        })),

      removeCustomImageModel: (id) =>
        set((state) => ({
          customImageModels: state.customImageModels.filter((m) => m.id !== id),
          // 若刪掉的正是當前選用的模型,退回內建預設
          imageModel: state.imageModel === id ? "" : state.imageModel,
        })),

      reset: () => set({ imageModel: "", videoModel: "", customImageModels: [] }),
    }),
    { name: "frameforge-model-config" }
  )
);
