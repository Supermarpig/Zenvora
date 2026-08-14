"use client";

import Link from "next/link";
import { UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CharacterManager } from "./character-manager";
import { NovelImportDialog } from "./novel-import-dialog";
import { ImportJsonButton } from "./import-json-button";
import { PlanReviewDialog } from "./plan-review-dialog";
import { RoughCutDialog } from "./rough-cut-dialog";
import { TimelinePreviewDialog } from "./timeline-preview-dialog";
import { BatchImageButton } from "./batch-image-button";
import { EpisodeManagerDialog } from "@/components/project/episode-manager-dialog";

/**
 * 左側工具欄:放**設定與偶爾用一次**的功能。
 *
 * 頂部工具列只留「每天都會按」的四個動作 —— 先前 14 顆平權按鈕擠成一排,
 * 常用的跟一年按一次的長得一樣大,而且已經溢出視窗被切掉。
 *
 * 分組依實際流程:素材與設定 → 匯入 → 檢查與剪接 → 產出。
 * 純圖示靠 hover 標籤補可辨識度 —— 直向排列時垂直空間充裕,分隔線比
 * 文字更適合表達分組。
 */
export function StoryboardRail({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r bg-background py-3">
        {/* 資產庫是路由不是對話框,所以不走 ToolButton 而是自己包一層 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label="資產庫"
              asChild
            >
              <Link href="/characters">
                <UsersRound className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">資產庫</TooltipContent>
        </Tooltip>
        <CharacterManager projectId={projectId} rail />
        <EpisodeManagerDialog projectId={projectId} rail />

        <Divider />

        <NovelImportDialog projectId={projectId} rail />
        <ImportJsonButton projectId={projectId} rail />

        <Divider />

        <PlanReviewDialog projectId={projectId} rail />
        <RoughCutDialog projectId={projectId} rail />
        <TimelinePreviewDialog
          projectId={projectId}
          projectName={projectName}
          rail
        />

        <Divider />

        <BatchImageButton projectId={projectId} rail />
      </aside>
    </TooltipProvider>
  );
}

function Divider() {
  return <div className="my-1 h-px w-7 bg-border" />;
}
