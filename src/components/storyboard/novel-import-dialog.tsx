"use client";

import { useState } from "react";
import { BookOpen, Loader2, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFrameStore } from "@/stores/use-frame-store";
import { useCharacterAssetStore } from "@/stores/use-character-asset-store";
import { splitNovel, type NovelScene, type NovelCharacter } from "@/actions/split-novel";
import { generateStoryboard } from "@/actions/generate-storyboard";

/**
 * 小說匯入。**兩階段刻意分開**:
 *
 * 第一階段只拆場次與角色,不建立任何分鏡資料 —— 拆分結果不可控,若一路拆到
 * 分鏡,使用者只能全接受或全丟掉。確認後才逐場拆鏡。
 *
 * 第二階段直接複用 generate-storyboard(已經很成熟),不另寫一套拆鏡邏輯。
 */
export function NovelImportDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [stage, setStage] = useState<"input" | "review">("input");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [scenes, setScenes] = useState<NovelScene[]>([]);
  const [characters, setCharacters] = useState<NovelCharacter[]>([]);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [createdAssets, setCreatedAssets] = useState<Set<string>>(new Set());

  const appendFrames = useFrameStore((s) => s.appendFrames);
  const assets = useCharacterAssetStore((s) => s.assets);
  const addAsset = useCharacterAssetStore((s) => s.addAsset);

  function reset() {
    setStage("input");
    setText("");
    setScenes([]);
    setCharacters([]);
    setSkipped(new Set());
    setCreatedAssets(new Set());
    setProgress("");
  }

  async function handleSplit() {
    setBusy(true);
    const result = await splitNovel({ text });
    setBusy(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setScenes(result.scenes);
    setCharacters(result.characters);
    setStage("review");
  }

  function handleCreateAsset(c: NovelCharacter) {
    if (assets.some((a) => a.name === c.name)) {
      toast.info(`「${c.name}」已經在資產庫裡了`);
      setCreatedAssets((s) => new Set(s).add(c.name));
      return;
    }
    addAsset({ name: c.name, kind: "character", type: "actor", appearance: c.appearance });
    setCreatedAssets((s) => new Set(s).add(c.name));
    toast.success(`已建立資產「${c.name}」`);
  }

  /** 逐場拆鏡。序列而非並行 —— 免費層有 RPM 限制,並行很容易撞 429 */
  async function handleGenerate() {
    const targets = scenes.filter((s) => !skipped.has(s.index));
    if (targets.length === 0) {
      toast.info("所有場次都被略過了");
      return;
    }

    setBusy(true);
    let ok = 0;
    let firstError: string | undefined;

    const mentionable = useCharacterAssetStore
      .getState()
      .assets.filter((a) => (a.kind ?? "character") === "character" || a.kind === "scene")
      .map((a) => a.name);

    for (const [i, scene] of targets.entries()) {
      setProgress(`第 ${i + 1}/${targets.length} 場：${scene.title}`);
      const result = await generateStoryboard({
        premise: `${scene.title}\n\n${scene.synopsis}`,
        frameCount: scene.suggestedShots,
        mentionableAssets: mentionable,
      });
      if (result.success) {
        appendFrames(projectId, result.shots);
        ok += result.shots.length;
      } else {
        firstError ??= result.error;
      }
    }

    setBusy(false);
    setProgress("");

    if (ok > 0) {
      toast.success(`已從 ${targets.length} 場產生 ${ok} 個分鏡`);
      setOpen(false);
      reset();
    } else {
      toast.error(firstError ?? "沒有產生任何分鏡");
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <BookOpen className="mr-1.5 h-4 w-4" />
        匯入小說
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>
              匯入小說 {stage === "review" && "· 確認場次"}
            </DialogTitle>
            <DialogDescription>
              先拆成場次讓你確認，這一步不會建立任何分鏡。確認後才逐場拆鏡。
            </DialogDescription>
          </DialogHeader>

          {stage === "input" && (
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label className="text-xs">小說 / 劇本原文</Label>
                <Textarea
                  rows={12}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="貼上章節內容…"
                  className="text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  {text.length} 字（上限 50,000 字，超過請分次貼）
                </p>
              </div>
              <Button onClick={handleSplit} disabled={busy || text.length < 50}>
                {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                拆成場次
              </Button>
            </div>
          )}

          {stage === "review" && (
            <div className="space-y-4 py-1">
              {characters.length > 0 && (
                <div className="space-y-2 rounded-lg border p-3">
                  <Label className="text-sm">
                    辨識到的角色（建立成資產後，拆鏡才能用 @ 引用）
                  </Label>
                  <ul className="space-y-1.5">
                    {characters.map((c) => {
                      const exists =
                        createdAssets.has(c.name) ||
                        assets.some((a) => a.name === c.name);
                      return (
                        <li
                          key={c.name}
                          className="flex items-start justify-between gap-2 rounded bg-muted/40 px-2 py-1.5"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium">{c.name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {c.appearance}
                            </p>
                          </div>
                          <Button
                            variant={exists ? "ghost" : "secondary"}
                            size="sm"
                            className="h-7 shrink-0 text-xs"
                            disabled={exists}
                            onClick={() => handleCreateAsset(c)}
                          >
                            {exists ? (
                              <>
                                <Check className="mr-1 h-3 w-3" />
                                已建立
                              </>
                            ) : (
                              <>
                                <UserPlus className="mr-1 h-3 w-3" />
                                建立資產
                              </>
                            )}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm">
                  場次（{scenes.length - skipped.size}/{scenes.length} 將拆鏡，
                  共約 {scenes.filter((s) => !skipped.has(s.index)).reduce((n, s) => n + s.suggestedShots, 0)} 鏡）
                </Label>
                <ul className="space-y-1.5">
                  {scenes.map((s) => {
                    const off = skipped.has(s.index);
                    return (
                      <li
                        key={s.index}
                        className={`rounded border px-3 py-2 ${off ? "opacity-40" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {s.index}. {s.title}
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                {s.suggestedShots} 鏡
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.synopsis}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 shrink-0 text-xs"
                            onClick={() =>
                              setSkipped((k) => {
                                const next = new Set(k);
                                if (next.has(s.index)) next.delete(s.index);
                                else next.add(s.index);
                                return next;
                              })
                            }
                          >
                            {off ? "納入" : "略過"}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handleGenerate} disabled={busy}>
                  {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  逐場拆鏡並加入專案
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStage("input")}
                  disabled={busy}
                >
                  回上一步
                </Button>
                {progress && (
                  <p className="text-xs text-muted-foreground">{progress}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
