"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  CircleAlert,
  TriangleAlert,
  Info,
  CircleCheck,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFrameStore } from "@/stores/use-frame-store";
import { useCharacterAssetStore } from "@/stores/use-character-asset-store";
import { useModelConfigStore } from "@/stores/use-model-config-store";
import { MODEL_CREDIT_COST } from "@/lib/credits";
import { getModelOption } from "@/lib/video";
import { resolveImageModel, resolveVideoModel } from "@/lib/model-config";
import { reviewPlan, type PlanReview, type IssueSeverity } from "@/lib/plan-review";
import { toast } from "sonner";
import {
  reviewPlanWithAi,
  type AiPlanIssue,
  type AiIssueCategory,
} from "@/actions/review-plan-ai";
import { inferAsset } from "@/actions/infer-asset";
import { ASSET_KIND_LABELS } from "@/lib/schemas";

const AI_CATEGORY_LABELS: Record<AiIssueCategory, string> = {
  continuity: "連戲",
  axis: "跳軸",
  "prompt-quality": "描述品質",
  pacing: "節奏",
};

const SEVERITY_META: Record<
  IssueSeverity,
  { label: string; icon: typeof CircleAlert; className: string }
> = {
  blocker: {
    label: "必須處理",
    icon: CircleAlert,
    className: "text-destructive",
  },
  warning: {
    label: "建議檢查",
    icon: TriangleAlert,
    className: "text-amber-600 dark:text-amber-500",
  },
  hint: { label: "提醒", icon: Info, className: "text-muted-foreground" },
};

/**
 * 生成前的計畫預審。
 *
 * 存在的理由是成本:生圖免費層 limit 0、影片沒有免費層,每次生成都要錢。
 * 在按下「批次生圖」之前先掃一遍,比事後發現第 7 鏡是空的便宜太多。
 *
 * 刻意只做建議、不阻擋 —— 有 blocker 也讓使用者自己決定要不要照樣生成。
 */
