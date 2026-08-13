"use client";

import { useState } from "react";
import { Globe2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectStore } from "@/stores/use-project-store";
import { useCharacterAssetStore } from "@/stores/use-character-asset-store";
import type { Worldview, WorldviewRegion } from "@/lib/schemas";

const NONE = "__none__";

const EMPTY: Worldview = {
  setting: "",
  visualBible: "",
  musicMood: "",
  regions: [],
};

/**
 * 世界觀錨定。
 *
 * `visualBible` 會注入每一次生圖的 prompt(位於角色一致性之後、逐鏡描述之前),
 * 所以它是「全片都成立的視覺約定」,不是這一鏡的描述。
 */
export function WorldviewDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const project = useProjectStore((s) => s.getProject(projectId));
  const updateProject = useProjectStore((s) => s.updateProject);
  const assets = useCharacterAssetStore((s) => s.assets);
  const sceneAssets = assets.filter((a) => a.kind === "scene");

  const [draft, setDraft] = useState<Worldview>(project?.worldview ?? EMPTY);

  function patch(next: Partial<Worldview>) {
    setDraft((d) => ({ ...d, ...next }));
  }

  function patchRegion(id: string, next: Partial<WorldviewRegion>) {
    patch({
      regions: draft.regions.map((r) => (r.id === id ? { ...r, ...next } : r)),
    });
  }

  function handleSave() {
    updateProject(projectId, { worldview: draft });
    toast.success("已儲存世界觀");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-1.5">
              <Globe2 className="h-4 w-4" />
              世界觀 · {project?.name}
            </span>
          </DialogTitle>
          <DialogDescription>
            視覺基調會加進每一次生圖的 prompt，所以請寫「全片都成立」的約定，而不是某一鏡的描述。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">視覺基調（注入所有生成 prompt）</Label>
            <Textarea
              rows={3}
              value={draft.visualBible}
              onChange={(e) => patch({ visualBible: e.target.value })}
              placeholder="例如：Warm domestic realism, tungsten interiors against cool blue night exteriors, 35mm shallow depth of field, subtle grain"
              className="text-xs"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">時代 / 地域 / 世界規則</Label>
              <Textarea
                rows={3}
                value={draft.setting}
                onChange={(e) => patch({ setting: e.target.value })}
                placeholder="例如：2020 年代台灣南部小鎮"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">音樂調性</Label>
              <Textarea
                rows={3}
                value={draft.musicMood}
                onChange={(e) => patch({ musicMood: e.target.value })}
                placeholder="例如：鋼琴獨奏，克制、不煽情"
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">區域與地點</Label>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  patch({
                    regions: [
                      ...draft.regions,
                      {
                        id: crypto.randomUUID(),
                        name: "",
                        description: "",
                        locations: [],
                      },
                    ],
                  })
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                新增區域
              </Button>
            </div>

            {draft.regions.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">
                還沒有區域。這一層是給多集故事整理地理關係用的，單支短片可以不填。
              </p>
            ) : (
              <ul className="space-y-3">
                {draft.regions.map((region) => (
                  <li key={region.id} className="space-y-2 rounded border p-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={region.name}
                        onChange={(e) =>
                          patchRegion(region.id, { name: e.target.value })
                        }
                        placeholder="區域名稱，例如：老家一帶"
                        className="h-8 text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() =>
                          patch({
                            regions: draft.regions.filter(
                              (r) => r.id !== region.id
                            ),
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>

                    {region.locations.map((loc) => (
                      <div
                        key={loc.id}
                        className="flex items-center gap-2 pl-3"
                      >
                        <Input
                          value={loc.name}
                          onChange={(e) =>
                            patchRegion(region.id, {
                              locations: region.locations.map((l) =>
                                l.id === loc.id
                                  ? { ...l, name: e.target.value }
                                  : l
                              ),
                            })
                          }
                          placeholder="地點名稱"
                          className="h-8 text-xs"
                        />
                        {/* 綁到場景資產,讓同一個地點跨集視覺一致 */}
                        <Select
                          value={loc.sceneAssetId ?? NONE}
                          onValueChange={(v) =>
                            patchRegion(region.id, {
                              locations: region.locations.map((l) =>
                                l.id === loc.id
                                  ? {
                                      ...l,
                                      sceneAssetId: v === NONE ? undefined : v,
                                    }
                                  : l
                              ),
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-[150px] shrink-0 text-xs">
                            <SelectValue placeholder="場景資產" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>未綁定場景</SelectItem>
                            {sceneAssets.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() =>
                            patchRegion(region.id, {
                              locations: region.locations.filter(
                                (l) => l.id !== loc.id
                              ),
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-3 h-7 text-xs"
                      onClick={() =>
                        patchRegion(region.id, {
                          locations: [
                            ...region.locations,
                            { id: crypto.randomUUID(), name: "", description: "" },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      新增地點
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button onClick={handleSave}>儲存世界觀</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
