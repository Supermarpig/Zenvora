# 🎬 FrameForge 導演台 — 產品與技術規格書 (Spec)

> 版本:v0.1 · 建立日期:2026-08-12
> 定位:把現有的「分鏡 + Prompt 產生器」升級成真正能**端到端生影片**的 AI 導演工作台。
> 對標:LTX Studio(導演工作台)、小雲雀類創作工具。

---

## 0. TL;DR(給趕時間的人)

- **現況**:專案目前只有「文生圖 / 圖生圖」是真的串了 API(Google Gemini)。Veo / Seedance / Flow 全部只是**產生 prompt 文字讓你手動貼**,沒有真的生影片。
- **要補的核心**:①真的影片生成端點 ②非同步任務(輪詢)③影片儲存 ④時間軸剪接。
- **第一步(M0)**:接 Veo 圖生影片 + Provider 抽象層 + 任務輪詢 + 分鏡上影片預覽。打通一條線後,用 fal.ai 掛多引擎。
- **三大用途是三條不同 pipeline**,難度:AI 漫劇(最近)< 帶貨影片(要數字人+TTS)< 影片換人物(要影生影/表演驅動)。

---

## 實作進度 (2026-08-13)

> 逐項的完成狀態與實測記錄改由 [`bigbanana-parity-spec.md`](./bigbanana-parity-spec.md) §17 維護 ——
> 那份是目前唯一在更新的進度清單。這裡只留與本文件 M0–M6 對應的摘要。

- ✅ **M0 影片 pipeline**:`VideoProvider` 抽象 + Veo / Kling / Seedance 三個 provider + 任務 store/輪詢 + 下載代理 + 分鏡影片面板 + 節點影片標記。另加 **t2v / i2v 鏈路明確入口**(選 i2v 但沒有關鍵幀會直接報錯,不靜默改走 t2v)。
- ✅ **M1 人物資產庫**:已泛化為**資產庫** —— 人物 / 場景 / 道具 / 服裝四種 `kind`,服裝可設定歸屬人物;prompt 內用 `@名稱` 引用,選角面板會標示哪些是被 `@` 帶入的。
- ✅ **M2 時間軸**:時間軸預覽 + **導出剪映 JSON**(含 SRT)。ffmpeg.wasm 直接成片仍未做(見 parity spec §7)。
- 🔁 **M3 多引擎**:改以 Google / 火山 / Kling 直接串接,**不走 fal.ai**(使用者決定)。模型設定 UI 可切生圖 / 生影片 / 文字模型,並可加自訂 model id。
- ⏳ 待辦:M4 帶貨、M5 換人物、M6 正式化;以及 parity spec §17 仍未勾的項目(首尾關鍵幀、ffmpeg.wasm 成片、批次生成參考圖等)。
- ⚠️ **額度現況**:免費層**生圖 `limit: 0`、影片無免費層**,兩者都無法實際跑出產出;文字模型(`gemini-2.5-flash`)有免費額度,所以 AI 拆鏡 / 粗剪 / 預審 / 小說匯入都是真的跑過的。生圖與生影片的驗證方式是攔截送出的 payload 檢查正確性,並在文件中標明哪些是「未實際產出」。

---

## 1. 產品願景 (Vision)

FrameForge 是一個「AI 影像導演台」:創作者用**分鏡(storyboard)**規劃故事,每一格鏡頭可以一鍵生圖 → 生影片 → 在**時間軸**上拼接成完整短片,支援三種內容型態:

1. **AI 漫劇** — 連續分鏡 + 角色一致性 + 對白/嘴型的短篇戲劇。
2. **帶貨影片** — 商品圖 → 展示影片 + 數字人主播 + 旁白配音。
3. **影片換 AI 人物** — 上傳真人表演影片,把演出「轉移」到 AI 角色身上。

**貫穿三者的核心是「人物資產(Character Assets)」** — 可跨專案重複使用的 AI 角色庫(外觀 + 多角度參考圖 + 聲音),是角色一致性、數字人、換人物的共同基礎。

---

## 2. 目標與非目標 (Goals / Non-Goals)

### 2.1 目標

- G1 — 每個分鏡格支援真正的**圖生影片 / 文生影片**,非同步生成 + 進度顯示。
- G2 — **Provider 抽象層**:一套介面接多個影片模型(Veo / Kling / Seedance / Vidu…),可切換。
- G3 — **時間軸剪接台**:把多段 clip 依序排列、預覽、匯出成一支影片。
- G4 — 三大用途各有一條可跑通的 pipeline(至少 MVP 級)。
- G5 — 沿用現有 Next.js + pnpm + Zustand + shadcn 架構,漸進式擴充,不推倒重來。

