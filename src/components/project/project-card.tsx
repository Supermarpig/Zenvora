"use client";

import Link from "next/link";
import { Trash2, Film } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/use-project-store";
import { useFrameStore } from "@/stores/use-frame-store";
import type { Project } from "@/lib/schemas";

export function ProjectCard({ project }: { project: Project }) {
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const deleteFramesByProject = useFrameStore((s) => s.deleteFramesByProject);
  const frames = useFrameStore((s) => s.getFramesByProject(project.id));

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    deleteFramesByProject(project.id);
    deleteProject(project.id);
    toast.success("專案已刪除");
  }

  return (
    <Link href={`/project/${project.id}`}>
      <Card className="group transition-shadow hover:shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{project.name}</CardTitle>
              {project.description && (
                <CardDescription className="line-clamp-2">
                  {project.description}
                </CardDescription>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 transition-opacity group-hover:opacity-100"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          <Film className="mr-1.5 h-4 w-4" />
          {frames.length} 個分鏡
          <span className="ml-auto">
            {new Date(project.updatedAt).toLocaleDateString("zh-TW")}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