export function PlanReviewDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<PlanReview | null>(null);
  const [aiIssues, setAiIssues] = useState<AiPlanIssue[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [fillingAsset, setFillingAsset] = useState<string | null>(null);
  const [filled, setFilled] = useState<Set<string>>(new Set());

  const getFramesByProject = useFrameStore((s) => s.getFramesByProject);
  const assets = useCharacterAssetStore((s) => s.assets);
  const addAsset = useCharacterAssetStore((s) => s.addAsset);
  const imageModelOverride = useModelConfigStore((s) => s.imageModel);
  const videoModelOverride = useModelConfigStore((s) => s.videoModel);

  function handleOpen() {
    const imageModel = resolveImageModel(imageModelOverride);
    const videoModel = resolveVideoModel(videoModelOverride);

    // 單價在這裡查表後傳入,plan-review 本身保持純函式(才能單元測試)
    setAiIssues(null);
    setFilled(new Set());
    setReview(
      reviewPlan(getFramesByProject(projectId), assets, {
        imageUnitCredits: MODEL_CREDIT_COST[imageModel] ?? 2,
        videoUnitCreditsPerSec: getModelOption(videoModel)?.creditCost ?? 0,
      })
    );
    setOpen(true);
  }

  /**
   * 補齊一個缺失的資產:讀它出現過的分鏡描述,讓模型推一份外觀草稿。
   * 使用者再改比從白紙開始快得多。
   */
  async function handleFillAsset(name: string) {
    const contexts = getFramesByProject(projectId)
      .map((f) => f.prompt)
      .filter((p) => p.includes(`@${name}`))
      .slice(0, 6);

    if (contexts.length === 0) {
      toast.error(`找不到提到 @${name} 的分鏡`);
      return;
    }

    setFillingAsset(name);
    const result = await inferAsset({
      name,
      contexts,
      textModel: useModelConfigStore.getState().textModel,
    });
    setFillingAsset(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    addAsset({
      name,
      kind: result.kind,
      type: "actor",
      appearance: result.appearance,
    });
    setFilled((f) => new Set(f).add(name));
    toast.success(
      `已建立${ASSET_KIND_LABELS[result.kind]}資產「${name}」，外觀可到資產庫再修`
    );
  }

  /** AI 檢查要花 API 額度,所以按需觸發而不是開啟就跑 */
  async function handleAiCheck() {
    const frames = getFramesByProject(projectId);
    if (frames.length < 2) {
      toast.info("至少要有 2 個分鏡才能檢查連戲");
      return;
    }
    setAiLoading(true);
    const result = await reviewPlanWithAi({
      textModel: useModelConfigStore.getState().textModel,
      shots: frames.map((f, i) => ({
        shot: i + 1,
        prompt: f.prompt,
        dialogue: f.dialogue ?? "",
        speaker: f.speaker ?? "",
        camera: f.cameraMovement,
        durationSec: f.videoDurationSec ?? f.duration,
      })),
    });
    setAiLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setAiIssues(result.issues);
    toast.success(
      result.issues.length === 0
        ? "AI 沒有發現連戲或節奏問題"
        : `AI 提出 ${result.issues.length} 項觀察`
    );
  }

  const grouped = (["blocker", "warning", "hint"] as IssueSeverity[])
    .map((severity) => ({
      severity,
      items: review?.issues.filter((i) => i.severity === severity) ?? [],
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <ClipboardCheck className="mr-1.5 h-4 w-4" />
        計畫預審
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>計畫預審</DialogTitle>
            <DialogDescription>
              生成前先掃一遍,避免把額度花在有問題的分鏡上。這裡只提出建議，不會阻擋生成。
            </DialogDescription>
          </DialogHeader>

          {review && (
            <div className="space-y-4 py-1">
              <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center">
                <div>
                  <p className="text-lg font-semibold">
                    {review.cost.framesNeedingImage}
                  </p>
                  <p className="text-xs text-muted-foreground">張圖待生成</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {review.cost.framesNeedingVideo}
                  </p>
                  <p className="text-xs text-muted-foreground">支影片待生成</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {review.cost.totalCredits}
                  </p>
                  <p className="text-xs text-muted-foreground">預估 credits</p>
                </div>
              </div>

              {grouped.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                  <CircleCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                  沒有發現問題，全片 {review.totalDurationSec} 秒。
                </div>
              ) : (
                grouped.map((group) => {
                  const meta = SEVERITY_META[group.severity];
                  const Icon = meta.icon;
                  return (
                    <div key={group.severity} className="space-y-1.5">
                      <p
                        className={`flex items-center gap-1.5 text-xs font-medium ${meta.className}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}（{group.items.length}）
                      </p>
                      <ul className="space-y-1.5">
                        {group.items.map((issue, i) => (
                          <li
                            key={`${issue.category}-${issue.shot ?? "all"}-${i}`}
                            className="rounded border px-3 py-2 text-sm"
                          >
                            <p>{issue.message}</p>
                            {issue.suggestion && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {issue.suggestion}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })
              )}

              {/* 批量補齊:@ 了但不存在的資產,讓模型讀上下文推一份外觀草稿 */}
              {review.missingAssets.filter((n) => !filled.has(n)).length > 0 && (
                <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium">補齊缺失的資產</p>
                  <p className="text-xs text-muted-foreground">
                    這些名稱被 @ 引用但資產庫沒有。建立後 @ 才會帶入參考圖，否則只會被當普通文字。
                  </p>
                  <ul className="space-y-1.5">
                    {review.missingAssets
                      .filter((n) => !filled.has(n))
                      .map((name) => (
                        <li
                          key={name}
                          className="flex items-center justify-between gap-2 rounded bg-background px-2 py-1.5"
                        >
                          <code className="text-xs">@{name}</code>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={fillingAsset !== null}
                            onClick={() => handleFillAsset(name)}
                          >
                            {fillingAsset === name ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="mr-1 h-3 w-3" />
                            )}
                            讀上下文建立
                          </Button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* AI 語意檢查:程式規則管不到的連戲、跳軸、描述品質 */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">AI 深度檢查</p>
                    <p className="text-xs text-muted-foreground">
                      連戲、跳軸、描述是否生得出東西 —— 這些程式判斷不了。用文字模型，不耗生圖額度。
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={handleAiCheck}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1.5 h-4 w-4" />
                    )}
                    {aiIssues === null ? "開始檢查" : "重新檢查"}
                  </Button>
                </div>

                {aiIssues !== null && aiIssues.length === 0 && (
                  <p className="rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
                    AI 沒有發現連戲或節奏問題。
                  </p>
                )}

                {aiIssues !== null && aiIssues.length > 0 && (
                  <ul className="space-y-1.5">
                    {aiIssues.map((issue, i) => (
                      <li
                        key={`${issue.category}-${issue.shot ?? "all"}-${i}`}
                        className="rounded border px-3 py-2 text-sm"
                      >
                        <p className="flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              issue.severity === "warning"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-500"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {AI_CATEGORY_LABELS[issue.category]}
                          </span>
                          {issue.shot ? `第 ${issue.shot} 鏡` : "全片"}
                        </p>
                        <p className="mt-0.5">{issue.message}</p>
                        {issue.suggestion && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {issue.suggestion}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
