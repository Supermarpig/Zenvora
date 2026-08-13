"use client";

import { useRef, useState } from "react";
import { Grid3X3, ImageDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFrameStore } from "@/stores/use-frame-store";
import { useProjectStore } from "@/stores/use-project-store";
import { saveImage } from "@/lib/db";
import { splitGrid, fileToDataUrl } from "@/lib/grid-split";
import { buildGridPrompt } from "@/lib/storyboard-prompt";
import type { Frame } from "@/lib/schemas";

const GRID_COLS = 3;
const GRID_ROWS = 3;
const PANEL_COUNT = GRID_COLS * GRID_ROWS;

/**
 * 連續九宮格工作流:一次生圖換九格畫面。
 *
 * 跟每列那顆「9 宮格 Prompt」不同 —— 那個是同一個分鏡的九種鏡位(挑鏡用),
 * 這裡是九個「不同分鏡」各佔一格,所以切開後可以依序填回去。
 */
export function GridSequenceTools({
  projectId,
  frames,
}: {
  projectId: string;
  frames: Frame[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const updateFrame = useFrameStore((s) => s.updateFrame);
  const project = useProjectStore((s) => s.getProject(projectId));

  const targets = frames.slice(0, PANEL_COUNT);

  async function handleCopyPrompt() {
    if (frames.length < PANEL_COUNT) {
      toast.error(
        `需要至少 ${PANEL_COUNT} 個分鏡（目前 ${frames.length} 個），九宮格才填得滿`
      );
      return;
    }
    const prompt = buildGridPrompt(targets, 9, project?.characters ?? []);
    await navigator.clipboard.writeText(prompt);
    toast.success(`已複製分鏡 1–${PANEL_COUNT} 的連續九宮格 Prompt`);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 先清 value,同一個檔案連選兩次才會再觸發 change
    e.target.value = "";
    if (!file) return;

    if (targets.length === 0) {
      toast.info("尚無分鏡可填入");
      return;
    }

    setIsImporting(true);
    try {
      const cells = await splitGrid(
        await fileToDataUrl(file),
        GRID_COLS,
        GRID_ROWS
      );

      // imageBase64Key 全專案只當「有沒有圖」的標記(實際讀取都走 loadImage(frame.id)),
      // 所以帶上版本後綴,讓依賴它的 effect 知道圖換了 —— 覆蓋既有圖時畫面才會即時更新。
      const version = Date.now();
      for (const [index, frame] of targets.entries()) {
        await saveImage(frame.id, cells[index]);
        updateFrame(frame.id, {
          imageBase64Key: `image-${frame.id}#${version}`,
        });
      }

      toast.success(
        `已切成 ${PANEL_COUNT} 格，填入分鏡 1–${targets.length}${
          targets.length < PANEL_COUNT
            ? `（分鏡不足，剩下 ${PANEL_COUNT - targets.length} 格未使用）`
            : ""
        }`
      );
    } catch (err) {
      toast.error(
        `切圖失敗：${err instanceof Error ? err.message : "未知錯誤"}`
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="mb-4 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <p className="font-medium">連續九宮格：一次生圖換九格</p>
          <p className="text-xs text-muted-foreground">
            複製 Prompt → 貼到 AI Studio 生成一張 3×3 圖 → 下載後匯入，自動切開填入分鏡
            1–{PANEL_COUNT}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImport}
          />
          <Button variant="outline" size="sm" onClick={handleCopyPrompt}>
            <Grid3X3 className="mr-1.5 h-4 w-4" />
            複製九宮格 Prompt
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ImageDown className="mr-1.5 h-4 w-4" />
            )}
            {isImporting ? "切圖中" : "匯入九宮格圖"}
          </Button>
        </div>
      </div>
    </div>
  );
}
