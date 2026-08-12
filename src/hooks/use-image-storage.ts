"use client";

import { useState, useEffect, useCallback } from "react";
import { saveImage, loadImage, deleteImage } from "@/lib/db";

export function useImageStorage(frameId: string | undefined) {
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
  }, [frameId]);

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
