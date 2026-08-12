"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Pencil,
  Loader2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCharacterAssetStore } from "@/stores/use-character-asset-store";
import { useGenerateCharacterSheet } from "@/hooks/use-generate-character-sheet";
import {
  loadAssetImage,
  saveAssetImage,
  deleteAssetImage,
} from "@/lib/db";
import {
  CHARACTER_ASSET_TYPES,
  CHARACTER_ASSET_TYPE_LABELS,
  type CharacterAsset,
  type CharacterAssetType,
} from "@/lib/schemas";

const TYPE_BADGE: Record<string, string> = {
  actor: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  presenter: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  reface: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
};

/** 載入某個 IndexedDB 圖片 key 的縮圖 */
function useAssetImage(key: string | undefined) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    // 全程走 async 解析,避免在 effect body 內同步 setState(cascading renders)
    const p = key ? loadAssetImage(key) : Promise.resolve<string | undefined>(undefined);
    p.then((d) => {
      if (alive) setSrc(d ?? null);
    });
    return () => {
      alive = false;
    };
  }, [key]);
  return src;
}

export function CharacterLibrary() {
  const assets = useCharacterAssetStore((s) => s.assets);
  const [editing, setEditing] = useState<CharacterAsset | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">人物資產庫</h2>
          <p className="text-sm text-muted-foreground">
            可跨專案重用的 AI 角色 · 外觀 + 參考圖，生圖／生影片時自動帶入保持一致
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          新增角色
        </Button>
      </div>

      {assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
          <UserRound className="h-14 w-14 text-muted-foreground/40" />
          <div>
            <p className="font-medium">還沒有任何人物資產</p>
            <p className="mt-1 text-sm text-muted-foreground">
              建立一個角色，填外觀後一鍵生成參考圖
            </p>
          </div>
          <Button variant="outline" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            建立第一個角色
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onEdit={() => setEditing(asset)}
            />
          ))}
        </div>
      )}

      <AssetEditorDialog
        open={creating}
        asset={null}
        onOpenChange={(o) => setCreating(o)}
      />
      <AssetEditorDialog
        open={!!editing}
        asset={editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </div>
  );
}

function AssetCard({
  asset,
  onEdit,
}: {
  asset: CharacterAsset;
  onEdit: () => void;
}) {
  const thumb = useAssetImage(asset.referenceImageKeys[0]);
  const deleteAsset = useCharacterAssetStore((s) => s.deleteAsset);
  const generateSheet = useGenerateCharacterSheet();

  async function handleGenerate() {
    try {
      const r = await generateSheet.mutateAsync({ assetId: asset.id });
      toast.success(`已生成設定圖，消耗 ${r.creditCost} credits`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "生成失敗");
    }
  }

  return (
    <div className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {generateSheet.isPending ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-xs">生成設定圖中…</span>
          </div>
        ) : thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={asset.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            <Sparkles className="h-8 w-8" />
            <span className="text-xs">點擊生成設定圖</span>
          </button>
        )}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            TYPE_BADGE[asset.type] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {CHARACTER_ASSET_TYPE_LABELS[asset.type] ?? asset.type}
        </span>
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium">{asset.name}</p>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => {
                deleteAsset(asset.id);
                toast.success(`已刪除「${asset.name}」`);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {asset.appearance}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={handleGenerate}
          disabled={generateSheet.isPending}
        >
          {generateSheet.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          )}
          {thumb ? "重生設定圖" : "生成設定圖"}
        </Button>
      </div>
    </div>
  );
}

