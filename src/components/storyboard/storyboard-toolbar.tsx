"use client";

import Link from "next/link";
import { Plus, ArrowLeft, List, RotateCcw, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CharacterManager } from "./character-manager";
import { StoryboardGenerator } from "./storyboard-generator";
import { BatchImageButton } from "./batch-image-button";
import { ExportTimelineButton } from "./export-timeline-button";
import { ImportJsonButton } from "./import-json-button";
import { PlanReviewDialog } from "./plan-review-dialog";
import { TimelinePreviewDialog } from "./timeline-preview-dialog";
import { RoughCutDialog } from "./rough-cut-dialog";
import { NovelImportDialog } from "./novel-import-dialog";
import { useProjectStore } from "@/stores/use-project-store";
import { useFrameStore } from "@/stores/use-frame-store";
import { seedProject, seedFrames } from "@/lib/seed-data";

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
        <Button variant="outline" size="sm" asChild>
          <Link href="/characters">
            <UsersRound className="mr-1.5 h-4 w-4" />
            資產庫
          </Link>
        </Button>
        <CharacterManager projectId={projectId} />
        {projectId === seedProject.id && (
          <Button variant="outline" size="sm" onClick={handleReseed}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            重置腳本
          </Button>
        )}
        <StoryboardGenerator projectId={projectId} />
        <NovelImportDialog projectId={projectId} />
        <PlanReviewDialog projectId={projectId} />
        <BatchImageButton projectId={projectId} />
        <ImportJsonButton projectId={projectId} />
        <RoughCutDialog projectId={projectId} />
        <TimelinePreviewDialog
          projectId={projectId}
          projectName={projectName}
        />
        <ExportTimelineButton
          projectId={projectId}
          projectName={projectName}
        />
        <Button variant="outline" size="sm" onClick={onAddFrame}>
          <Plus className="mr-1.5 h-4 w-4" />
          新增分鏡
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/project/${projectId}/prompts`}>
            <List className="mr-1.5 h-4 w-4" />
            提示詞總表
          </Link>
        </Button>
      </div>
    </div>
  );
}
