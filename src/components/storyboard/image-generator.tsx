"use client";

import { useState } from "react";
import { Loader2, ImageIcon, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useGenerateImage } from "@/hooks/use-generate-image";
import { useImageStorage } from "@/hooks/use-image-storage";
import { useFrameStore } from "@/stores/use-frame-store";
import { modelOptions, imageSizeOptions } from "@/lib/seedance-options";
import type { GenerateImageInput } from "@/actions/generate-image";

interface ImageGeneratorProps {
  frameId: string;
}

export function ImageGenerator({ frameId }: ImageGeneratorProps) {
  const frame = useFrameStore((s) => s.getFrame(frameId));
  const updateFrame = useFrameStore((s) => s.updateFrame);
  const { imageData, isLoading: isLoadingImage, save, remove } = useImageStorage(frameId);
  const generateMutation = useGenerateImage();

  const [model, setModel] = useState<GenerateImageInput["model"]>("gemini-2.5-flash-image");
  const [imageSize, setImageSize] = useState<GenerateImageInput["imageSize"]>("16:9");

  async function handleGenerate() {
    if (!frame?.prompt) {
      toast.error("請先填寫場景描述");
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        prompt: frame.prompt,
        model,
        imageSize,
      });

      await save(result.base64);
      updateFrame(frameId, {
        imageBase64Key: `image-${frameId}`,
        creditCost: result.creditCost,
      });
      toast.success(`生圖完成，消耗 ${result.creditCost} credits`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "生圖失敗");
    }
  }

  async function handleRemove() {
    await remove();
    updateFrame(frameId, { imageBase64Key: undefined, creditCost: undefined });
    toast.success("圖片已移除");
  }

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
        {isLoadingImage ? (
          <Skeleton className="h-full w-full" />
        ) : imageData ? (
          <img
            src={imageData}
            alt="分鏡圖片"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
            <p className="text-sm">尚未生成圖片</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={model} onValueChange={(v) => setModel(v as GenerateImageInput["model"])}>
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {modelOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={imageSize} onValueChange={(v) => setImageSize(v as GenerateImageInput["imageSize"])}>
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {imageSizeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleGenerate}
          disabled={generateMutation.isPending || !frame?.prompt}
          className="flex-1"
        >
          {generateMutation.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-4 w-4" />
          )}
          {generateMutation.isPending ? "生成中..." : "生成圖片"}
        </Button>
        {imageData && (
          <Button variant="outline" size="icon" onClick={handleRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
