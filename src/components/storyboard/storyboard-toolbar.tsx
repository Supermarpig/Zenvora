"use client";

import Link from "next/link";
import { Plus, ArrowLeft, List } from "lucide-react";
import { Button } from "@/components/ui/button";

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
