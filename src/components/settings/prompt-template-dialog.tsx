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
import {
  PROMPT_TEMPLATE_IDS,
  TEMPLATE_META,
  renderTemplate,
  resolveTemplate,
  type PromptTemplateId,
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
export function PromptTemplateDialog() {
  const overrides = usePromptTemplateStore((s) => s.overrides);
  const setTemplate = usePromptTemplateStore((s) => s.setTemplate);
  const revertToBuiltIn = usePromptTemplateStore((s) => s.revertToBuiltIn);
  const rollback = usePromptTemplateStore((s) => s.rollback);
  const versions = usePromptTemplateStore((s) => s.versions);

  const [activeId, setActiveId] = useState<PromptTemplateId>("image");
  const [draft, setDraft] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

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
    <Dialog onOpenChange={(o) => !o && setDraft(null)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="mr-1.5 h-4 w-4" />
          Prompt 模板
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Prompt 模板</DialogTitle>
          <DialogDescription>
            沒改過的模板會沿用程式內建版本，所以改壞了隨時能還原。影片與宮格
            prompt 有大量條件分支，未開放編輯。
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