### 2.2 非目標(此版本先不做)

- 專業級多軌剪輯(轉場特效、關鍵幀動畫曲線)。
- 真正的金流串接(鑽石系統目前維持本地 stub)。
- 多人協作 / 即時共編。
- 自架 GPU 訓練或微調模型。

---

## 3. 使用情境 (Use Cases)

### UC-1 AI 漫劇(與現有架構最貼合)

**流程**
1. 建立專案 → 定義角色(名字 + 外觀,已支援)。
2. 用九宮格 / 續鏡功能鋪出連續分鏡(已支援)。
3. 每格生關鍵幀圖(已支援)。
4. **【新】** 每格「圖生影片」,帶角色參考保持一致性。
5. **【新】** 對白 → TTS + 嘴型(或用 Veo 原生音訊)。
6. **【新】** 時間軸串接 → 匯出。

**關鍵需求**:跨鏡頭**角色一致性**(Vidu 多主體參考 / Kling / Veo 圖生影片鎖臉)。

### UC-2 帶貨影片(新 pipeline)

**流程**
1. 上傳商品圖 → 生商品展示影片(圖生影片)。
2. **【新】** 選數字人主播 + 輸入口播稿 → 生主播講解片段。
3. **【新】** TTS 旁白 + 商品影片 + 字幕。
4. 時間軸串接(Hook → 賣點 → CTA 模板)。

**關鍵需求**:數字人(HeyGen / 騰訊智影 / MiniMax)、TTS(ElevenLabs / MiniMax / Azure)、直式 9:16 模板。

### UC-3 影片換 AI 人物(最難,獨立 pipeline)

**流程**
1. 上傳真人表演影片。
2. 選 / 生一個 AI 角色。
3. **【新】** 表演驅動(Runway Act-Two)或影生影(video-to-video),把演出轉到 AI 角色。

**關鍵需求**:這是**影片驅動**不是文生,需 Runway Act-Two / Viggle / video-to-video,與現有文生圖架構不同,獨立設計。

### 3.4 人物資產(貫穿三大用途的核心)

不隸屬單一情境,而是三者共用的基礎資產。與**現況**差異:目前角色是「每專案、只有名字+外觀文字」(`characterSchema`),要升級成**全域、可重用、帶參考圖與聲音**的資產庫。

**一個人物資產包含**
- 外觀描述(給文生圖 / prompt)
- **多角度參考圖**(turnaround)→ 圖生影片 / 九宮格鎖臉,保證跨鏡一致
- **聲音設定**(voiceId / 語音樣本)→ TTS 配音 / 數字人
- 類型:`actor`(漫劇角色)/ `presenter`(數字人主播)/ `reface`(換臉目標)

**流程**
1. 建立人物資產 → 填外觀 → **一鍵生角色設定圖**(用現有生圖產多角度 turnaround)→ 存為參考圖。
2. (選)綁定聲音。
3. 在專案中「選角」→ 分鏡直接引用 → 生圖/生影片自動帶入參考圖 + 外觀,取代目前純文字描述。

**對應用途**:`actor`→UC-1 漫劇一致性;`presenter`→UC-2 帶貨數字人;`reface`→UC-3 換人物目標。

---

## 4. 現況盤點 (Current State)

| 模組 | 檔案 | 狀態 |
|---|---|---|
| 專案/角色 | `src/stores/use-project-store.ts`、`src/lib/schemas.ts` | ✅ 本地 Zustand(角色僅**每專案 + 名字+外觀文字**,無參考圖/聲音 → 待升級為人物資產庫) |
| 分鏡畫布 | `src/components/storyboard/*`(React Flow) | ✅ 節點式 |
| **文生圖/圖生圖** | `src/actions/generate-image.ts` | ✅ 唯一真串 API(Gemini) |
| AI 續鏡 | `src/actions/generate-next-frame.ts` | ✅ `gemini-2.5-flash` |
| 九宮格關鍵幀 | `src/lib/storyboard-prompt.ts` | ✅ |
| Veo/Seedance/Flow prompt | `src/lib/veo-prompt.ts`、`seedance-prompt.ts` | ⚠️ **只產文字,無 API** |
| 鑽石/金流 | `src/lib/credits.ts` | 🟡 本地 stub |
| 儲存 | `src/lib/db.ts`(idb-keyval) | 🟡 base64 存 IndexedDB,無後端 |

