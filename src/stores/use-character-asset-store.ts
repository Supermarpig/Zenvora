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
          type: input.type ?? "actor",
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
    }
  )
);
