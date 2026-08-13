"use client";

import { useRef, useState } from "react";
import { Archive, Download, Upload, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useProjectStore } from "@/stores/use-project-store";
import { useFrameStore } from "@/stores/use-frame-store";
import { useCharacterAssetStore } from "@/stores/use-character-asset-store";
import {
  snapshotToZip,
  parseSnapshotZip,
  dataUrlToPayload,
  type MediaPayload,
  type ParsedSnapshot,
} from "@/lib/snapshot";
import {
  loadImage,
  loadVideo,
  loadAssetImage,
  restoreRawValue,
} from "@/lib/db";
import type { Snapshot } from "@/lib/schemas";

const ALL = "__all__";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 備份與還原。
 *
 * 匯入刻意分兩階段:先解析並顯示「會還原什麼」,使用者確認後才寫入。
 * 因為還原會覆蓋同 id 的資料,不該點一下就發生。
 *
 * 還原**只新增與覆蓋,不刪除**備份裡沒有的東西 —— 否則使用者匯入一個舊的
 * 單專案備份就會把其他專案清掉。
 */
export function BackupDialog() {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<string>(ALL);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ParsedSnapshot | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const projects = useProjectStore((s) => s.projects);
  const importProject = useProjectStore((s) => s.importProject);
  const importFrames = useFrameStore((s) => s.importFrames);
  const upsertAssets = useCharacterAssetStore((s) => s.upsertAssets);

  async function handleExport() {
    setBusy(true);
    try {
      const allFrames = useFrameStore.getState().frames;
      const allAssets = useCharacterAssetStore.getState().assets;

      const targetProjects =
        scope === ALL ? projects : projects.filter((p) => p.id === scope);
      const projectIds = new Set(targetProjects.map((p) => p.id));
      const frames = allFrames.filter((f) => projectIds.has(f.projectId));

      if (targetProjects.length === 0) {
        toast.info("沒有可備份的專案");
        return;
      }

      const media: MediaPayload[] = [];

      for (const frame of frames) {
        const image = await loadImage(frame.id);
        if (image) {
          const payload = dataUrlToPayload(`image-${frame.id}`, image);
          if (payload) media.push(payload);
        }
        const video = await loadVideo(frame.id);
        if (video) {
          media.push({
            key: `video-${frame.id}`,
            kind: "blob",
            mime: video.type || "video/mp4",
            data: new Uint8Array(await video.arrayBuffer()) as Uint8Array<ArrayBuffer>,
          });
        }
      }

      // 資產一律全帶 —— 它們是跨專案共用的,少帶會讓還原後的選角失效
      for (const asset of allAssets) {
        for (const key of asset.referenceImageKeys) {
          const img = await loadAssetImage(key);
          if (!img) continue;
          const payload = dataUrlToPayload(key, img);
          if (payload) media.push(payload);
        }
      }

      const snapshot: Omit<Snapshot, "mediaManifest"> = {
        version: 1,
        scope: scope === ALL ? "all" : "project",
        exportedAt: new Date().toISOString(),
        projects: targetProjects,
        frames,
        assets: allAssets,
      };

      const zip = snapshotToZip(snapshot, media);
      const name =
        scope === ALL
          ? "frameforge-全部備份.zip"
          : `${targetProjects[0].name}-備份.zip`;

      const url = URL.createObjectURL(zip);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(
        `已匯出 ${targetProjects.length} 個專案、${frames.length} 格分鏡、${allAssets.length} 個資產(${formatSize(zip.size)})`
      );
    } catch (err) {
      toast.error(`匯出失敗:${err instanceof Error ? err.message : "未知錯誤"}`);
    } finally {
      setBusy(false);
    }
  }

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    try {
      setPending(await parseSnapshotZip(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "無法讀取備份");
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (!pending) return;
    setBusy(true);
    try {
      const { snapshot, media } = pending;

      for (const [key, value] of media) {
        await restoreRawValue(key, value);
      }

      snapshot.projects.forEach((p) => importProject(p));
      // importFrames 依 projectId 取代該專案的分鏡,所以要逐專案呼叫
      const byProject = new Map<string, typeof snapshot.frames>();
      for (const f of snapshot.frames) {
        const list = byProject.get(f.projectId) ?? [];
        list.push(f);
        byProject.set(f.projectId, list);
      }
      byProject.forEach((frames) => importFrames(frames));
      upsertAssets(snapshot.assets);

      toast.success(
        `已還原 ${snapshot.projects.length} 個專案、${snapshot.frames.length} 格分鏡、${snapshot.assets.length} 個資產`
      );
      setPending(null);
      setOpen(false);
    } catch (err) {
      toast.error(`還原失敗:${err instanceof Error ? err.message : "未知錯誤"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPending(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Archive className="mr-1.5 h-4 w-4" />
          備份
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>備份與還原</DialogTitle>
          <DialogDescription>
            資料都存在這台瀏覽器裡，換裝置或清快取前先匯出一份。素材(圖片與影片)會一起打包。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label className="text-sm">匯出範圍</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>全部專案（{projects.length}）</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              資產庫一律整份帶走 —— 它是跨專案共用的，少帶會讓還原後的選角失效。
            </p>
            <Button size="sm" onClick={handleExport} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              匯出備份
            </Button>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label className="text-sm">還原</Label>
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={handlePick}
            />

            {!pending ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                >
                  <Upload className="mr-1.5 h-4 w-4" />
                  選擇備份檔
                </Button>
                <p className="text-xs text-muted-foreground">
                  會先顯示內容讓你確認，不會一點就覆蓋。
                </p>
              </>
            ) : (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm">
                  這份備份包含 {pending.snapshot.projects.length} 個專案、
                  {pending.snapshot.frames.length} 格分鏡、
                  {pending.snapshot.assets.length} 個資產、
                  {pending.media.size} 個素材檔。
                </p>
                <p className="text-xs text-muted-foreground">
                  匯出時間：
                  {new Date(pending.snapshot.exportedAt).toLocaleString("zh-TW")}
                </p>
                <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  同名 id 的專案與分鏡會被這份備份覆蓋；備份裡沒有的資料不會被刪除。
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleRestore} disabled={busy}>
                    {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    確認還原
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPending(null)}
                    disabled={busy}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
