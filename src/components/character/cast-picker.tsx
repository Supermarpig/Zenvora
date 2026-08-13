"use client";

import Link from "next/link";
import { UsersRound, Check, ImageOff } from "lucide-react";
import { useCharacterAssetStore } from "@/stores/use-character-asset-store";
import { useFrameStore } from "@/stores/use-frame-store";
import { CHARACTER_ASSET_TYPE_LABELS } from "@/lib/schemas";

interface CastPickerProps {
  frameId: string;
}

export function CastPicker({ frameId }: CastPickerProps) {
  const frame = useFrameStore((s) => s.getFrame(frameId));
  const updateFrame = useFrameStore((s) => s.updateFrame);
  const assets = useCharacterAssetStore((s) => s.assets);

  const castIds = frame?.castIds ?? [];

  function toggle(id: string) {
    const next = castIds.includes(id)
      ? castIds.filter((c) => c !== id)
      : [...castIds, id];
    updateFrame(frameId, { castIds: next });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <UsersRound className="h-3.5 w-3.5" />
        出場人物
        {castIds.length > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
            {castIds.length}
          </span>
        )}
      </div>

      {assets.length === 0 ? (
        <Link
          href="/characters"
          className="block rounded-lg border border-dashed p-2.5 text-center text-[11px] text-muted-foreground hover:bg-muted/50"
        >
          尚無資產 — 前往「資產庫」建立可重用的人物與場景
        </Link>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {assets.map((a) => {
            const selected = castIds.includes(a.id);
            const hasRef = a.referenceImageKeys.length > 0;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggle(a.id)}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/60"
                }`}
                title={`${CHARACTER_ASSET_TYPE_LABELS[a.type] ?? a.type}${
                  hasRef ? "" : "（尚無參考圖，僅帶外觀文字）"
                }`}
              >
                {selected && <Check className="h-3 w-3" />}
                {!hasRef && <ImageOff className="h-3 w-3 opacity-60" />}
                {a.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
