"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useProjectStore } from "@/stores/use-project-store";
import { useFrameStore } from "@/stores/use-frame-store";
import { useProjectStoreHydrated } from "@/hooks/use-project-hydrated";
import { StoryboardCanvas } from "@/components/storyboard/storyboard-canvas";
import { StoryboardToolbar } from "@/components/storyboard/storyboard-toolbar";
import { FrameEditor } from "@/components/storyboard/frame-editor";

export default function StoryboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const hydrated = useProjectStoreHydrated();
  const project = useProjectStore((s) => s.getProject(id));
  const addFrame = useFrameStore((s) => s.addFrame);

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

  function handleAddFrame() {
    addFrame(id);
  }

  return (
    <div className="flex h-screen flex-col">
      <StoryboardToolbar
        projectId={id}
        projectName={project.name}
        onAddFrame={handleAddFrame}
      />
      <div className="flex-1">
        <StoryboardCanvas projectId={id} />
      </div>
      <FrameEditor />
    </div>
  );
}