**核心缺口**:文生視頻/圖生視頻 = **0**;無非同步任務;無影片儲存;無時間軸。

---

## 5. 系統架構 (Architecture)

### 5.1 分層

```
┌─────────────────────────────────────────────┐
│  UI 層 (Next.js App Router, React 19)         │
│  分鏡畫布 / 時間軸 / 任務面板 / 預覽播放器      │
├─────────────────────────────────────────────┤
│  狀態層 (Zustand)                              │
│  project / frame / character / job / timeline  │
├─────────────────────────────────────────────┤
│  Server Actions / Route Handlers               │
│  generateVideo() / getVideoJob() / proxyDownload│
├─────────────────────────────────────────────┤
│  Provider 抽象層 (VideoProvider interface)     │
│  Veo · fal(Kling/Seedance/Vidu) · Runway …    │
├─────────────────────────────────────────────┤
│  儲存層                                         │
│  IndexedDB(MVP blob) → R2/S3(正式)           │
└─────────────────────────────────────────────┘
```

### 5.2 設計原則

- **無後端 DB 也能跑 MVP**:server action 無狀態,任務狀態由 provider 的 operation id 表達,client 輪詢。要正式化再引入 DB。
- **Provider 抽象優先**:先定義介面,Veo 是第一個實作,之後 fal 一個 adapter 掛一堆模型。
- **漸進式**:沿用現有 store / schema / prompt builder,不重寫。

---

## 6. 影片生成整合 (Video Generation)

### 6.1 模型選型矩陣(2026 初認知)

| 模型 | 廠商 | 強項 | 取用 | 對應用途 |
|---|---|---|---|---|
| **Veo 3.1** | Google | 原生音訊、圖生影片 | Gemini API(**已有 key**) | UC-1 首選、通用 |
| Kling 可灵 2.x | 快手 | 運鏡、動作自然 | 官方 / fal / Replicate | UC-1、UC-2 |
| Seedance 1.0 | 字節 | 便宜、質高 | Volcengine(**已有 prompt 格式**) | UC-1、UC-2 |
| Vidu | 生数 | 多主體參考一致性 | 官方 API | **UC-1 漫劇** |
| Hailuo 02 | MiniMax | 主體參考 S2V | 官方 API | UC-1 |
| PixVerse | 爱诗 | 直式短片、特效 | 官方 API | **UC-2 帶貨** |
| Wan 2.x 通义万相 | 阿里 | 可自架 | DashScope / 開源 | 通用 |
| **Runway Act-Two** | Runway | **真人影片驅動 AI 角色** | 官方 API | **UC-3 換人物** |
| LTX-Video | Lightricks | 極快、可自架 | 開源 | 即時預覽 |

**聚合閘道(強烈建議)**:`fal.ai` / `Replicate` / 火山引擎 / DashScope — 一個 API 串多模型,避免逐家整合。

### 6.2 Provider 抽象介面(新增 `src/lib/video/types.ts`)

```ts
export type VideoMode = "t2v" | "i2v"; // 文生 / 圖生

export interface VideoGenRequest {
  mode: VideoMode;
  prompt: string;
  imageBase64?: string;        // i2v:分鏡的關鍵幀
  aspectRatio: "16:9" | "9:16" | "1:1";
  durationSec: number;
  withAudio?: boolean;         // Veo 原生音訊
  model: string;               // provider 專屬 model id
}

export type VideoJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface VideoJobState {
  status: VideoJobStatus;
  progress?: number;           // 0..1(有些 provider 沒有)
  videoUrl?: string;           // 完成後的可下載 URL
  error?: string;
}

export interface VideoProvider {
  id: string;                              // "veo" | "fal" | "runway"
  submit(req: VideoGenRequest): Promise<{ providerJobId: string }>;
  poll(providerJobId: string): Promise<VideoJobState>;
}
```

### 6.3 Veo 實作要點(第一個 Provider)

- 端點:`models/{veoModelId}:predictLongRunning`(long-running operation)。
- 送出後拿 `operation.name`,client 輪詢 `getVideoJob(operationName)` → 對應 `operations/{id}` 查狀態。
- 完成後 response 內含影片 file URI,**需帶 API key 才能下載** → 用 server route 代理下載(避免把 key 曝到前端)。
- ⚠️ **model id / 端點請以當前官方文件為準**(`veo-3.x-generate-*` 名稱會變),spec 只定契約不寫死版本。

---

