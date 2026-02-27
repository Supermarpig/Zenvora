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
  { value: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash（快速）" },
  { value: "gemini-3-pro-image-preview", label: "Gemini 3 Pro（高品質）" },
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
