"use client";

import { toast } from "sonner";
import { Copy, ImageIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PromptRow } from "./prompt-row";
import { buildSeedancePrompt } from "@/lib/seedance-prompt";
import type { Frame } from "@/lib/schemas";

interface PromptTableProps {
  frames: Frame[];
}

export function PromptTable({ frames }: PromptTableProps) {
  async function handleCopyAllImagePrompts() {
    const all = frames
      .map((f, i) => `[分鏡 ${i + 1}]\n${f.prompt}`)
      .join("\n\n");
    await navigator.clipboard.writeText(all);
    toast.success(`已複製 ${frames.length} 筆生圖提示詞`);
  }

  async function handleCopyAllSeedance() {
    const all = frames
      .map((f, i) => `[分鏡 ${i + 1}]\n${buildSeedancePrompt(f)}`)
      .join("\n\n");
    await navigator.clipboard.writeText(all);
    toast.success(`已複製 ${frames.length} 筆 Seedance 提示詞`);
  }

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
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCopyAllImagePrompts}>
          <ImageIcon className="mr-1.5 h-4 w-4" />
          複製全部生圖 Prompt
        </Button>
        <Button variant="outline" onClick={handleCopyAllSeedance}>
          <Copy className="mr-1.5 h-4 w-4" />
          複製全部 Seedance
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead className="w-24">縮圖</TableHead>
              <TableHead>內容</TableHead>
              <TableHead className="w-20 text-center">設定</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {frames.map((frame) => (
              <PromptRow key={frame.id} frame={frame} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
