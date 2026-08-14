"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clapperboard,
  UsersRound,
  Settings2,
  Archive,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectStore } from "@/stores/use-project-store";
import { ProjectCard } from "@/components/project/project-card";
import { CreateProjectDialog } from "@/components/project/create-project-dialog";
import { ModelConfigDialog } from "@/components/settings/model-config-dialog";
import { PromptTemplateDialog } from "@/components/settings/prompt-template-dialog";
import { BackupDialog } from "@/components/settings/backup-dialog";

/** 三個設定對話框由選單開啟,狀態必須放在選單之外 —— 見 settings-dialog-props.ts */
type SettingsPanel = "backup" | "template" | "model" | null;

export default function HomePage() {
  const projects = useProjectStore((s) => s.projects);
  const [panel, setPanel] = useState<SettingsPanel>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-6 w-6" />
            <h1 className="text-xl font-bold">FrameForge</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/characters">
                <UsersRound className="mr-1.5 h-4 w-4" />
                資產庫
              </Link>
            </Button>

            {/* 備份 / 模板 / 模型都是「設定好就不太會再動」,收成一個選單 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                  設定
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>設定</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setPanel("backup")}>
                  <Archive className="h-4 w-4" />
                  <div>
                    <p>備份與還原</p>
                    <p className="text-xs text-muted-foreground">
                      匯出／匯入專案與素材
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPanel("template")}>
                  <FileText className="h-4 w-4" />
                  <div>
                    <p>Prompt 模板</p>
                    <p className="text-xs text-muted-foreground">
                      改寫內建的生圖句式
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPanel("model")}>
                  <Settings2 className="h-4 w-4" />
                  <div>
                    <p>模型設定</p>
                    <p className="text-xs text-muted-foreground">
                      生圖／生影片／文字模型
                    </p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <CreateProjectDialog />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
            <Clapperboard className="h-16 w-16 text-muted-foreground/40" />
            <div>
              <h2 className="text-xl font-semibold">還沒有任何專案</h2>
              <p className="mt-1 text-muted-foreground">
                點擊「新增專案」開始你的第一個分鏡腳本
              </p>
            </div>
            <CreateProjectDialog />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>

      {/* 對話框渲染在選單之外,否則選單關閉時會一起被卸載 */}
      <BackupDialog
        hideTrigger
        open={panel === "backup"}
        onOpenChange={(o) => setPanel(o ? "backup" : null)}
      />
      <PromptTemplateDialog
        hideTrigger
        open={panel === "template"}
        onOpenChange={(o) => setPanel(o ? "template" : null)}
      />
      <ModelConfigDialog
        hideTrigger
        open={panel === "model"}
        onOpenChange={(o) => setPanel(o ? "model" : null)}
      />
    </div>
  );
}
