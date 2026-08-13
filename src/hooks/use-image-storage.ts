"use client";

import { useState, useEffect, useCallback } from "react";
import { saveImage, loadImage, deleteImage } from "@/lib/db";

/**
 * @param revalidateKey 外部直接寫入 IndexedDB(例如九宮格切圖)時,傳入會變動的值
 *   讓這個 hook 重新載入;只靠 frameId 的話畫面會停在舊狀態。
 */
export function useImageStorage(
  frameId: string | undefined,
  revalidateKey?: string
) {
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
  }, [frameId, revalidateKey]);

  const save = useCallback(
    async (base64: string) => {
      if (!frameId) return;
      await saveImage(frameId, base64);
      setImageData(base64);
    },
    [frameId]
  );

  const remove = useCallback(async () => {
    if (!frameId) return;
    await deleteImage(frameId);
    setImageData(null);
  }, [frameId]);

  return { imageData, isLoading, save, remove };
}