function AssetEditorDialog({
  open,
  asset,
  onOpenChange,
}: {
  open: boolean;
  asset: CharacterAsset | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {open && (
          <AssetEditorBody
            key={asset?.id ?? "new"}
            asset={asset}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AssetEditorBody({
  asset,
  onClose,
}: {
  asset: CharacterAsset | null;
  onClose: () => void;
}) {
  const addAsset = useCharacterAssetStore((s) => s.addAsset);
  const updateAsset = useCharacterAssetStore((s) => s.updateAsset);
  const setReferenceImages = useCharacterAssetStore(
    (s) => s.setReferenceImages
  );
  const generateSheet = useGenerateCharacterSheet();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初值來自 props;child 以 key 重掛,切換角色自動重新初始化,不需 effect
  const [name, setName] = useState(asset?.name ?? "");
  const [type, setType] = useState<CharacterAssetType>(asset?.type ?? "actor");
  const [appearance, setAppearance] = useState(asset?.appearance ?? "");

  const isEdit = !!asset;

  // 參考圖改讀 store,生成/上傳後即時反映
  const liveAsset = useCharacterAssetStore((s) =>
    asset ? s.assets.find((a) => a.id === asset.id) : undefined
  );
  const refKeys = liveAsset?.referenceImageKeys ?? [];

  function handleSave() {
    if (!name.trim() || !appearance.trim()) {
      toast.error("請填寫角色名稱與外觀描述");
      return;
    }
    if (isEdit && asset) {
      updateAsset(asset.id, {
        name: name.trim(),
        type,
        appearance: appearance.trim(),
      });
      toast.success("已更新角色");
    } else {
      addAsset({ name: name.trim(), type, appearance: appearance.trim() });
      toast.success(`已建立「${name.trim()}」`);
    }
    onClose();
  }

  async function handleGenerate() {
    if (!asset) {
      toast.error("請先儲存角色，再生成設定圖");
      return;
    }
    // 先把當前編輯內容存起來,設定圖才會依最新外觀生成
    updateAsset(asset.id, {
      name: name.trim(),
      type,
      appearance: appearance.trim(),
    });
    try {
      const r = await generateSheet.mutateAsync({ assetId: asset.id });
      toast.success(`已生成設定圖，消耗 ${r.creditCost} credits`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "生成失敗");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !asset) return;
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("圖片大小不可超過 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const key = await saveAssetImage(asset.id, Date.now(), base64);
      setReferenceImages(asset.id, [
        ...(liveAsset?.referenceImageKeys ?? []),
        key,
      ]);
      toast.success("已加入參考圖");
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveRef(key: string) {
    if (!asset) return;
    void deleteAssetImage(key);
    setReferenceImages(
      asset.id,
      (liveAsset?.referenceImageKeys ?? []).filter((k) => k !== key)
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "編輯角色" : "新增角色"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">角色名稱</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：小雲雀"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">類型</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as CharacterAssetType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHARACTER_ASSET_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CHARACTER_ASSET_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">外觀描述</Label>
            <Textarea
              value={appearance}
              onChange={(e) => setAppearance(e.target.value)}
              placeholder="a young woman with short silver hair, wearing a beige trench coat, calm confident expression"
              rows={3}
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              建議用英文描述，生圖／生影片時會自動帶入這段外觀。
            </p>
          </div>

          {isEdit && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">參考圖</Label>
                <div className="flex gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={generateSheet.isPending}
                  >
                    {generateSheet.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    生成設定圖
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    上傳
                  </Button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
              {refKeys.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  尚無參考圖 — 生成設定圖或上傳照片
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {refKeys.map((k) => (
                    <RefThumb
                      key={k}
                      imageKey={k}
                      onRemove={() => handleRemoveRef(k)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {!isEdit && (
            <p className="rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
              建立後即可在卡片上一鍵生成設定圖、上傳更多參考照。
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>{isEdit ? "儲存" : "建立"}</Button>
        </DialogFooter>
    </>
  );
}

function RefThumb({
  imageKey,
  onRemove,
}: {
  imageKey: string;
  onRemove: () => void;
}) {
  const src = useAssetImage(imageKey);
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="參考圖" className="h-full w-full object-cover" />
      ) : (
        <Skeleton className="h-full w-full" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
