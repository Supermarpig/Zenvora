"use client";

import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFrameStore } from "@/stores/use-frame-store";
import { useProjectStore } from "@/stores/use-project-store";
import { useCharacterAssetStore } from "@/stores/use-character-asset-store";
import { useGenerateStoryboard } from "@/hooks/use-generate-storyboard";
import { VISUAL_STYLES } from "@/lib/schemas";

interface StoryboardGeneratorProps {
  projectId: string;
  /** 觸發按鈕樣式:工具列(小)或空狀態(大 CTA) */
  variant?: "toolbar" | "cta";
}

export function StoryboardGenerator({
  projectId,
  variant = "toolbar",
}: StoryboardGeneratorProps) {
  const project = useProjectStore((s) => s.getProject(projectId));
  const assets = useCharacterAssetStore((s) => s.assets);
  const appendFrames = useFrameStore((s) => s.appendFrames);
  const gen = useGenerateStoryboard();

  const [open, setOpen] = useState(false);
  const [premise, setPremise] = useState("");
  const [count, setCount] = useState(8);
  const [genre, setGenre] = useState("");
  const [style, setStyle] = useState<string>("Cinematic");

  async function handleGenerate() {
    if (!premise.trim()) {
      toast.error("請先輸入故事 / 主題");
      return;
    }
    try {
      const shots = await gen.mutateAsync({
        premise: premise.trim(),
        frameCount: count,
        genre: genre.trim() || undefined,
        style: style as (typeof VISUAL_STYLES)[number],
        characters: (project?.characters ?? []).map((c) => c.name),
        // 只餵人物與場景 —— 道具與服裝在分鏡描述裡用 @ 引用的價值低,
        // 名單太長反而會讓模型亂標
        mentionableAssets: assets
          .filter((a) => (a.kind ?? "character") === "character" || a.kind === "scene")
          .map((a) => a.name),
      });
      appendFrames(projectId, shots);
      toast.success(`已生成 ${shots.length} 個分鏡的場景與台詞`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "生成失敗");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "cta" ? (
          <Button size="lg">
            <Wand2 className="mr-1.5 h-4 w-4" />
            AI 一鍵生成分鏡腳本
          </Button>
        ) : (
          <Button variant="default" size="sm">
            <Wand2 className="mr-1.5 h-4 w-4" />
            AI 生成分鏡
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>AI 一鍵生成分鏡腳本</DialogTitle>
          <p className="text-sm text-muted-foreground">
            一句故事 → 自動拆成多個分鏡,每格填好場景描述與台詞。之後可再逐格生圖 / 生影片。
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">故事 / 主題</Label>
            <Textarea
              value={premise}
              onChange={(e) => setPremise(e.target.value)}
              placeholder="例如:一個外送員在末日城市送最後一單,途中發現訂單背後的祕密。喜劇轉懸疑。"
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">分鏡數量:{count} 格</Label>
            <Slider
              min={2}
              max={24}
              step={1}
              value={[count]}
              onValueChange={([v]) => setCount(v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">類型 / 調性(選填)</Label>
              <Input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="喜劇 / 懸疑 / 熱血…"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">視覺風格</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISUAL_STYLES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
            這步只用文字模型(便宜、通常免費額度就能跑),不消耗生圖額度。生成後會接在現有分鏡後面。
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleGenerate} disabled={gen.isPending}>
            {gen.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-1.5 h-4 w-4" />
            )}
            {gen.isPending ? "生成中…" : "生成分鏡"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
