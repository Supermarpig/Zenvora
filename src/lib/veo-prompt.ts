import type { Frame } from "./schemas";

export function buildVeoPrompt(frame: Frame): string {
  const parts: string[] = [];

  parts.push(frame.prompt);

  if (frame.cameraMovement !== "Fixed") {
    parts.push(`${frame.cameraMovement.toLowerCase()} camera movement`);
  }

  parts.push(`${frame.style} style, ${frame.mood} atmosphere`);

  if (frame.speaker && frame.dialogue) {
    parts.push(`${frame.speaker} says aloud: "${frame.dialogue}"`);
  } else if (frame.dialogue) {
    parts.push(`A voice says: "${frame.dialogue}"`);
  }

  return parts.join(". ") + ".";
}
