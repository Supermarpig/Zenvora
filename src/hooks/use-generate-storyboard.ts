"use client";

import { useMutation } from "@tanstack/react-query";
import {
  generateStoryboard,
  type GenerateStoryboardInput,
} from "@/actions/generate-storyboard";

export function useGenerateStoryboard() {
  return useMutation({
    mutationFn: async (input: GenerateStoryboardInput) => {
      const result = await generateStoryboard(input);
      if (!result.success) throw new Error(result.error);
      return result.shots;
    },
  });
}
