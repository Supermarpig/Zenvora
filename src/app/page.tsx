"use client";

import { useRouter } from "next/navigation";
import { Clapperboard, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/use-project-store";
import { useFrameStore } from "@/stores/use-frame-store";
import { ProjectCard } from "@/components/project/project-card";
import { CreateProjectDialog } from "@/components/project/create-project-dialog";
import { seedProject, seedFrames } from "@/lib/seed-data";

export default function HomePage() {
  const projects = useProjectStore((s) => s.projects);
  const importProject = useProjectStore((s) => s.importProject);
  const importFrames = useFrameStore((s) => s.importFrames);
  const router = useRouter();

  function handleLoadSeed() {
    importProject(seedProject);
    importFrames(seedFrames);
    toast.success(`已載入「${seedProject.name}」，共 ${seedFrames.length} 個分鏡`);
    router.push(`/project/${seedProject.id}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-6 w-6" />
            <h1 className="text-xl font-bold">FrameForge</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleLoadSeed}>
              <FileDown className="mr-1.5 h-4 w-4" />
              載入範例腳本
            </Button>
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleLoadSeed}>
                <FileDown className="mr-1.5 h-4 w-4" />
                載入範例腳本
              </Button>
              <CreateProjectDialog />
            </div>
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
