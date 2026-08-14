"use client";

import Link from "next/link";
import { Plus, ArrowLeft, List, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StoryboardGenerator } from "./storyboard-generator";
import { ExportTimelineButton } from "./export-timeline-button";
import { useProjectStore } from "@/stores/use-project-store";
import { useFrameStore } from "@/stores/use-frame-store";
import { seedProject, seedFrames } from "@/lib/seed-data";

/**
 * 頂部工具列只留**每天都會按**的動作;設定與偶爾用一次的功能在左側工具欄
 * (`storyboard-rail.tsx`)。先前這裡有 14 顆平權按鈕,已經溢出視窗。
 */

interface StoryboardToolbarProps {
  projectId: string;
  projectName: string;
  onAddFrame: () => void;
}

export function StoryboardToolbar({
  projectId,
  projectName,
  onAddFrame,
}: StoryboardToolbarProps) {
  const importProject = useProjectStore((s) => s.importProject);
  const importFrames = useFrameStore((s) => s.importFrames);

  function handleReseed() {
    if (projectId !== seedProject.id) {
      toast.error("此專案非範例專案，無法重置");
      return;
    }
    importProject(seedProject);
    importFrames(seedFrames);
    toast.success("已重新載入最新腳本資料");
  }

  return (
    <div className="flex items-center justify-between border-b bg-background px-4 py-2">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">{projectName}</h1>
      </div>
      <div className="flex items-center gap-2">
        {projectId === seedProject.id && (
          <Button variant="outline" size="sm" onClick={handleReseed}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            重置腳本
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/project/${projectId}/prompts`}>
            <List className="mr-1.5 h-4 w-4" />
            提示詞總表
          </Link>
        </Button>
        <ExportTimelineButton
          projectId={projectId}
          projectName={projectName}
        />
        <Button variant="outline" size="sm" onClick={onAddFrame}>
          <Plus className="mr-1.5 h-4 w-4" />
          新增分鏡
        </Button>
        <StoryboardGenerator projectId={projectId} />
      </div>
    </div>
  );
}
