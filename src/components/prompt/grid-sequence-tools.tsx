"use client";

import { useRef, useState } from "react";
import { Grid3X3, ImageDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFrameStore } from "@/stores/use-frame-store";
import { useProjectStore } from "@/stores/use-project-store";
import { saveImage } from "@/lib/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { splitGrid, fileToDataUrl } from "@/lib/grid-split";
import {
  buildGridPrompt,
  gridSpec,
  type GridSize,
  type GridOrientation,
} from "@/lib/storyboard-prompt";
import type { Frame } from "@/lib/schemas";

/** 25 格刻意不開放:1024px 除以 5 每格只剩約 205px,切出來不堪用 */
const SIZE_OPTIONS: { value: GridSize; label: string }[] = [
  { value: 4, label: "4 格" },
  { value: 6, label: "6 格" },
  { value: 9, label: "9 格" },
];

const ORIENTATION_OPTIONS: { value: GridOrientation; label: string }[] = [
  { value: "portrait", label: "直版 9:16" },
  { value: "landscape", label: "橫版 16:9" },
];

/**
 * 連續宮格工作流:一次生圖換多格畫面。
 *
 * 跟每列那顆「9 宮格 Prompt」不同 —— 那個是同一個分鏡的九種鏡位(挑鏡用),
 * 這裡是多個「不同分鏡」各佔一格,所以切開後可以依序填回去。
 *
 * 方向很重要:短影音是 9:16,用橫版比例生直版短片的分鏡會讓每格構圖全部走掉。
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
  const [size, setSize] = useState<GridSize>(9);
  // 預設直版:這個工具的主要用途是短影音
  const [orientation, setOrientation] = useState<GridOrientation>("portrait");
  const updateFrame = useFrameStore((s) => s.updateFrame);
  const project = useProjectStore((s) => s.getProject(projectId));

  const spec = gridSpec(size, orientation);
  const panelCount = spec.cols * spec.rows;
  const targets = frames.slice(0, panelCount);

  async function handleCopyPrompt() {
    if (frames.length < panelCount) {
      toast.error(
        `需要至少 ${panelCount} 個分鏡（目前 ${frames.length} 個），${size} 格才填得滿`
      );
      return;
    }
    const prompt = buildGridPrompt(
      targets,
      size,
      project?.characters ?? [],
      orientation
    );
    await navigator.clipboard.writeText(prompt);
    toast.success(
      `已複製分鏡 1–${panelCount} 的 ${spec.cols}×${spec.rows} Prompt（整張 ${spec.imageAspect}，每格 ${spec.panelAspect}）`
    );
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
        spec.cols,
        spec.rows
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
        `已切成 ${panelCount} 格，填入分鏡 1–${targets.length}${
          targets.length < panelCount
            ? `（分鏡不足，剩下 ${panelCount - targets.length} 格未使用）`
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
          <p className="font-medium">連續宮格：一次生圖換 {panelCount} 格</p>
          <p className="text-xs text-muted-foreground">
            複製 Prompt → 貼到 AI Studio 生成一張 {spec.cols}×{spec.rows} 圖（整張{" "}
            {spec.imageAspect}）→ 下載後匯入，自動切開填入分鏡 1–{panelCount}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={String(size)}
            onValueChange={(v) => setSize(Number(v) as GridSize)}
          >
            <SelectTrigger className="h-9 w-[88px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={orientation}
            onValueChange={(v) => setOrientation(v as GridOrientation)}
          >
            <SelectTrigger className="h-9 w-[112px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORIENTATION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImport}
          />
          <Button variant="outline" size="sm" onClick={handleCopyPrompt}>
            <Grid3X3 className="mr-1.5 h-4 w-4" />
            複製 Prompt
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
            {isImporting ? "切圖中" : "匯入宮格圖"}
          </Button>
        </div>
      </div>
    </div>
  );
}
