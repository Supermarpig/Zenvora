"use client";

import { useState } from "react";
import { Scissors, Loader2, ArrowRightLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ToolButton } from "./tool-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFrameStore } from "@/stores/use-frame-store";
import { useModelConfigStore } from "@/stores/use-model-config-store";
import {
  suggestRoughCut,
  type RoughCutSuggestion,
} from "@/actions/rough-cut";

/**
 * AI 粗剪建議。
 *
 * **只提建議,逐項由使用者決定。** 剪接是創作決策,靜默改動別人的分鏡是
 * 不可接受的 —— 所以沒有「全部接受」按鈕,而且 cut 的按鈕用 destructive
 * 樣式並寫明「刪除」,不用「接受」這種讓人以為可以反悔的字。
 */
export function RoughCutDialog({
  projectId,
  rail,
}: {
  projectId: string;
  rail?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [suggestions, setSuggestions] = useState<RoughCutSuggestion[]>([]);
  const [handled, setHandled] = useState<Set<number>>(new Set());

  const getFramesByProject = useFrameStore((s) => s.getFramesByProject);
  const deleteFrame = useFrameStore((s) => s.deleteFrame);
  const reorderFrames = useFrameStore((s) => s.reorderFrames);

  async function handleOpen() {
    const frames = getFramesByProject(projectId);
    if (frames.length < 2) {
      toast.info("至少要有 2 個分鏡才需要粗剪");
      return;
    }

    setOpen(true);
    setLoading(true);
    setSuggestions([]);
    setSummary("");
    setHandled(new Set());

    const result = await suggestRoughCut({
      textModel: useModelConfigStore.getState().textModel,
      shots: frames.map((f, i) => ({
        shot: i + 1,
        prompt: f.prompt,
        dialogue: f.dialogue ?? "",
        speaker: f.speaker ?? "",
        durationSec: f.videoDurationSec ?? f.duration,
      })),
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      setOpen(false);
      return;
    }
    setSuggestions(result.suggestions);
    setSummary(result.summary);
  }

  /** 每次操作都重新從 store 取當前順序 —— 使用者可能已經處理過別的建議 */
  function currentFrames() {
    return getFramesByProject(projectId);
  }

  function applyCut(s: RoughCutSuggestion) {
    const frames = currentFrames();
    const target = frames[s.shot - 1];
    if (!target) {
      toast.error("這一鏡已經不存在了");
      return;
    }
    deleteFrame(target.id);
    setHandled((h) => new Set(h).add(s.shot));
    toast.success(`已刪除第 ${s.shot} 鏡`);
  }

  function applyReorder(s: RoughCutSuggestion) {
    if (s.toShot === undefined) return;
    const frames = currentFrames();
    const from = s.shot - 1;
    const to = s.toShot - 1;
    if (!frames[from] || to < 0 || to >= frames.length) {
      toast.error("順序已經變動過,這個建議不再適用");
      return;
    }
    const ids = frames.map((f) => f.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    reorderFrames(projectId, ids);
    setHandled((h) => new Set(h).add(s.shot));
    toast.success(`已把第 ${s.shot} 鏡移到第 ${s.toShot} 位`);
  }

  const pending = suggestions.filter((s) => !handled.has(s.shot));

  return (
    <>
      <ToolButton
        icon={Scissors}
        label="AI 粗剪"
        rail={rail}
        onClick={handleOpen}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>AI 粗剪建議</DialogTitle>
            <DialogDescription>
              只提建議，由你逐項決定。不會動任何分鏡的時長 —— 那是你的判斷。
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              分析中…
            </div>
          )}

          {!loading && (
            <div className="space-y-3 py-1">
              {summary && (
                <p className="rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
                  {summary}
                </p>
              )}

              {suggestions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  沒有建議的剪接動作 —— 目前的節奏看起來沒問題。
                </p>
              ) : pending.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  所有建議都處理完了。
                </p>
              ) : (
                <ul className="space-y-2">
                  {pending.map((s, i) => (
                    <li
                      key={`${s.shot}-${s.action}-${i}`}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="flex items-center gap-1.5 text-sm font-medium">
                            {s.action === "cut" ? (
                              <>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                建議刪除第 {s.shot} 鏡
                              </>
                            ) : (
                              <>
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                建議把第 {s.shot} 鏡移到第 {s.toShot} 位
                              </>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {s.reason}
                          </p>
                        </div>

                        <div className="flex shrink-0 gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() =>
                              setHandled((h) => new Set(h).add(s.shot))
                            }
                          >
                            忽略
                          </Button>
                          {s.action === "cut" ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => applyCut(s)}
                            >
                              刪除這一鏡
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => applyReorder(s)}
                            >
                              調整順序
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
