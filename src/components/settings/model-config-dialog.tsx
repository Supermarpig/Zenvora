"use client";

import { useState } from "react";
import { Settings2, Plus, Trash2, RotateCcw } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModelConfigStore } from "@/stores/use-model-config-store";
import {
  imageModelOptions,
  videoModelOptions,
  TEXT_MODEL_OPTIONS,
  resolveImageModel,
  resolveVideoModel,
  resolveTextModel,
} from "@/lib/model-config";
import { customModelSchema } from "@/lib/schemas";
import type { SettingsDialogProps } from "./settings-dialog-props";

/**
 * 模型設定。換 model id 原本要改三個檔案再重新部署 ——
 * 例如 gemini-3-pro-image-preview 於 2026-06-25 停用時就得那樣做。
 *
 * 金鑰刻意不在這裡:localStorage 任何同源腳本都讀得到,金鑰一律留在
 * 伺服器端環境變數。
 */
export function ModelConfigDialog({
  open,
  onOpenChange,
  hideTrigger,
}: SettingsDialogProps = {}) {
  const imageModel = useModelConfigStore((s) => s.imageModel);
  const videoModel = useModelConfigStore((s) => s.videoModel);
  const textModel = useModelConfigStore((s) => s.textModel);
  const customImageModels = useModelConfigStore((s) => s.customImageModels);
  const setImageModel = useModelConfigStore((s) => s.setImageModel);
  const setVideoModel = useModelConfigStore((s) => s.setVideoModel);
  const setTextModel = useModelConfigStore((s) => s.setTextModel);
  const addCustomImageModel = useModelConfigStore((s) => s.addCustomImageModel);
  const removeCustomImageModel = useModelConfigStore(
    (s) => s.removeCustomImageModel
  );
  const reset = useModelConfigStore((s) => s.reset);

  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newCost, setNewCost] = useState("2");

  function handleAddCustom() {
    const parsed = customModelSchema.safeParse({
      id: newId.trim(),
      label: newLabel.trim() || newId.trim(),
      creditCost: Number(newCost) || 0,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    addCustomImageModel(parsed.data);
    setNewId("");
    setNewLabel("");
    setNewCost("2");
    toast.success(`已加入 ${parsed.data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline">
            <Settings2 className="mr-1.5 h-4 w-4" />
            模型設定
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>模型設定</DialogTitle>
          <DialogDescription>
            切換預設模型或加入內建清單沒有的 model id。API 金鑰請設在
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
              .env.local
            </code>
            ，不會存在這裡。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>生圖預設模型</Label>
            <Select
              value={resolveImageModel(imageModel)}
              onValueChange={setImageModel}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {imageModelOptions(customImageModels).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>生影片預設模型</Label>
            <Select
              value={resolveVideoModel(videoModel)}
              onValueChange={setVideoModel}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {videoModelOptions().map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>文字預設模型</Label>
            <Select
              value={resolveTextModel(textModel)}
              onValueChange={setTextModel}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_MODEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              AI 拆鏡、粗剪、匯入小說、計畫預審、推寫資產都用這個模型。
            </p>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <Label className="text-sm">自訂生圖模型</Label>
            <p className="text-xs text-muted-foreground">
              Google 出新模型時不必等改 code。打錯 id 不會在本地被擋，會由
              Google 回錯誤並顯示在 toast。
            </p>

            {customImageModels.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {customImageModels.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded bg-muted/50 px-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{m.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {m.id} · {m.creditCost} credits
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeCustomImageModel(m.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-[1fr_1fr_70px] gap-2 pt-1">
              <Input
                placeholder="model id"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                className="text-xs"
              />
              <Input
                placeholder="顯示名稱"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="text-xs"
              />
              <Input
                type="number"
                min={0}
                placeholder="credits"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                className="text-xs"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleAddCustom}
              disabled={!newId.trim()}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              加入
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reset();
              toast.success("已還原為內建預設");
            }}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            還原內建預設
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
