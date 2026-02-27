"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFrameStore } from "@/stores/use-frame-store";
import { updateFrameSchema, type Frame } from "@/lib/schemas";
import { cameraOptions, styleOptions, moodOptions } from "@/lib/seedance-options";
import { buildSeedancePrompt } from "@/lib/seedance-prompt";
import { ImageGenerator } from "./image-generator";

export function FrameEditor() {
  const selectedFrameId = useFrameStore((s) => s.selectedFrameId);
  const frame = useFrameStore((s) =>
    s.selectedFrameId ? s.getFrame(s.selectedFrameId) : undefined
  );
  const updateFrame = useFrameStore((s) => s.updateFrame);
  const deleteFrame = useFrameStore((s) => s.deleteFrame);
  const setSelectedFrameId = useFrameStore((s) => s.setSelectedFrameId);

  const form = useForm({
    resolver: zodResolver(updateFrameSchema),
    defaultValues: {
      prompt: "",
      dialogue: "",
      speaker: "",
      cameraMovement: "Fixed" as const,
      duration: 8,
      style: "Cinematic" as const,
      mood: "Moody/Dramatic" as const,
    },
  });

  useEffect(() => {
    if (frame) {
      form.reset({
        prompt: frame.prompt,
        dialogue: frame.dialogue ?? "",
        speaker: frame.speaker ?? "",
        cameraMovement: frame.cameraMovement,
        duration: frame.duration,
        style: frame.style,
        mood: frame.mood,
      });
    }
  }, [frame, form]);

  const watchedValues = form.watch();

  const seedancePreview = useMemo(() => {
    if (!frame) return "";
    const previewFrame: Frame = {
      ...frame,
      prompt: watchedValues.prompt || frame.prompt,
      dialogue: watchedValues.dialogue ?? frame.dialogue,
      speaker: watchedValues.speaker ?? frame.speaker,
      cameraMovement: watchedValues.cameraMovement ?? frame.cameraMovement,
      duration: watchedValues.duration ?? frame.duration,
      style: watchedValues.style ?? frame.style,
      mood: watchedValues.mood ?? frame.mood,
    };
    return buildSeedancePrompt(previewFrame);
  }, [watchedValues, frame]);

  function onSubmit(data: Record<string, unknown>) {
    if (!frame) return;
    updateFrame(frame.id, data as Partial<Frame>);
  }

  function handleDelete() {
    if (!frame) return;
    deleteFrame(frame.id);
    setSelectedFrameId(null);
  }

  const isOpen = !!selectedFrameId && !!frame;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          if (frame) {
            form.handleSubmit(onSubmit)();
          }
          setSelectedFrameId(null);
        }
      }}
    >
      <SheetContent className="w-[460px] overflow-y-auto sm:max-w-[460px]">
        {frame && (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle>分鏡 #{frame.order + 1}</SheetTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <ImageGenerator frameId={frame.id} />

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="prompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>場景描述</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="描述這個場景的畫面..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="speaker"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>說話者</FormLabel>
                          <FormControl>
                            <Input placeholder="角色名稱" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dialogue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>台詞</FormLabel>
                          <FormControl>
                            <Input placeholder="角色台詞..." {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="cameraMovement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>鏡頭運動</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cameraOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="style"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>視覺風格</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {styleOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>氛圍</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {moodOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          時長：{field.value}s
                        </FormLabel>
                        <FormControl>
                          <Slider
                            min={4}
                            max={15}
                            step={1}
                            value={[field.value ?? 8]}
                            onValueChange={([val]) => field.onChange(val)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    儲存變更
                  </Button>
                </form>
              </Form>

              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Seedance 2.0 提示詞預覽
                </p>
                <p className="text-sm leading-relaxed">{seedancePreview}</p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
