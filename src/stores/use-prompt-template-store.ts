import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PromptTemplateId } from "@/lib/prompt-template";

/**
 * Prompt 模板覆寫與版本歷史。
 *
 * store 只存「使用者改過的」模板 —— 沒改過的鍵根本不存在,由 code 裡的內建
 * 模板接手。所以不需要初始化資料,內建模板也能隨版本更新生效。
 */
export interface PromptTemplateVersion {
  id: string;
  templateId: PromptTemplateId;
  body: string;
  savedAt: string;
}

/** 每個模板保留的歷史筆數,超過丟最舊的 —— 避免 localStorage 無限長大 */
const MAX_VERSIONS_PER_TEMPLATE = 20;

interface PromptTemplateState {
  overrides: Partial<Record<PromptTemplateId, string>>;
  versions: PromptTemplateVersion[];

  setTemplate: (id: PromptTemplateId, body: string) => void;
  revertToBuiltIn: (id: PromptTemplateId) => void;
  rollback: (versionId: string) => void;
  versionsOf: (id: PromptTemplateId) => PromptTemplateVersion[];
}

export const usePromptTemplateStore = create<PromptTemplateState>()(
  persist(
    (set, get) => ({
      overrides: {},
      versions: [],

      setTemplate: (id, body) => {
        const trimmed = body.trim();
        // 存成空字串等同還原內建,不要留一個空覆寫在那裡
        if (!trimmed) {
          get().revertToBuiltIn(id);
          return;
        }

        set((state) => {
          // 內容沒變就不新增版本,否則按幾次儲存就塞滿歷史
          if (state.overrides[id] === trimmed) return state;

          const entry: PromptTemplateVersion = {
            id: crypto.randomUUID(),
            templateId: id,
            body: trimmed,
            savedAt: new Date().toISOString(),
          };
          const sameTemplate = state.versions.filter((v) => v.templateId === id);
          const others = state.versions.filter((v) => v.templateId !== id);
          const kept = [entry, ...sameTemplate].slice(
            0,
            MAX_VERSIONS_PER_TEMPLATE
          );

          return {
            overrides: { ...state.overrides, [id]: trimmed },
            versions: [...others, ...kept],
          };
        });
      },

      revertToBuiltIn: (id) =>
        set((state) => {
          const next = { ...state.overrides };
          delete next[id];
          // 版本歷史刻意保留 —— 還原之後可能想再撿回某個舊版
          return { overrides: next };
        }),

      rollback: (versionId) => {
        const version = get().versions.find((v) => v.id === versionId);
        if (!version) return;
        set((state) => ({
          overrides: { ...state.overrides, [version.templateId]: version.body },
        }));
      },

      versionsOf: (id) =>
        get()
          .versions.filter((v) => v.templateId === id)
          .sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
    }),
    { name: "frameforge-prompt-templates" }
  )
);
