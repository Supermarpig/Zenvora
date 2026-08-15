"use client";

import { Clapperboard } from "lucide-react";
import { toast } from "sonner";
import { ToolButton } from "./tool-button";
import { useBatchGenerateVideos } from "@/hooks/use-batch-generate-videos";

/**
 * 批次生影片:把整個專案的分鏡一次排入影片任務,背景依序生成。
 * 送出即返回(fire-and-forget),完成由 VideoJobPoller 抓回存檔 —— 適合本地
 * LTX 這種慢引擎掛著整晚跑。
 */
export function BatchVideoButton({
  projectId,
  rail,
}: {
  projectId: string;
  rail?: boolean;
}) {
  const { progress, run, isRunning } = useBatchGenerateVideos(projectId);

  async function handleClick() {
    const r = await run({ onlyMissing: true });
    if (r.ok === 0 && r.fail === 0) {
      toast.info("沒有需要生影片的分鏡(都已有影片或缺場景描述)");
      return;
    }
    if (r.fail > 0) {
      toast.error(
        `排入 ${r.ok} 段,失敗 ${r.fail} 段${r.firstError ? `:${r.firstError.slice(0, 80)}` : ""}`
      );
    } else {
      toast.success(`已排入 ${r.ok} 段影片,背景依序生成中(可關面板)`);
    }
  }

  return (
    <ToolButton
      icon={Clapperboard}
      label={
        isRunning && progress
          ? `排入中 ${progress.done}/${progress.total}`
          : "批次生影片"
      }
      rail={rail}
      loading={isRunning}
      disabled={isRunning}
      onClick={handleClick}
    />
  );
}