## 7. 非同步任務系統 (Job System)

### 7.1 為什麼需要

影片生成要數十秒~數分鐘,不能同步等。需要:提交 → 輪詢 → 完成/失敗,以及 UI 上的任務面板。

### 7.2 新增 Store `src/stores/use-job-store.ts`

```ts
interface VideoJob {
  id: string;              // 本地 job id
  frameId: string;         // 綁哪一格分鏡
  providerId: string;
  providerJobId: string;   // Veo operation name 等
  status: VideoJobStatus;
  progress?: number;
  videoKey?: string;       // 存到 IndexedDB 的 key
  error?: string;
  createdAt: string;
}
```

### 7.3 輪詢策略

- Client 用 `react-query`(已裝)的 `refetchInterval` 對 `getVideoJob()` 輪詢,`succeeded` / `failed` 後停止。
- 完成 → 呼叫代理下載 route → 存 blob 進 IndexedDB → 更新 frame 的 `videoKey`。
- 頁面重整後從 job store 復原未完成任務繼續輪詢。

### 7.4 Server Actions(新增 `src/actions/generate-video.ts`)

```ts
generateVideo(input): Promise<{ providerJobId } | { error }>   // 提交
getVideoJob(providerJobId): Promise<VideoJobState>             // 輪詢
```
下載代理:`src/app/api/video/[jobId]/route.ts`(串流回影片,隱藏 key)。

---

## 8. 資料模型變更 (Data Model)

### 8.1 `Frame` 擴充(`src/lib/schemas.ts`)

```ts
// 既有欄位保留,新增:
videoKey: z.string().optional(),          // IndexedDB 影片 key
videoModel: z.string().optional(),        // 用哪個模型生的
videoStatus: z.enum(["none","queued","running","succeeded","failed"]).default("none"),
videoDurationSec: z.number().optional(),
castIds: z.array(z.string()).default([]), // 本格出場的人物資產 id
```

### 8.2 新增 `TimelineClip`

```ts
export const timelineClipSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  frameId: z.string(),      // 來源分鏡
  order: z.number(),        // 時間軸順序
  trimStart: z.number().default(0),
  trimEnd: z.number().optional(),
});
```

### 8.3 專案類型標記(給三種用途走不同 UI)

```ts
projectType: z.enum(["comic","commerce","reface"]).default("comic"),
characterAssetIds: z.array(z.string()).default([]), // 專案選角:引用的人物資產
```

### 8.4 人物資產 `CharacterAsset`(**全域、跨專案**)

```ts
export const characterAssetSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(["actor", "presenter", "reface"]).default("actor"),
  appearance: z.string().min(1),                       // 外觀描述(文生圖/prompt)
  referenceImageKeys: z.array(z.string()).default([]), // 多角度參考圖(IndexedDB)
  voice: z
    .object({
      provider: z.string().optional(),                 // "elevenlabs" | "minimax" | ...
      voiceId: z.string().optional(),
      sampleKey: z.string().optional(),                // 語音樣本(voice clone 用)
    })
    .optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CharacterAsset = z.infer<typeof characterAssetSchema>;
```

**引用關係**:`Project.characterAssetIds`(選角)→ `Frame.castIds`(本格出場)。
**遷移**:既有每專案 `characterSchema`(名字+外觀)一次性轉成 `CharacterAsset`,`referenceImageKeys` 留空待補生。
**生成帶入**:生圖/生影片時,把 `castIds` 對應資產的 `appearance` + `referenceImageKeys` 餵入 prompt / i2v 參考,取代現在只有文字描述的做法。

---

## 9. 儲存策略 (Storage)

| 階段 | 圖 | 影片 |
|---|---|---|
| MVP | IndexedDB base64(現況) | IndexedDB **Blob**(非 base64,省空間) |
| 正式 | R2 / S3 + CDN | R2 / S3,DB 只存 URL |

- MVP:`db.ts` 擴充 `saveVideo(key, blob)` / `loadVideo(key)`,回傳 `URL.createObjectURL`。
- 影片檔大,IndexedDB 存 Blob 可行但要注意配額;正式版務必落地物件儲存。
- **人物資產參考圖 / 語音樣本**:比照上表,MVP 存 IndexedDB(參考圖 base64、語音 Blob),正式版落地 R2。因跨專案重用,key 不綁 frameId,改用 `asset-{id}-{n}`。

---

## 10. 時間軸 / 剪接台 (Timeline)

> 這是「導演台」體感最缺、與 LTX Studio 差距最大的一塊。

