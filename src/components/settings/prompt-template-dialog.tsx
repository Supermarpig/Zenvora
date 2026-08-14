"use client";

import { useState } from "react";
import { FileText, RotateCcw, History, Check } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePromptTemplateStore } from "@/stores/use-prompt-template-store";
import type { SettingsDialogProps } from "./settings-dialog-props";
import {
  PROMPT_TEMPLATE_IDS,
  TEMPLATE_META,
  renderTemplate,
  resolveTemplate,
  type PromptTemplateId,
  PROMPT_FRAGMENT_IDS,
  FRAGMENT_META,
  resolveFragment,
  type PromptFragmentId,
} from "@/lib/prompt-template";

/** 預覽用的範例值,讓使用者看得出變數會被換成什麼 */
const PREVIEW_VARS: Record<string, string> = {
  prompt: "A red maple leaf on wet grey stone",
  lens: "Shot on 35mm anamorphic lens with oval bokeh…",
  lighting: "Warm golden hour lighting with soft amber rim light…",
  appearance: "Taiwanese woman, early 30s, grey knit sweater",
};

/**
 * Prompt 模板編輯。
 *
 * 只開放結構單純的三個模板 —— buildVeoPrompt / buildGridPrompt 有大量條件
 * 分支,硬塞進平面模板只會比現在更難改。
 */
export function PromptTemplateDialog({
  open,
  onOpenChange,
  hideTrigger,
}: SettingsDialogProps = {}) {
  const overrides = usePromptTemplateStore((s) => s.overrides);
  const setTemplate = usePromptTemplateStore((s) => s.setTemplate);
  const revertToBuiltIn = usePromptTemplateStore((s) => s.revertToBuiltIn);
  const rollback = usePromptTemplateStore((s) => s.rollback);
  const versions = usePromptTemplateStore((s) => s.versions);
  const fragmentOverrides = usePromptTemplateStore((s) => s.fragments);
  const setFragment = usePromptTemplateStore((s) => s.setFragment);
  const revertFragment = usePromptTemplateStore((s) => s.revertFragment);

  const [activeId, setActiveId] = useState<PromptTemplateId>("image");
  const [draft, setDraft] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [fragmentDrafts, setFragmentDrafts] = useState<
    Partial<Record<PromptFragmentId, string>>
  >({});

  const meta = TEMPLATE_META[activeId];
  const current = resolveTemplate(activeId, overrides);
  const body = draft ?? current;
  const isOverridden = Boolean(overrides[activeId]?.trim());
  const templateVersions = versions
    .filter((v) => v.templateId === activeId)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));

  function switchTemplate(id: PromptTemplateId) {
    setActiveId(id);
    setDraft(null);
    setShowHistory(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setDraft(null);
        onOpenChange?.(o);
      }}
    >
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline">
            <FileText className="mr-1.5 h-4 w-4" />
            Prompt 模板
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Prompt 模板</DialogTitle>
          <DialogDescription>
            沒改過的都沿用程式內建版本，所以改壞了隨時能還原。
            影片與宮格 prompt 的結構留在程式裡，但其中的<strong className="text-foreground">固定句子</strong>
            可以在下方改措辭。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="flex flex-wrap gap-1.5">
            {PROMPT_TEMPLATE_IDS.map((id) => (
              <Button
                key={id}
                variant={id === activeId ? "default" : "outline"}
                size="sm"
                onClick={() => switchTemplate(id)}
              >
                {TEMPLATE_META[id].label}
                {overrides[id]?.trim() && (
                  <Check className="ml-1.5 h-3 w-3" />
                )}
              </Button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">{meta.description}</p>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm">模板內容</Label>
              <p className="text-[11px] text-muted-foreground">
                可用變數：
                {meta.variables.map((v) => (
                  <code
                    key={v}
                    className="ml-1 rounded bg-muted px-1 py-0.5 font-mono"
                  >{`{{${v}}}`}</code>
                ))}
              </p>
            </div>
            <Textarea
              rows={10}
              value={body}
              onChange={(e) => setDraft(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              預覽（變數已換成範例值）
            </Label>
            <p className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
              {renderTemplate(body, PREVIEW_VARS)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={draft === null || draft === current}
              onClick={() => {
                setTemplate(activeId, body);
                setDraft(null);
                toast.success("已儲存，並記下一筆版本");
              }}
            >
              儲存
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!isOverridden}
              onClick={() => {
                revertToBuiltIn(activeId);
                setDraft(null);
                toast.success("已還原為內建模板");
              }}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              還原內建
            </Button>
            {templateVersions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory((v) => !v)}
              >
                <History className="mr-1.5 h-4 w-4" />
                版本歷史（{templateVersions.length}）
              </Button>
            )}
          </div>

          {showHistory && (
            <ul className="space-y-1.5 rounded-lg border p-2">
              {templateVersions.map((v) => (
                <li
                  key={v.id}
                  className="flex items-start justify-between gap-2 rounded bg-muted/40 px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(v.savedAt).toLocaleString("zh-TW")}
                    </p>
                    <p className="truncate font-mono text-[11px]">{v.body}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 text-xs"
                    onClick={() => {
                      rollback(v.id);
                      setDraft(null);
                      toast.success("已回滾到該版本");
                    }}
                  >
                    回滾
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {/* --- 固定句片段 --- */}
          <div className="space-y-3 border-t pt-4">
            <div>
              <Label className="text-sm">影片 / 宮格的固定句子</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                這些 prompt 的<strong className="text-foreground">結構</strong>
                （哪一句在什麼條件下出現）留在程式裡，因為那是邏輯不是文字；
                這裡開放的是<strong className="text-foreground">措辭</strong>。
                所以沒有變數也沒有語法，就是一句話。
              </p>
            </div>

            <ul className="space-y-3">
              {PROMPT_FRAGMENT_IDS.map((id) => {
                const fm = FRAGMENT_META[id];
                const value =
                  fragmentDrafts[id] ?? resolveFragment(id, fragmentOverrides);
                const overridden = Boolean(fragmentOverrides[id]?.trim());
                const dirty =
                  fragmentDrafts[id] !== undefined &&
                  fragmentDrafts[id] !== resolveFragment(id, fragmentOverrides);

                return (
                  <li key={id} className="space-y-1.5 rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs font-medium">
                          {fm.label}
                          {overridden && (
                            <span className="rounded bg-primary/15 px-1.5 text-[10px] text-primary">
                              已改
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {fm.appearsWhen}
                        </p>
                      </div>
                      {overridden && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 text-xs"
                          onClick={() => {
                            revertFragment(id);
                            setFragmentDrafts((d) => {
                              const next = { ...d };
                              delete next[id];
                              return next;
                            });
                            toast.success("已還原內建句子");
                          }}
                        >
                          還原
                        </Button>
                      )}
                    </div>

                    <Textarea
                      value={value}
                      rows={2}
                      className="resize-none font-mono text-[11px]"
                      onChange={(e) =>
                        setFragmentDrafts((d) => ({ ...d, [id]: e.target.value }))
                      }
                    />

                    {dirty && (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setFragment(id, fragmentDrafts[id] ?? "");
                            setFragmentDrafts((d) => {
                              const next = { ...d };
                              delete next[id];
                              return next;
                            });
                            toast.success("已儲存");
                          }}
                        >
                          儲存
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            setFragmentDrafts((d) => {
                              const next = { ...d };
                              delete next[id];
                              return next;
                            })
                          }
                        >
                          取消
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
