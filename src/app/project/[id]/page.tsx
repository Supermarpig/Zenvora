"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useProjectStore } from "@/stores/use-project-store";
import { useFrameStore } from "@/stores/use-frame-store";
import { StoryboardCanvas } from "@/components/storyboard/storyboard-canvas";
import { StoryboardToolbar } from "@/components/storyboard/storyboard-toolbar";
import { FrameEditor } from "@/components/storyboard/frame-editor";

export default function StoryboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const project = useProjectStore((s) => s.getProject(id));
  const addFrame = useFrameStore((s) => s.addFrame);

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