- **MVP**:水平 clip 軌 + 拖曳排序(用現有 shadcn + 一個輕量拖拽),播放器**依序播放**各段 clip(playlist 式,不真的合併)。
- **匯出**:
  - 選項 A(純前端):`ffmpeg.wasm` 在瀏覽器串接 → 匯出單一 mp4(慢但零後端)。
  - 選項 B(後端):Node/雲端 ffmpeg 合併(快,需伺服器)。
  - MVP 先做 A 或先只提供「逐段下載」。

---

## 11. 端點 / 檔案清單 (New Files)

```
src/lib/video/types.ts              # Provider 介面 + 型別
src/lib/video/veo-provider.ts       # Veo 實作
src/lib/video/fal-provider.ts       # (M2) fal 聚合,掛 Kling/Seedance/Vidu
src/lib/video/index.ts              # provider registry / 選擇器
src/actions/generate-video.ts       # generateVideo / getVideoJob
src/app/api/video/[jobId]/route.ts  # 影片下載代理(藏 key)
src/stores/use-job-store.ts         # 任務狀態
src/stores/use-timeline-store.ts    # (M1) 時間軸
src/hooks/use-generate-video.ts     # react-query 提交 + 輪詢
src/components/storyboard/video-panel.tsx   # 分鏡上的生片/預覽
src/components/timeline/*            # 時間軸剪接台
src/stores/use-character-asset-store.ts       # 全域人物資產庫
src/hooks/use-generate-character-sheet.ts     # 生成多角度角色設定圖
src/components/character/character-library.tsx # 資產庫 UI(建立/編輯/生設定圖)
src/components/character/cast-picker.tsx        # 專案選角 / 分鏡指派
```

擴充既有:`src/lib/schemas.ts`、`src/lib/db.ts`、`src/stores/use-frame-store.ts`。

---

## 12. 里程碑 (Roadmap)

| 里程碑 | 內容 | 產出 |
|---|---|---|
| **M0 打通一條線** | Provider 抽象 + **Veo 圖生影片** + 任務輪詢 + 分鏡影片預覽 | 單格分鏡能生出並播放影片 |
| **M1 人物資產庫** | 全域角色庫 + 多角度參考圖 + 一鍵生設定圖 + 專案選角 + 生成帶入參考圖 | 角色跨專案重用、跨鏡一致 |
| **M2 時間軸** | Timeline store + 剪接台 UI + playlist 播放 + 匯出(ffmpeg.wasm) | 多段串成一支短片 |
| **M3 多引擎** | fal.ai adapter → Kling / Seedance / Vidu 可切換 | 模型下拉選單 |
| **M4 帶貨** | presenter 資產→數字人 + voice→TTS + 商品 i2v + 9:16 模板 | 帶貨 pipeline MVP |
| **M5 換人物** | reface 資產 + Runway Act-Two / video-to-video | 上傳影片→AI 角色 |
| **M6 正式化** | 登入 + DB + R2 儲存 + 真鑽石金流 | 可對外營運 |

**建議起手**:M0,且第一個 provider 選 Veo(已有 key、已有生好的圖、已有 `buildVeoPrompt`)。

---

## 13. 風險與注意 (Risks)

| 風險 | 對策 |
|---|---|
| 影片 API model id / 端點常變 | Provider 介面隔離,只定契約;實作標注「以官方文件為準」 |
| 生成成本高、耗時長 | 任務佇列 + 進度 + 失敗重試;鑽石扣點在**成功後**才扣 |
| IndexedDB 影片配額 | MVP 存 Blob + 提醒;正式版改物件儲存 |
| 角色一致性不穩 | 優先 Vidu/Veo 圖生影片鎖臉;保留參考圖上傳 |
| API key 外洩 | 一律走 server action / 代理 route,前端不碰 key |
| 換人物 pipeline 差異大 | 獨立設計,不硬塞進文生圖流程 |

---

## 14. 待決策 (Open Questions)

1. 影片模型第一批要接哪幾家?(建議:Veo → 之後 fal 掛 Kling/Seedance/Vidu)
2. MVP 要不要先引入真後端 DB,還是維持純前端到 M4?
3. 三大用途哪個當第一個做完整?(建議:AI 漫劇,離現況最近)
4. 匯出用純前端 ffmpeg.wasm 還是後端合併?
5. 人物資產 MVP 範圍:先做「外觀 + 多角度參考圖」就好,聲音(TTS/clone)延後到帶貨(M4)?
