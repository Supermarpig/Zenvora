"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useFrameStore } from "@/stores/use-frame-store";
import {
  CAMERA_MOVEMENTS,
  VISUAL_STYLES,
  MOOD_OPTIONS,
} from "@/lib/schemas";

/**
 * 匯入分鏡 JSON(「導出剪映」的反向操作)。
 *
 * 接受三種形狀:director spec 的 `zenvoraFrames`、`frames`,或直接是陣列。
 * 只做「附加」不做取代,避免誤刪現有分鏡。
 */
const importFrameSchema = z.object({
  order: z.number().optional(),
  prompt: z.string().min(1, "prompt 不可為空"),
  dialogue: z.string().optional(),
  speaker: z.string().optional(),
  cameraMovement: z.enum(CAMERA_MOVEMENTS).optional(),
  duration: z.number().min(4).max(15).optional(),
  style: z.enum(VISUAL_STYLES).optional(),
  mood: z.enum(MOOD_OPTIONS).optional(),
});

function extractList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.zenvoraFrames)) return obj.zenvoraFrames;
    if (Array.isArray(obj.frames)) return obj.frames;
  }
  throw new Error("找不到分鏡陣列(需要 zenvoraFrames、frames,或檔案本身是陣列)");
}

export function ImportJsonButton({ projectId }: { projectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const appendFrames = useFrameStore((s) => s.appendFrames);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 先清掉 value,同一個檔案連選兩次才會再觸發 change
    e.target.value = "";
    if (!file) return;

    setIsImporting(true);
    try {
      const list = extractList(JSON.parse(await file.text()));
      if (list.length === 0) {
        toast.info("檔案裡沒有分鏡");
        return;
      }

      const parsed = z.array(importFrameSchema).safeParse(list);
      if (!parsed.success) {
        // 整批拒絕而非部分匯入,避免留下半殘狀態
        const issue = parsed.error.issues[0];
        const at = issue.path[0];
        throw new Error(
          `第 ${typeof at === "number" ? at + 1 : "?"} 筆的 ${issue.path.slice(1).join(".") || "資料"} 不合法:${issue.message}`
        );
      }

      // appendFrames 會自行接續 order,傳入前先照檔案的 order 排好
      const sorted = [...parsed.data].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      appendFrames(
        projectId,
        sorted.map((f) => ({
          prompt: f.prompt,
          dialogue: f.dialogue,
          speaker: f.speaker,
          cameraMovement: f.cameraMovement,
          duration: f.duration,
          style: f.style,
          mood: f.mood,
        }))
      );

      toast.success(`已匯入 ${sorted.length} 個分鏡`);
    } catch (err) {
      toast.error(
        `匯入失敗:${err instanceof Error ? err.message : "檔案不是合法 JSON"}`
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isImporting}
      >
        {isImporting ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <FileUp className="mr-1.5 h-4 w-4" />
        )}
        {isImporting ? "匯入中" : "匯入 JSON"}
      </Button>
    </>
  );
}
