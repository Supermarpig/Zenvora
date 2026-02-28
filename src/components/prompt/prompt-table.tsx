"use client";

import { PromptRow } from "./prompt-row";
import type { Frame } from "@/lib/schemas";

interface PromptTableProps {
  frames: Frame[];
}

export function PromptTable({ frames }: PromptTableProps) {
  if (frames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-lg font-medium">尚無分鏡</p>
        <p className="text-muted-foreground">
          請先回到畫布新增分鏡並填寫場景描述
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {frames.map((frame) => (
        <PromptRow key={frame.id} frame={frame} />
      ))}
    </div>
  );
}
