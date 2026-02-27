"use client";

import { useMutation } from "@tanstack/react-query";
import { generateImage, type GenerateImageInput } from "@/actions/generate-image";

export function useGenerateImage() {
  return useMutation({
    mutationFn: async (input: GenerateImageInput) => {
      const result = await generateImage(input);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
  });
}
