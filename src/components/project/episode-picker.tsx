"use client";

import { Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFrameStore } from "@/stores/use-frame-store";
import { useEpisodeStore } from "@/stores/use-episode-store";

/** Radix Select 不接受空字串當 item value */
const UNASSIGNED = "__none__";

/**
 * 分鏡的「所屬集」。
 *
 * **專案沒有任何集時整個元件不渲染** —— 單集專案不該多一個永遠選「未指定」
 * 的欄位。與 CastPicker 一樣直接寫 store,不進 react-hook-form:它不是
 * 需要驗證的表單欄位,混進去只會讓自動儲存的依賴更難推理。
 */
export function EpisodePicker({ frameId }: { frameId: string }) {
  const frame = useFrameStore((s) => s.getFrame(frameId));
  const updateFrame = useFrameStore((s) => s.updateFrame);

  // selector 只取穩定參考,組合在 render body 做
  const seasons = useEpisodeStore((s) => s.seasons);
  const episodes = useEpisodeStore((s) => s.episodes);

  if (!frame) return null;

  const projectSeasons = seasons
    .filter((s) => s.projectId === frame.projectId)
    .sort((a, b) => a.order - b.order);
  const options = projectSeasons.flatMap((season) =>
    episodes
      .filter((e) => e.seasonId === season.id)
      .sort((a, b) => a.order - b.order)
      .map((e) => ({ id: e.id, label: `${season.name} · ${e.name}` }))
  );

  if (options.length === 0) return null;

  // 集被刪掉後可能殘留一個不存在的 id;顯示成未指定而不是空白下拉
  const current =
    frame.episodeId && options.some((o) => o.id === frame.episodeId)
      ? frame.episodeId
      : UNASSIGNED;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Layers className="h-3.5 w-3.5" />
        所屬集
      </div>
      <Select
        value={current}
        onValueChange={(v) =>
          updateFrame(frameId, {
            episodeId: v === UNASSIGNED ? undefined : v,
          })
        }
      >
        <SelectTrigger className="text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>未指定（直接掛在專案下）</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
