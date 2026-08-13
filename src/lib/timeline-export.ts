import type { Frame } from "./schemas";

/**
 * 導出給剪輯軟體(剪映 / CapCut / Premiere)使用的中性時間軸格式。
 *
 * 刻意不產生剪映草稿檔(draft_content.json):該格式無官方文件、且剪映 6 以上已加密,
 * 綁上去每次剪映改版都會壞。這裡輸出自訂的 timeline.json + 標準 SRT,
 * 素材依 order 命名,匯入剪映後照編號排列即可。
 */

export interface ExportClip {
  /** 從 1 開始的鏡次,對應素材檔名 001、002… */
  shot: number;
  /** zip 內的影片相對路徑,無影片時為 undefined */
  videoFile?: string;
  /** zip 內的分鏡圖相對路徑,無圖時為 undefined */
  imageFile?: string;
  /** 在整條時間軸上的起始秒數 */
  startSec: number;
  durationSec: number;
  speaker: string;
  dialogue: string;
  camera: string;
  style: string;
  mood: string;
  prompt: string;
}

export interface ExportTimeline {
  project: string;
  exportedAt: string;
  fps: number;
  totalDurationSec: number;
  clips: ExportClip[];
}

/** 剪映預設時間軸為 30fps */
const DEFAULT_FPS = 30;

export interface FrameAssetFlags {
  /** 有分鏡圖時給實際副檔名(png / jpg),無圖為 undefined */
  imageExt?: string;
  hasVideo: boolean;
}

/** 素材檔名前綴,例如 shot=1 → "001" */
export function clipBaseName(shot: number): string {
  return String(shot).padStart(3, "0");
}

export function buildTimeline(
  projectName: string,
  frames: Frame[],
  flags: Record<string, FrameAssetFlags>,
  exportedAt: string
): ExportTimeline {
  let cursor = 0;

  const clips = frames.map((frame, index) => {
    const shot = index + 1;
    const base = clipBaseName(shot);
    const flag = flags[frame.id];
    // 有實際影片時以影片長度為準,時間軸才不會跟素材對不上
    const durationSec = frame.videoDurationSec ?? frame.duration;
    const startSec = cursor;
    cursor += durationSec;

    return {
      shot,
      videoFile: flag?.hasVideo ? `assets/${base}.mp4` : undefined,
      imageFile: flag?.imageExt ? `assets/${base}.${flag.imageExt}` : undefined,
      startSec,
      durationSec,
      speaker: frame.speaker ?? "",
      dialogue: frame.dialogue ?? "",
      camera: frame.cameraMovement,
      style: frame.style,
      mood: frame.mood,
      prompt: frame.prompt,
    };
  });

  return {
    project: projectName,
    exportedAt,
    fps: DEFAULT_FPS,
    totalDurationSec: cursor,
    clips,
  };
}

/** 秒數 → SRT 時間碼 HH:MM:SS,mmm */
function toSrtTime(sec: number): string {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(milli, 3)}`;
}

/** 產生 SRT 字幕。沒有對白的鏡次不出字幕,但仍佔用時間軸。 */
export function buildSrt(timeline: ExportTimeline): string {
  const blocks: string[] = [];
  let subtitleIndex = 0;

  for (const clip of timeline.clips) {
    const text = clip.dialogue.trim();
    if (!text) continue;

    subtitleIndex += 1;
    const start = toSrtTime(clip.startSec);
    const end = toSrtTime(clip.startSec + clip.durationSec);
    const line = clip.speaker.trim() ? `${clip.speaker}：${text}` : text;
    blocks.push(`${subtitleIndex}\n${start} --> ${end}\n${line}`);
  }

  return blocks.join("\n\n") + (blocks.length ? "\n" : "");
}

/** 壓縮包內的操作說明,讓下載後不用回頭查文件 */
export function buildReadme(timeline: ExportTimeline): string {
  const missing = timeline.clips.filter((c) => !c.videoFile).map((c) => c.shot);

  return [
    `專案:${timeline.project}`,
    `導出時間:${timeline.exportedAt}`,
    `鏡次數:${timeline.clips.length}　總長:${timeline.totalDurationSec} 秒　時間軸:${timeline.fps}fps`,
    "",
    "【檔案說明】",
    "timeline.json  完整時間軸資料(鏡次、起始秒數、時長、對白、運鏡、提示詞)",
    "subtitle.srt   字幕檔,時間碼已對齊時間軸",
    "assets/        素材,檔名編號即為鏡次順序",
    "",
    "【匯入剪映步驟】",
    "1. 解壓縮後,把 assets 資料夾內的檔案全選拖進剪映素材區",
    "2. 依檔名編號 001、002… 依序拖到時間軸(編號就是分鏡順序)",
    "3. 字幕 → 本地字幕 → 匯入 subtitle.srt,時間碼會自動對上",
    "4. timeline.json 內有每顆鏡頭的運鏡與提示詞,調整轉場時可對照",
    "",
    missing.length
      ? `【注意】以下鏡次尚未生成影片,assets 內只有分鏡圖或沒有素材:${missing.join("、")}`
      : "【注意】所有鏡次都已有影片素材。",
  ].join("\n");
}
