"use server";

import { z } from "zod";
import { getProvider, getProviderForModel, getModelOption } from "@/lib/video";
import type { VideoJobState } from "@/lib/video/types";

const generateVideoInputSchema = z.object({
  mode: z.enum(["t2v", "i2v"]).default("i2v"),
  prompt: z.string().min(1, "請提供影片描述"),
  imageDataUrl: z.string().optional(),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  durationSec: z.number().min(2).max(15).default(8),
  withAudio: z.boolean().default(false),
  model: z.string().default("veo-3.1-generate-preview"),
});

export type GenerateVideoInput = z.infer<typeof generateVideoInputSchema>;

export type SubmitVideoResult =
  | { success: true; providerJobId: string; providerId: string; creditCost: number }
  | { success: false; error: string };

export async function generateVideo(
  input: GenerateVideoInput
): Promise<SubmitVideoResult> {
  const parsed = generateVideoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  try {
    const provider = getProviderForModel(data.model);
    const { providerJobId } = await provider.submit({
      mode: data.mode,
      prompt: data.prompt,
      imageDataUrl: data.imageDataUrl,
      aspectRatio: data.aspectRatio,
      durationSec: data.durationSec,
      withAudio: data.withAudio,
      model: data.model,
    });
    return {
      success: true,
      providerJobId,
      providerId: provider.id,
      creditCost: getModelOption(data.model)?.creditCost ?? 0,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "送出影片任務失敗",
    };
  }
}

export type PollVideoResult =
  | { success: true; job: VideoJobState }
  | { success: false; error: string };

export async function getVideoJob(
  providerId: string,
  providerJobId: string
): Promise<PollVideoResult> {
  try {
    const provider = getProvider(providerId || "veo");
    const job = await provider.poll(providerJobId);
    return { success: true, job };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "輪詢失敗",
    };
  }
}
