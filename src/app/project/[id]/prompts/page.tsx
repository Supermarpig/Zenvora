"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptTable } from "@/components/prompt/prompt-table";
import { useProjectStore } from "@/stores/use-project-store";
import { useFrameStore } from "@/stores/use-frame-store";

export default function PromptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const project = useProjectStore((s) => s.getProject(id));
  const frames = useFrameStore((s) => s.getFramesByProject(id));

  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/project/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              Seedance 2.0 提示詞總表
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <PromptTable frames={frames} />
      </main>
    </div>
  );
}
