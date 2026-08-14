"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Users, Check, Library } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ToolButton } from "./tool-button";
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
import { useCharacterAssetStore } from "@/stores/use-character-asset-store";
import { CHARACTER_ASSET_TYPE_LABELS, type CharacterAsset } from "@/lib/schemas";

interface CharacterManagerProps {
  projectId: string;
  /** true = 左側工具欄的純圖示樣式 */
  rail?: boolean;
}

export function CharacterManager({ projectId, rail }: CharacterManagerProps) {
  const project = useProjectStore((s) => s.getProject(projectId));
  const addCharacter = useProjectStore((s) => s.addCharacter);
  const updateCharacter = useProjectStore((s) => s.updateCharacter);
  const removeCharacter = useProjectStore((s) => s.removeCharacter);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const characters = project?.characters ?? [];
  const globalAssets = useCharacterAssetStore((s) => s.assets);

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

  function handleImportAsset(asset: CharacterAsset) {
    if (characters.some((c) => c.name === asset.name)) {
      toast.info(`「${asset.name}」已在本專案`);
      return;
    }
    addCharacter(projectId, {
      name: asset.name,
      description: asset.appearance,
    });
    toast.success(`已從資產庫加入「${asset.name}」`);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <ToolButton
          icon={Users}
          label="本片角色表"
          rail={rail}
          badge={characters.length}
        />
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>本片角色表</DialogTitle>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">只是這個專案的文字備註</strong>，
            供九宮格與提示詞複製時帶上角色描述。
            <br />
            要讓角色在生圖時真的長得一致，是用「資產庫」的參考圖 —— 兩者是不同的東西。
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-medium">
                <Library className="h-3.5 w-3.5" />
                從資產庫帶入名稱與外觀
              </Label>
              <Link
                href="/characters"
                className="text-[11px] text-primary hover:underline"
              >
                管理資產庫 →
              </Link>
            </div>
            {globalAssets.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                資產庫還沒有人物。到「資產庫」建立可跨專案重用、能帶參考圖的角色。
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {globalAssets.map((a) => {
                  const added = characters.some((c) => c.name === a.name);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleImportAsset(a)}
                      disabled={added}
                      title={CHARACTER_ASSET_TYPE_LABELS[a.type] ?? a.type}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        added
                          ? "cursor-default border-primary/40 bg-primary/10 text-muted-foreground"
                          : "border-border hover:bg-background"
                      }`}
                    >
                      {added ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      {a.name}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              個別分鏡的 AI 生圖選角，請在分鏡編輯器的「出場人物」勾選(會自動帶參考圖)。
            </p>
          </div>

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
