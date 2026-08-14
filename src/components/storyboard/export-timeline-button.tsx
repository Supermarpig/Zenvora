"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFrameStore } from "@/stores/use-frame-store";
import { loadImage, loadVideo } from "@/lib/db";
import { createZip, type ZipEntry } from "@/lib/zip";
import {
  buildTimeline,
  buildSrt,
  buildCompatSrt,
  buildReadme,
  clipBaseName,
  type FrameAssetFlags,
} from "@/lib/timeline-export";

/** data URL → bytes + 副檔名 */
function parseDataUrl(
  dataUrl: string
): { bytes: Uint8Array<ArrayBuffer>; ext: string } | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;

  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const ext = match[1] === "image/jpeg" ? "jpg" : "png";
  return { bytes, ext };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ExportTimelineButtonProps {
  projectId: string;
  projectName: string;
}

export function ExportTimelineButton({
  projectId,
  projectName,
}: ExportTimelineButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const getFramesByProject = useFrameStore((s) => s.getFramesByProject);

  async function handleExport() {
    const frames = getFramesByProject(projectId);
    if (frames.length === 0) {
      toast.info("尚無分鏡可導出");
      return;
    }

    setIsExporting(true);
    try {
      const assetEntries: ZipEntry[] = [];
      const flags: Record<string, FrameAssetFlags> = {};

      for (const [index, frame] of frames.entries()) {
        const base = clipBaseName(index + 1);
        const [image, video] = await Promise.all([
          loadImage(frame.id),
          loadVideo(frame.id),
        ]);

        const parsedImage = image ? parseDataUrl(image) : null;
        if (parsedImage) {
          assetEntries.push({
            name: `assets/${base}.${parsedImage.ext}`,
            data: parsedImage.bytes,
          });
        }

        if (video) {
          assetEntries.push({
            name: `assets/${base}.mp4`,
            data: new Uint8Array(await video.arrayBuffer()),
          });
        }

        flags[frame.id] = {
          imageExt: parsedImage?.ext,
          hasVideo: Boolean(video),
        };
      }

      const timeline = buildTimeline(
        projectName,
        frames,
        flags,
        new Date().toISOString()
      );
      const srt = buildSrt(timeline);
      const encoder = new TextEncoder();

      const entries: ZipEntry[] = [
        {
          name: "timeline.json",
          data: encoder.encode(JSON.stringify(timeline, null, 2)),
        },
        { name: "使用說明.txt", data: encoder.encode(buildReadme(timeline)) },
        ...assetEntries,
      ];
      // 全片無對白時不放空字幕檔,避免匯入剪映時報錯。
      // 同一份字幕放兩種編碼:剪映對 UTF-8 有無 BOM 的容忍度依版本而異,
      // 無法在沒有剪映的環境驗證,所以兩份都給(見 buildCompatSrt 註解)。
      if (srt) {
        entries.splice(
          1,
          0,
          { name: "subtitle.srt", data: encoder.encode(srt) },
          { name: "subtitle-bom.srt", data: buildCompatSrt(srt) }
        );
      }

      triggerDownload(createZip(entries), `${projectName}-剪映素材包.zip`);

      const videoCount = Object.values(flags).filter((f) => f.hasVideo).length;
      toast.success(
        `已導出 ${frames.length} 個鏡次(含 ${videoCount} 支影片),總長 ${timeline.totalDurationSec} 秒`
      );
    } catch (err) {
      toast.error(
        `導出失敗:${err instanceof Error ? err.message : "未知錯誤"}`
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-1.5 h-4 w-4" />
      )}
      {isExporting ? "打包中" : "導出剪映"}
    </Button>
  );
}
