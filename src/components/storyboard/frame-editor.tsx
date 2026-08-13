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
import { buildVeoPrompt } from "@/lib/veo-prompt";
import { ImageGenerator } from "./image-generator";
import { VideoPanel } from "./video-panel";
import { CastPicker } from "@/components/character/cast-picker";

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

  // 只在「切換到另一個分鏡」時把表單灌回 store 的值。
  // 依賴刻意只放 selectedFrameId 而非整個 frame 物件 —— 否則下面的自動儲存
  // 一改 store 就會產生新 frame 物件、觸發 reset、再觸發儲存,形成循環。
  // frame 從 getState() 即時取,不會拿到 stale 值。
  useEffect(() => {
    if (!selectedFrameId) return;
    const f = useFrameStore.getState().getFrame(selectedFrameId);
    if (!f) return;
    form.reset({
      prompt: f.prompt,
      dialogue: f.dialogue ?? "",
      speaker: f.speaker ?? "",
      cameraMovement: f.cameraMovement,
      duration: f.duration,
      style: f.style,
      mood: f.mood,
    });
  }, [selectedFrameId, form]);

  const watchedValues = form.watch();

  // 自動儲存,與提示詞總表的行為一致(那邊是 debounce 500ms)。
  // 依賴用序列化字串:值沒真的變就不會重新排程,循環在此斷開。
  const serializedValues = JSON.stringify(watchedValues);
  useEffect(() => {
    if (!selectedFrameId) return;
    const timer = setTimeout(() => {
      updateFrame(selectedFrameId, JSON.parse(serializedValues) as Partial<Frame>);
    }, 500);
    return () => clearTimeout(timer);
  }, [serializedValues, selectedFrameId, updateFrame]);

  const veoPreview = useMemo(() => {
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
    return buildVeoPrompt(previewFrame);
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
      <SheetContent className="w-full gap-0 sm:max-w-[min(1120px,94vw)]">
        {frame && (
          <>
            {/* 標題與操作固定在頂部,儲存不必滾到底部才按得到 */}
            <SheetHeader className="shrink-0 border-b pr-12">
              <div className="flex items-center justify-between gap-3">
                <SheetTitle>分鏡 #{frame.order + 1}</SheetTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={form.handleSubmit(onSubmit)}>
                    儲存變更
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            {/* 左欄放視覺(圖/影片),右欄放編輯欄位,避免兩個空預覽框把表單壓到看不見。
                用 container query 而非視窗 breakpoint:面板嵌在窄的預覽 pane 裡時,
                看的是面板自己的寬度,不是整個視窗。 */}
            <div className="@container flex-1 overflow-y-auto p-6">
              <div className="grid gap-6 @2xl:grid-cols-2">
                {/* 單欄時限寬,否則 aspect-video 預覽框會跟著容器寬度長到 400px 高 */}
                <div className="max-w-[560px] space-y-4 @2xl:max-w-none">
                  <ImageGenerator frameId={frame.id} />
                  <VideoPanel frameId={frame.id} />
                </div>

                <div className="space-y-4">
                  <CastPicker frameId={frame.id} />

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
                            placeholder="描述這個場景的畫面...（可用 @名稱 引用資產庫的人物或場景）"
                            rows={8}
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

                    </form>
                  </Form>

                  {/* 預覽是唯讀參考,收起來不佔位 */}
                  <details className="rounded-lg border bg-muted/50">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">
                      Veo 3 提示詞預覽
                    </summary>
                    <p className="border-t px-3 py-2 text-sm leading-relaxed">
                      {veoPreview}
                    </p>
                  </details>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
