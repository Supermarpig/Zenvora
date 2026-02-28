import { CAMERA_MOVEMENTS, VISUAL_STYLES, MOOD_OPTIONS } from "./schemas";

const CAMERA_LABELS: Record<string, string> = {
  "Fixed": "Fixed 固定",
  "Pan Left": "Pan Left 左搖",
  "Pan Right": "Pan Right 右搖",
  "Zoom In": "Zoom In 推近",
  "Zoom Out": "Zoom Out 拉遠",
  "Tracking Shot": "Tracking 跟拍",
  "Orbit": "Orbit 環繞",
  "Aerial/Drone": "Aerial 空拍",
  "Handheld": "Handheld 手持",
  "Dolly Zoom": "Dolly Zoom 推軌變焦",
  "Crane Shot": "Crane 搖臂",
  "Follow Shot": "Follow 跟隨",
};

export const cameraOptions = CAMERA_MOVEMENTS.map((value) => ({
  value,
  label: CAMERA_LABELS[value] ?? value,
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

export const durationOptions = [
  { value: 5, label: "5s" },
  { value: 8, label: "8s" },
  { value: 10, label: "10s" },
  { value: 15, label: "15s" },
] as const;
