"use client";

import { toast } from "sonner";
import { Copy } from "lucide-react";
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
  async function handleCopyAll() {
    const allPrompts = frames
      .map((f, i) => `[分鏡 ${i + 1}] ${buildSeedancePrompt(f)}`)
      .join("\n\n");
    await navigator.clipboard.writeText(allPrompts);
    toast.success(`已複製 ${frames.length} 筆提示詞`);
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
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleCopyAll}>
          <Copy className="mr-1.5 h-4 w-4" />
          一鍵複製全部
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead className="w-24">縮圖</TableHead>
              <TableHead>Seedance 提示詞</TableHead>
              <TableHead className="w-16 text-center">時長</TableHead>
              <TableHead className="w-12" />
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
