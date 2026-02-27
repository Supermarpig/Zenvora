"use client";

import { Clapperboard } from "lucide-react";
import { useProjectStore } from "@/stores/use-project-store";
import { ProjectCard } from "@/components/project/project-card";
import { CreateProjectDialog } from "@/components/project/create-project-dialog";

export default function HomePage() {
  const projects = useProjectStore((s) => s.projects);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-6 w-6" />
            <h1 className="text-xl font-bold">FrameForge</h1>
          </div>
          <CreateProjectDialog />
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
    </div>
  );
}
