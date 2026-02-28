import type { Frame } from "./schemas";

type GridSize = 9 | 25;

export function buildGridPrompt(frames: Frame[], gridSize: GridSize = 9): string {
  const cols = gridSize === 9 ? 3 : 5;
  const rows = gridSize === 9 ? 3 : 5;
  const total = Math.min(frames.length, gridSize);
  const selected = frames.slice(0, total);

  const panelLines = selected.map((f, i) => {
    const num = i + 1;
    const speaker = f.speaker ? ` (${f.speaker})` : "";
    return `Panel ${num}: ${f.prompt}${speaker}, ${f.cameraMovement.toLowerCase()}, ${f.style}, ${f.mood}`;
  });

  return [
    `Generate EXACTLY ONE image: a ${cols}x${rows} grid of ${total} cinematic storyboard panels.`,
    `Keep the original scene style consistent across all panels. Shoot a set of ${total}-panel storyboard photography images. Each panel must be unique with narrative flow and visual continuity.`,
    `Each panel ratio: 16:9. Panels are tightly adjacent with NO borders, NO gaps, NO white space between them. 4K high-definition quality.`,
    `Do NOT add any text, subtitles, numbers, labels, captions, or speech bubbles anywhere in the image. Pure visual only.`,
    ``,
    `Character Reference: The characters must match the appearance of the person(s) in the uploaded reference photo exactly — same face, hairstyle, body proportions, and clothing. Maintain identical character appearance across all ${total} panels.`,
    ``,
    ...panelLines,
    ``,
    `Critical rules:`,
    `- ONE single composited image, NOT ${total} separate images.`,
    `- Each panel must show a clearly different camera angle, distance, or composition.`,
    `- Vary between: extreme wide, wide, medium, medium close-up, close-up, extreme close-up, low angle, high angle, over-the-shoulder, bird's eye, dutch angle.`,
    `- No two adjacent panels should have the same framing.`,
    `- The sequence must feel like keyframes from a continuous video — with narrative progression and emotional arc.`,
    `- Absolutely NO text or labels of any kind in the final image.`,
  ].join("\n");
}

export function buildFrameGridPrompt(frame: Frame): string {
  return buildGridPrompt([frame], 9);
}
