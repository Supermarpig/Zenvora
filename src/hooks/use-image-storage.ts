"use client";

import { useState, useEffect, useCallback } from "react";
import { saveImage, loadImage, deleteImage } from "@/lib/db";

export function useImageStorage(frameId: string | undefined) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!frameId) {
      setImageData(null);
      return;
    }

    setIsLoading(true);
    loadImage(frameId)
      .then((data) => setImageData(data ?? null))
      .catch(() => setImageData(null))
      .finally(() => setIsLoading(false));
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
