"use client";

import { Images, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBatchGenerateImages } from "@/hooks/use-batch-generate-images";

export function BatchImageButton({ projectId }: { projectId: string }) {
  const { progress, run, isRunning } = useBatchGenerateImages(projectId);

  async function handleClick() {
    const r = await run({ onlyMissing: true });
    if (r.ok === 0 && r.fail === 0) {
      toast.info("沒有需要生圖的分鏡(都已有圖或缺場景描述)");
      return;
    }
    if (r.fail > 0) {
      toast.error(
        `完成 ${r.ok} 張,失敗 ${r.fail} 張${r.firstError ? `:${r.firstError.slice(0, 80)}` : ""}`
      );
    } else {
      toast.success(`已批次生成 ${r.ok} 張分鏡圖`);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isRunning}
    >
      {isRunning ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <Images className="mr-1.5 h-4 w-4" />
      )}
      {isRunning && progress
        ? `生圖中 ${progress.done}/${progress.total}`
        : "批次生圖"}
    </Button>
  );
}
