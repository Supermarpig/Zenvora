import { CAMERA_MOVEMENTS, VISUAL_STYLES, MOOD_OPTIONS } from "./schemas";

export const cameraOptions = CAMERA_MOVEMENTS.map((value) => ({
  value,
  label: value,
}));

export const styleOptions = VISUAL_STYLES.map((value) => ({
  value,
  label: value,
}));

export const moodOptions = MOOD_OPTIONS.map((value) => ({
  value,
  label: value,
}));

export const modelOptions = [
  { value: "gemini-2.5-flash-image", label: "Flash (2 credits)", credits: 2 },
  { value: "gemini-2.5-flash-image-hd", label: "Flash HD (5 credits)", credits: 5 },
  { value: "gemini-3-pro-image-preview", label: "Pro (10 credits)", credits: 10 },
  { value: "gemini-3-pro-image-preview-2k", label: "Pro 2K (10 credits)", credits: 10 },
  { value: "gemini-3-pro-image-preview-4k", label: "Pro 4K (20 credits)", credits: 20 },
] as const;

export const imageSizeOptions = [
  { value: "16:9", label: "16:9（橫向）" },
  { value: "9:16", label: "9:16（直向）" },
  { value: "1:1", label: "1:1（正方）" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "3:2", label: "3:2" },
  { value: "2:3", label: "2:3" },
] as const;
