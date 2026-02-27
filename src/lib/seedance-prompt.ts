import type { Frame } from "./schemas";

export function buildSeedancePrompt(frame: Frame): string {
  const parts: string[] = [];

  parts.push(frame.prompt);

  if (frame.speaker && frame.dialogue) {
    parts.push(`${frame.speaker} says: "${frame.dialogue}"`);
  } else if (frame.dialogue) {
    parts.push(`Speaking: "${frame.dialogue}"`);
  }

  parts.push(`${frame.style} style`);
  parts.push(`${frame.mood} atmosphere`);
  parts.push(frame.cameraMovement.toLowerCase());
  parts.push(`${frame.duration}s`);

  return parts.join(", ") + ".";
}
