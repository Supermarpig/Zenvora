"use client";

import { useState } from "react";
import { Layers, Plus, Trash2, Film } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEpisodeStore } from "@/stores/use-episode-store";
import { useFrameStore } from "@/stores/use-frame-store";

/**
 * 季 / 集管理。
 *
 * **季/集是可選的。** 沒建立任何季的專案,畫布與工具列跟先前完全一樣 ——
 * 這個對話框是唯一的入口,不建立就不會多出任何層級 UI。
 *
 * 刪除季/集**不刪分鏡**,只把分鏡改回「未指定」(直接掛在專案下)。
 * 刪掉一個章節就連內容一起消失太意外,而且不可復原。
 */
export function EpisodeManagerDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [newSeason, setNewSeason] = useState("");
  const [newEpisode, setNewEpisode] = useState<Record<string, string>>({});

  const allSeasons = useEpisodeStore((s) => s.seasons);
  const allEpisodes = useEpisodeStore((s) => s.episodes);
  const addSeason = useEpisodeStore((s) => s.addSeason);
  const addEpisode = useEpisodeStore((s) => s.addEpisode);
  const deleteSeason = useEpisodeStore((s) => s.deleteSeason);
  const deleteEpisode = useEpisodeStore((s) => s.deleteEpisode);
  const renameSeason = useEpisodeStore((s) => s.renameSeason);
  const updateEpisode = useEpisodeStore((s) => s.updateEpisode);

  const frames = useFrameStore((s) => s.frames);
  const clearEpisodeAssignments = useFrameStore(
    (s) => s.clearEpisodeAssignments
  );

  // selector 只取穩定參考,過濾與排序在 render body 做
  const seasons = allSeasons
    .filter((s) => s.projectId === projectId)
    .sort((a, b) => a.order - b.order);

  const frameCount = (episodeId: string) =>
    frames.filter((f) => f.episodeId === episodeId).length;

  function handleAddSeason() {
    const name = newSeason.trim();
    if (!name) return;
    addSeason(projectId, name);
    setNewSeason("");
    toast.success(`已建立「${name}」`);
  }

  function handleAddEpisode(seasonId: string) {
    const name = (newEpisode[seasonId] ?? "").trim();
    if (!name) return;
    addEpisode(seasonId, name);
    setNewEpisode((m) => ({ ...m, [seasonId]: "" }));
    toast.success(`已建立「${name}」`);
  }

  function handleDeleteSeason(id: string, name: string) {
    const removed = deleteSeason(id);
    clearEpisodeAssignments(removed);
    toast.success(`已刪除「${name}」，其中的分鏡改回未指定`);
  }

  function handleDeleteEpisode(id: string, name: string) {
    deleteEpisode(id);
    clearEpisodeAssignments([id]);
    toast.success(`已刪除「${name}」，其中的分鏡改回未指定`);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Layers className="mr-1.5 h-4 w-4" />
        季 / 集
        {seasons.length > 0 && (
          <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
            {seasons.length}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>季 / 集</DialogTitle>
            <DialogDescription>
              長篇才需要分季分集。不建立的話畫布維持單層，什麼都不會變。
              刪除季或集不會刪掉分鏡，只會把它們改回未指定。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="flex gap-2">
              <Input
                value={newSeason}
                onChange={(e) => setNewSeason(e.target.value)}
                placeholder="季名稱，例如：第一季"
                className="text-sm"
              />
              <Button
                onClick={handleAddSeason}
                disabled={!newSeason.trim()}
                className="shrink-0"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                新增季
              </Button>
            </div>

            {seasons.length === 0 ? (
              <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                還沒有任何季 —— 這個專案目前是單層的
              </p>
            ) : (
              <ul className="space-y-3">
                {seasons.map((season) => {
                  const episodes = allEpisodes
                    .filter((e) => e.seasonId === season.id)
                    .sort((a, b) => a.order - b.order);
                  return (
                    <li key={season.id} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={season.name}
                          onChange={(e) =>
                            renameSeason(season.id, e.target.value)
                          }
                          className="h-8 border-transparent bg-transparent px-1 text-sm font-medium hover:border-input focus-visible:border-input"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() =>
                            handleDeleteSeason(season.id, season.name)
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>

                      {episodes.length > 0 && (
                        <ul className="mt-2 space-y-1.5">
                          {episodes.map((ep) => (
                            <li
                              key={ep.id}
                              className="flex items-center gap-2 rounded bg-muted/40 px-2 py-1"
                            >
                              <Film className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <Input
                                value={ep.name}
                                onChange={(e) =>
                                  updateEpisode(ep.id, { name: e.target.value })
                                }
                                className="h-7 border-transparent bg-transparent px-1 text-xs hover:border-input focus-visible:border-input"
                              />
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {frameCount(ep.id)} 鏡
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() =>
                                  handleDeleteEpisode(ep.id, ep.name)
                                }
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-2 flex gap-2">
                        <Input
                          value={newEpisode[season.id] ?? ""}
                          onChange={(e) =>
                            setNewEpisode((m) => ({
                              ...m,
                              [season.id]: e.target.value,
                            }))
                          }
                          placeholder="集名稱，例如：第 1 集"
                          className="h-8 text-xs"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 shrink-0"
                          onClick={() => handleAddEpisode(season.id)}
                          disabled={!(newEpisode[season.id] ?? "").trim()}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          新增集
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <Label className="block text-xs text-muted-foreground">
              建立集之後，分鏡編輯器會多出「所屬集」欄位，畫布上方也會出現篩選。
              鏡號仍是專案內的編號，不會因為篩選而重編。
            </Label>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
