import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CharacterAsset,
  CreateCharacterAssetInput,
} from "@/lib/schemas";
import { deleteAssetImage } from "@/lib/db";

interface CharacterAssetState {
  assets: CharacterAsset[];

  getAsset: (id: string) => CharacterAsset | undefined;
  getAssets: (ids: string[]) => CharacterAsset[];

  addAsset: (input: CreateCharacterAssetInput) => CharacterAsset;
  updateAsset: (id: string, data: Partial<CharacterAsset>) => void;
  deleteAsset: (id: string) => void;

  setReferenceImages: (id: string, keys: string[]) => void;
}

export const useCharacterAssetStore = create<CharacterAssetState>()(
  persist(
    (set, get) => ({
      assets: [],

      getAsset: (id) => get().assets.find((a) => a.id === id),

      getAssets: (ids) => {
        const map = new Map(get().assets.map((a) => [a.id, a]));
        return ids
          .map((id) => map.get(id))
          .filter((a): a is CharacterAsset => !!a);
      },

      addAsset: (input) => {
        const now = new Date().toISOString();
        const asset: CharacterAsset = {
          id: crypto.randomUUID(),
          name: input.name,
          kind: input.kind ?? "character",
          type: input.type ?? "actor",
          ownerAssetId: input.ownerAssetId,
          appearance: input.appearance,
          referenceImageKeys: [],
          tags: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ assets: [...state.assets, asset] }));
        return asset;
      },

      updateAsset: (id, data) => {
        set((state) => ({
          assets: state.assets.map((a) =>
            a.id === id
              ? { ...a, ...data, updatedAt: new Date().toISOString() }
              : a
          ),
        }));
      },

      deleteAsset: (id) => {
        const asset = get().getAsset(id);
        // 清掉 IndexedDB 裡的參考圖(fire-and-forget)
        asset?.referenceImageKeys.forEach((k) => {
          void deleteAssetImage(k);
        });
        set((state) => ({ assets: state.assets.filter((a) => a.id !== id) }));
      },

      setReferenceImages: (id, keys) => {
        set((state) => ({
          assets: state.assets.map((a) =>
            a.id === id
              ? {
                  ...a,
                  referenceImageKeys: keys,
                  updatedAt: new Date().toISOString(),
                }
              : a
          ),
        }));
      },
    }),
    {
      name: "frameforge-character-assets",
      partialize: (state) => ({ assets: state.assets }),
      version: 1,
      /**
       * v0 的每一筆都是人物資產(當時還沒有 kind 這個維度),補上 kind。
       *
       * 注意 partialize 只存 assets,所以這裡收到的 state 只有那一個欄位,
       * 不要去碰其他東西。persist 的 name 也刻意不改 —— 改了等於使用者資料消失。
       */
      migrate: (persisted, version) => {
        const state = persisted as { assets?: CharacterAsset[] };
        if (version === 0 && Array.isArray(state?.assets)) {
          return {
            assets: state.assets.map((a) => ({
              ...a,
              kind: a.kind ?? ("character" as const),
            })),
          };
        }
        return state;
      },
    }
  )
);
