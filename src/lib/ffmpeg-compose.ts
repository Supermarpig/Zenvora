/**
 * 用 ffmpeg.wasm 在瀏覽器裡把多段影片接成一支成片(N4)。
 *
 * ## 三個刻意的選擇
 *
 * **1. 單執行緒 core,不加 COOP/COEP。**
 * 多執行緒版要 `SharedArrayBuffer`,那需要整站掛
 * `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`。
 * 那組 header 會擋掉所有沒 opt-in 的跨來源資源,影響範圍是**整個站**,
 * 而回歸測試需要生圖與影片下載代理都能跑 —— 那兩個現在都沒有額度可驗。
 * 單執行緒慢一些,但**零 blast radius**。
 *
 * **2. 串流複製(`-c copy`)而不是重新編碼。**
 * 重新編碼在單執行緒 wasm 裡慢得離譜,而且所有輸入與輸出都得同時擠在
 * wasm 記憶體裡,長片會直接 OOM。串流複製幾乎不花 CPU。
 * 代價:**各段的編碼參數必須一致**。同一個引擎產出的片段通常一致,
 * 不一致時 ffmpeg 會報錯 —— 那時就照實把錯誤丟給使用者,而不是偷偷重編。
 *
 * **3. 動態 import。**
 * core 是二十幾 MB 的 wasm,絕不能在首頁載入時就抓。
 * 使用者按下「合成成片」才載。
 *
 * 失敗一律回 `{ ok: false }` 並附原因,呼叫端負責降級回導出剪映的流程 ——
 * 這個功能是**加分項不是必要路徑**,壞了不該讓使用者無路可走。
 */

/** ffmpeg.wasm core 的 CDN 版本;與 package.json 的 @ffmpeg/ffmpeg 對應 */
const CORE_VERSION = "0.12.10";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

export interface ComposeClip {
  /** 時間軸順序,從 1 開始 —— 只用來組檔名與錯誤訊息 */
  shot: number;
  data: Uint8Array<ArrayBuffer>;
}

export type ComposeResult =
  | { ok: true; data: Uint8Array<ArrayBuffer>; mime: string }
  | { ok: false; reason: string };

/**
 * 瀏覽器支不支援。**不會載入 core** —— 只做便宜的能力偵測,
 * 讓 UI 能在按下去之前就決定要不要顯示這個按鈕。
 */
export function canCompose(): { ok: boolean; reason?: string } {
  if (typeof WebAssembly === "undefined") {
    return { ok: false, reason: "這個瀏覽器不支援 WebAssembly" };
  }
  // Blob URL 是載入 core 的方式,被 CSP 擋掉就不用試了
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return { ok: false, reason: "這個瀏覽器不支援 Blob URL" };
  }
  return { ok: true };
}

/** concat demuxer 的清單檔。檔名由我們產生,不含使用者輸入,所以不需要轉義 */
export function buildConcatList(names: string[]): string {
  return names.map((n) => `file '${n}'`).join("\n") + "\n";
}

/**
 * 把多段影片接成一支。
 *
 * @param onProgress 0–1;core 載入階段回報不了,所以載入完才開始有數字
 */
export async function composeClips(
  clips: ComposeClip[],
  onProgress?: (ratio: number) => void
): Promise<ComposeResult> {
  const support = canCompose();
  if (!support.ok) return { ok: false, reason: support.reason! };
  if (clips.length === 0) return { ok: false, reason: "沒有可合成的片段" };

  try {
    // 動態 import:這兩個模組本身不大,但它們會去抓二十幾 MB 的 core
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import("@ffmpeg/ffmpeg"),
      import("@ffmpeg/util"),
    ]);

    const ffmpeg = new FFmpeg();
    if (onProgress) {
      ffmpeg.on("progress", ({ progress }) => {
        // ffmpeg 偶爾回超出 0–1 的值,夾住免得進度條爆掉
        onProgress(Math.min(1, Math.max(0, progress)));
      });
    }

    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });

    const names = clips.map((c) => `in${String(c.shot).padStart(3, "0")}.mp4`);
    for (const [i, clip] of clips.entries()) {
      await ffmpeg.writeFile(names[i], clip.data);
    }
    await ffmpeg.writeFile(
      "list.txt",
      new TextEncoder().encode(buildConcatList(names))
    );

    // -safe 0 是因為清單裡是相對檔名;-c copy 見檔頭第 2 點
    const code = await ffmpeg.exec([
      "-f", "concat",
      "-safe", "0",
      "-i", "list.txt",
      "-c", "copy",
      "out.mp4",
    ]);
    if (code !== 0) {
      return {
        ok: false,
        reason: `ffmpeg 結束碼 ${code} —— 各段的編碼參數可能不一致,無法直接串接`,
      };
    }

    const out = await ffmpeg.readFile("out.mp4");
    // readFile 在 binary 模式回 Uint8Array;字串代表讀成文字了,那是錯的
    if (typeof out === "string") {
      return { ok: false, reason: "讀取輸出失敗(拿到字串而非二進位)" };
    }

    ffmpeg.terminate();
    return {
      ok: true,
      data: out as Uint8Array<ArrayBuffer>,
      mime: "video/mp4",
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "合成失敗",
    };
  }
}
