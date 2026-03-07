"use client";

import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useProjectStore } from "@/stores/use-project-store";

interface CharacterManagerProps {
  projectId: string;
}

export function CharacterManager({ projectId }: CharacterManagerProps) {
  const project = useProjectStore((s) => s.getProject(projectId));
  const addCharacter = useProjectStore((s) => s.addCharacter);
  const updateCharacter = useProjectStore((s) => s.updateCharacter);
  const removeCharacter = useProjectStore((s) => s.removeCharacter);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const characters = project?.characters ?? [];

  function handleAdd() {
    if (!name.trim() || !description.trim()) {
      toast.error("請填寫角色名稱和外觀描述");
      return;
    }
    addCharacter(projectId, { name: name.trim(), description: description.trim() });
    setName("");
    setDescription("");
    toast.success(`已新增角色「${name.trim()}」`);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="mr-1.5 h-4 w-4" />
          角色設定
          {characters.length > 0 && (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
              {characters.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>角色設定</DialogTitle>
          <p className="text-sm text-muted-foreground">
            定義角色的名稱與外觀描述，複製提示詞時會自動帶入，讓 AI 依照參考照生成正確人物。
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {characters.map((c, i) => (
            <div key={c.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  參考照 #{i + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => {
                    removeCharacter(projectId, c.id);
                    toast.success(`已移除角色「${c.name}」`);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input
                value={c.name}
                onChange={(e) => updateCharacter(projectId, c.id, { name: e.target.value })}
                placeholder="角色名稱"
                className="text-sm"
              />
              <Textarea
                value={c.description}
                onChange={(e) => updateCharacter(projectId, c.id, { description: e.target.value })}
                placeholder="外觀描述（例如：留鬍子的壯碩男性，穿黑色上衣和粉色長褲）"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          ))}

          <div className="rounded-lg border border-dashed p-3 space-y-2">
            <Label className="text-xs font-medium">新增角色</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="角色名稱（例如：小胖）"
              className="text-sm"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="外觀描述（例如：bearded heavyset man wearing a black t-shirt and pink pants, short dark hair）"
              rows={2}
              className="resize-none text-sm"
            />
            <Button size="sm" onClick={handleAdd} disabled={!name.trim() || !description.trim()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              新增角色
            </Button>
          </div>

          {characters.length > 0 && (
            <p className="text-xs text-muted-foreground">
              提示：複製提示詞到 Gemini 時，請按照上方順序上傳對應的參考照片（參考照 #1 對應第一張照片，依此類推）。
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
