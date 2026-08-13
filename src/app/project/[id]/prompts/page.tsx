"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptTable } from "@/components/prompt/prompt-table";
import { GridSequenceTools } from "@/components/prompt/grid-sequence-tools";
import { CharacterManager } from "@/components/storyboard/character-manager";
import { useProjectStore } from "@/stores/use-project-store";
import { useFrameStore } from "@/stores/use-frame-store";
import { useProjectStoreHydrated } from "@/hooks/use-project-hydrated";

export default function PromptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const hydrated = useProjectStoreHydrated();
  const project = useProjectStore((s) => s.getProject(id));
  const allFrames = useFrameStore((s) => s.frames);
  const frames = useMemo(
    () =>
      allFrames
        .filter((f) => f.projectId === id)
        .sort((a, b) => a.order - b.order),
    [allFrames, id]
  );

  // 還沒 hydrate 完就還不知道專案存不存在,此時不能判 404
  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/project/${id}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                提示詞總表 · 共 {frames.length} 個分鏡
              </p>
            </div>
          </div>
          <CharacterManager projectId={id} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        {frames.length > 0 && (
          <GridSequenceTools projectId={id} frames={frames} />
        )}
        <PromptTable frames={frames} />
      </main>
    </div>
  );
}
