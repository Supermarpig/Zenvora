"use client";

import { useState, useEffect, useCallback } from "react";
import { saveImage, loadImage, deleteImage } from "@/lib/db";
import { useFrameStore } from "@/stores/use-frame-store";

/**
 * 讀寫某一格的分鏡圖。
 *
 * **版本號從 store 讀,不再由呼叫方傳 `revalidateKey`**(技術債 D4)。
 * 先前外部直接寫 IndexedDB(九宮格切圖)之後,每個顯示圖片的地方都得自己
 * 記得傳一個會變動的值進來,漏傳就停在舊畫面 —— 那是把「快取失效」的責任
 * 分散給每個呼叫端。現在切圖只要 bump `frame.imageVersion`,所有讀圖的地方
 * 都會自己重載。
 */
export function useImageStorage(frameId: string | undefined) {
  const imageVersion = useFrameStore((s) =>
    frameId ? s.frames.find((f) => f.id === frameId)?.imageVersion ?? 0 : 0
  );
  const bumpVersion = useFrameStore((s) => s.bumpImageVersion);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const p = frameId
      ? loadImage(frameId)
      : Promise.resolve<string | undefined>(undefined);
    p.then((data) => {
      if (alive) setImageData(data ?? null);
    })
      .catch(() => {
        if (alive) setImageData(null);
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [frameId, imageVersion]);

  const save = useCallback(
    async (base64: string) => {
      if (!frameId) return;
      await saveImage(frameId, base64);
      setImageData(base64);
      // 讓其他讀同一格的地方(畫布節點、提示詞總表)也跟著更新
      bumpVersion(frameId, true);
    },
    [frameId, bumpVersion]
  );

  const remove = useCallback(async () => {
    if (!frameId) return;
    await deleteImage(frameId);
    setImageData(null);
    bumpVersion(frameId, false);
  }, [frameId, bumpVersion]);

  return { imageData, isLoading, save, remove };
}
