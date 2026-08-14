# BigBanana 功能對標 — 補完規格書 (Spec v0.2)

> 版本:v0.6 · 建立日期:2026-08-13
> v0.2 → v0.3:補齊漏掉的 9 項功能與 4 個架構事實(v0.2 僅基於單次 README 摘要)。
> v0.3 → v0.4:新增 §16 內部技術債 D1–D9(與對標無關,是自身架構問題)。
> v0.4 → v0.5:新增 §19 N9 動作遷移(v2v)。**這一節不是對標項**,是 2026-08-14 的獨立調查,但會影響里程碑優先順序。
> v0.5 → v0.6:N1 首尾關鍵幀(Veo)完成 —— 查到官方參數是 `lastFrame`,並修掉兩個既有的 payload 錯誤(Veo 不吃 1:1、只接受 4/6/8 秒)。新增 §20「已查證但不採用」。
> 定位:承接 [`director-console-spec.md`](./director-console-spec.md) (v0.1),對標 BigBanana AI Director 的五階段工作流,把缺口拆成可執行的實作單位。
> 對標來源:`https://github.com/shuyu-labs/BigBanana-AI-Director`
> **§19 的來源不是上面那個 repo** —— 見該節開頭說明。

---

## 0. TL;DR

- **對標對象沒有原始碼**。該 repo 只有 `/images`(UI 截圖)、`docker-compose.yaml`、多語 README,官方說明因先前被抄襲故僅發布 Docker image。授權 CC BY-NC-SA 4.0(禁未授權商業使用)。**本規格書只參考其公開的功能設計,不涉及其程式碼。**
- **它的核心理念是三步**,不是兩步:**先畫後動 → 插值生成 → 資產約束**。第三步(所有輸出都被資產參考圖約束)是獨立原則,也是它能維持一致性的關鍵。
- **最大的技術差距是首尾關鍵幀**:生成精確首尾幀 + 插值產生中間過渡,而非讓模型自由發揮。provider 抽象層已預留,主要是加欄位與接參數,投入產出比最高。
- **八個缺口**:①鏡頭工作台(首尾關鍵幀/雙鏈路/宮格橫直版)②資產庫只有人物 ③Prompt 全寫死 ④交付只到素材 ⑤沒有季/集與小說拆分 ⑥模型設定寫在 `.env` 沒有 UI ⑦生成前沒有計畫預審 ⑧下載代理的白名單比對可被前綴冒充(**已有防護但有漏洞,且會外洩金鑰 —— 應最優先修**)。
- **建議順序**:N6 模型配置 → N1 鏡頭工作台 → N2 資產庫 → N7 計畫預審 → N3 Prompt 管理 → N4 交付中心 → N5 專案層級 → N8 代理加固。理由見 §14。
- **架構上的重要發現**:對標對象**沒有資料庫也沒有 Redis**,資料同樣存在瀏覽器本地(見 §2.3)。這驗證了本專案 localStorage + IndexedDB 的選擇不是權宜之計,而是同一條路 —— **不需要為了對標而引入後端**。
- **N4 的 ffmpeg.wasm 與 N5 的 schema 遷移是兩個真正的風險點**,其餘都是漸進擴充。
- **§19(N9 動作遷移,非對標項)可能比上面任何一項都重要**:Seedance 2.0 原生支援參考影片(Veo 完全不支援),單價 $0.112/s ≈ Veo 的 1/3.5,而且動作品質不用賭。但有三個阻礙:本專案的 seedance provider **實際打的是即夢 VGFM 不是 Seedance**(標籤與實作不符,既有問題)、驅動影片**只吃公開 URL** 與無後端架構衝突、火山帳號可能需要中國實名。**先試註冊 + 手動跑一次驗品質,再決定要不要實作。**

---

## 1. 可參考範圍與界線

| 項目 | 狀態 |
|---|---|
| 功能設計、工作流分階段 | 可參考(功能本身不受著作權保護) |
| `docker-compose.yaml`(公開於 repo) | 可讀,揭露服務組成與架構 |
| `/images` 截圖檔名 | 可讀,檔名本身就是功能清單 |
| UI 佈局概念 | 可參考截圖描述,不逐像素複製 |
| 原始碼 | **不存在於 repo**,無從參考 |
| 其 Docker image | CC BY-NC-SA 4.0,商業使用需授權,不得直接商用 |
| 其模型供應商(AntSK 聚合 API) | 不採用。維持本專案各 provider 直連的架構 |

---

## 2. 現況盤點 (2026-08-13)

> v0.1 spec 的「實作進度」章節記載到 2026-08-12,以下為之後新增、該章節尚未反映的部分。**建議一併更新 v0.1 的進度章節,避免兩份文件對現況的描述分歧。**

已完成(v0.1 未記載):

| 功能 | 檔案 |
|---|---|
| 導出剪映素材包(timeline.json + SRT + 使用說明 + assets zip) | [`src/lib/timeline-export.ts`](../src/lib/timeline-export.ts)、[`src/lib/zip.ts`](../src/lib/zip.ts)、`src/components/storyboard/export-timeline-button.tsx` |
| 匯入分鏡 JSON(整批驗證、附加而非取代) | `src/components/storyboard/import-json-button.tsx` |
| `@角色` 引用與指涉錨定 | [`src/lib/cast.ts`](../src/lib/cast.ts) 的 `composeCastPrompt` / `findMentionedAssets` / `replaceMentions` |
| 三個生圖入口統一帶入角色 | `image-generator.tsx`、`use-batch-generate-images.ts`、`prompt-row.tsx` |
| 連續九宮格:一次生圖換九格 + Canvas 切圖 | [`src/lib/grid-split.ts`](../src/lib/grid-split.ts)、`src/components/prompt/grid-sequence-tools.tsx` |
| 分鏡排序(接上原本沒人呼叫的 `reorderFrames`) | `src/stores/use-frame-store.ts:158`、`prompt-row.tsx` |
| 分鏡編輯器兩欄改版(container query) | `src/components/storyboard/frame-editor.tsx` |
| 圖片 revalidate(外部寫 IndexedDB 後畫面即時更新) | `src/hooks/use-image-storage.ts` |
| 模型 id 修正(`gemini-3-pro-image-preview` 已於 2026-06-25 停用) | `generate-image.ts`、`credits.ts`、`seedance-options.ts` |

**已知的配額現實**(影響所有 Phase 的驗收方式):

- `gemini-2.5-flash`(文字):免費層**有**配額。AI 生成分鏡實測 6 秒產出 8 鏡,可用。
- `gemini-2.5-flash-image`(生圖):免費層 `limit: 0`,必須綁 billing。
- Veo / Seedance / Kling(影片):無免費層。

因此**所有涉及生圖/生影片的驗收條件,都必須能在「無 API 額度」下先驗證到 payload 層級**(檢查送出的請求內容正確),再於有額度時驗證實際產出。

### 2.3 對標對象的架構(由公開的 `docker-compose.yaml` 推得)

四個服務,`web` 對外 `3005:80`,依賴另外三個:

| 服務 | 對外端口 | 關鍵環境變數 | 職責推論 |
|---|---|---|---|
| `web` | 3005 | — | 前端 |
| `media-proxy` | 8787 | `MEDIA_PROXY_ALLOWED_HOSTS`、`ALLOWED_PROTOCOLS`、`MAX_URL_LENGTH`、`TIMEOUT_MS`、`CORS_ORIGIN` | 帶白名單的媒體代理 |
| `new-api-proxy` | 8788 | `NEW_API_ALLOWED_HOSTS`、`ALLOW_PRIVATE_HOSTS` | 模型 API 網關代理 |
| `cutos-api` | 8789 | `DASHSCOPE_API_KEY` | CutOS 粗剪(用阿里雲 DashScope,非主生成模型) |

**三個對本專案的結論**:

1. **沒有資料庫、沒有 Redis**。印證 README 所述「資料保存在瀏覽器本地」。本專案的 localStorage + IndexedDB **不需要為了對標而改成後端**;v0.1 spec 的 M6(登入 + DB)是營運需求,不是功能對標需求。
2. **代理服務有完整 SSRF 防護**:主機白名單、限定協議、禁私網位址、限制 URL 長度、逾時。本專案的 [`src/app/api/video/download/route.ts`](../src/app/api/video/download/route.ts) 應對照加固 —— 見 **N8**。
3. **粗剪用便宜的模型**(DashScope)而非主生成模型。剪接判斷不需要頂級模型,這對 N4 的成本控制有直接參考價值。

---

## 3. 功能差異矩陣

| BigBanana | 本專案現況 | 缺口編號 |
|---|---|---|
| Phase 01:大綱→結構化劇本、配置驅動、AI 續寫 | 齊備(`generate-storyboard` / `generate-next-frame` / `split-dialogue`) | — |
| Phase 01:**全自動計畫預審** | **完全沒有** —— 直接開始花錢生成 | **N7** |
| Phase 02:角色一致性定妝 | 有(turnaround + `@mention`) | — |
| Phase 02:**場景 / 道具 / 服裝資產化** | 只有人物 | **N2** |
| Phase 02:資產庫跨專案複用 | 有(`characterAssets` 本來就是全域) | — |
| Phase 02:**批量補齊缺失資產** | 沒有 | **N2** |
| Phase 03:網格化鏡頭工作台 | 有(React Flow 畫布 + 提示詞總表) | — |
| Phase 03:**關鍵幀精控(首尾幀)** | **只有起始幀** | **N1** |
| Phase 03:九宮格分鏡預覽 | 有,且已能切圖回填 | — |
| Phase 03:**宮格 4 / 6 / 9 格 × 橫版 / 直版** | 只有 9 / 25 格,**不分橫直版** | **N1** |
| Phase 03:上下文感知生成 | 有(`composeCastPrompt` 帶角色與參考圖) | — |
| Phase 03:**雙視頻鏈路** | 單一鏈路 | **N1** |
| Phase 04:**時間軸預覽** | 資料層有(`buildTimeline`),無 UI | **N4** |
| Phase 04:**AI 粗剪(CutOS 風格)** | 沒有 | **N4** |
| Phase 04:**渲染追蹤** | 單鏡有 job 狀態,無批次總覽 | **N4** |
| Phase 04:多種交付方式 | 有素材包(JSON + SRT + zip);**不出成片** | **N4** |
| Phase 04:**劇集級備份** | 沒有 | **N4** |
| Phase 05:Prompt 集中編輯 + **版本回滾** | 模板寫死在 5 個 lib 檔 | **N3** |
| 專案層級:**季 / 集** | 只有專案 → 分鏡兩層 | **N5** |
| 專案層級:**小說匯入自動拆分** | 沒有 | **N5** |
| 專案層級:**世界觀錨定(地圖/區域/地點/音樂)** | 沒有 | **N5** |
| 專案層級:**專案備份 / 資料匯出匯入** | 只有分鏡層級的匯入匯出 | **N5** |
| 專案中心:**模型配置 UI** | 寫死在 `.env` 與 code 常數 | **N6** |
| 架構:代理服務 SSRF 防護 | **已有**白名單與限協議;缺長度上限與逾時,且後綴比對可被前綴冒充 | **N8** |

---

## 4. N1 — 鏡頭工作台補完(對應 Phase 03)

三個子項:**4.1–4.7 首尾關鍵幀**(主項)、**4.8 雙視頻鏈路**、**4.9 宮格 4/6/9 × 橫直版**。

### 4.1 現況

[`src/lib/video/types.ts`](../src/lib/video/types.ts) 的 `VideoGenRequest` 只有單張參考圖:

```ts
imageDataUrl?: string;   // i2v:起始參考圖 data URL
```

三個 provider(`veo-provider.ts` / `seedance-provider.ts` / `kling-provider.ts`)都只送起始幀,中間運動由模型自由決定。

### 4.2 目標

指定起始幀與結束幀,讓模型做插值,由創作者決定運動軌跡而非碰運氣。

### 4.3 資料模型改動

```ts
// src/lib/video/types.ts
export interface VideoGenRequest {
  // …既有欄位不變
  imageDataUrl?: string;      // 起始幀(語意不變,向後相容)
  endImageDataUrl?: string;   // 新增:結束幀。有值時走首尾幀插值
}

export interface VideoModelOption {
  // …既有欄位不變
  supportsEndFrame: boolean;  // 新增:UI 據此決定是否顯示結束幀欄位
}
```

```ts
// src/lib/schemas.ts — frameSchema 擴充
endImageKey: z.string().optional(),   // IndexedDB key,格式 end-image-{frameId}
```

```ts
// src/lib/db.ts — 新增三個函式,與既有 image/video 同構
export function getEndImageKey(frameId: string): string   // `end-image-${frameId}`
export async function saveEndImage(frameId: string, base64: string): Promise<void>
export async function loadEndImage(frameId: string): Promise<string | undefined>
export async function deleteEndImage(frameId: string): Promise<void>
```

### 4.4 各 provider 的參數對應

**參數名一律以各家官方文件為準**,下表為 2026-08 的認知,實作時需查證:

| Provider | 起始幀 | 結束幀 | 備註 |
|---|---|---|---|
| Veo 3.1 | `image` | `lastFrame` | 官方文件稱 last frame interpolation |
| Kling | `image` | `image_tail` | 首尾幀為獨立能力,部分檔位才有 |
| Seedance(火山/即夢) | 首幀 | 尾幀 | 需查證欄位名 |

**降級策略**:`supportsEndFrame === false` 的模型收到 `endImageDataUrl` 時,**忽略該欄位並在回傳中標注**,不要靜默丟棄也不要報錯中斷 —— 讓使用者知道這個模型不吃結束幀。

### 4.5 UI 改動

- `src/components/storyboard/image-generator.tsx` 泛化:目前綁死 `image-{frameId}`,需支援 slot 參數(`"start" | "end"`),兩個 slot 共用生圖/上傳邏輯。
- `src/components/storyboard/video-panel.tsx`:在關鍵幀提示區旁加「結束幀」位;僅當所選模型 `supportsEndFrame` 時顯示。
- `src/components/storyboard/frame-node.tsx`:畫布卡片可考慮以雙縮圖標示首尾幀(次要,可延後)。

### 4.6 驗收條件

1. 只有起始幀時,送出的 payload 與現行完全一致(**向後相容,不可回歸**)。
2. 首尾幀都有時,payload 同時帶兩張圖(可用攔截 fetch 比對 request 大小與內容驗證,不需真的生成)。
3. 選到 `supportsEndFrame: false` 的模型時,結束幀欄位隱藏或明確標示不支援。
4. 結束幀可獨立上傳、生成、刪除,不影響起始幀。
5. `tsc --noEmit` 與 `eslint` 無新增錯誤。

### 4.7 風險

| 風險 | 對策 |
|---|---|
| 各家參數名與能力矩陣不一致 | 收斂在 provider adapter 內,`types.ts` 只定契約 |
| 首尾幀差異過大導致插值崩壞 | 屬創作端問題,文件提示「首尾幀應為同一場景的合理運動區間」 |
| IndexedDB 佔用倍增(每鏡多一張圖) | 沿用 v0.1 風險章節的對策(MVP 提醒,正式版轉物件儲存) |

### 4.8 雙視頻鏈路

對標對象在 Phase 03 列了「双视频链路」。合理推論是**兩條並存的生成路徑**:

| 鏈路 | 用途 | 本專案現況 |
|---|---|---|
| A:關鍵幀插值(i2v / 首尾幀) | 品質優先,運動可控 | i2v 有,首尾幀待做(§4.1–4.7) |
| B:純文生影片(t2v) | 沒有分鏡圖時快速出草稿 | `VideoMode` 已有 `"t2v"`,但 UI 未給明確入口 |

`VideoGenRequest.mode` 已經有 `"t2v" | "i2v"` 兩種,**契約層面已支援,缺的是 UI 讓使用者明確選鏈路**,以及依鏈路切換不同 prompt 模板(t2v 需要完整畫面描述,i2v 只需描述運動 —— 這正是 `buildFlowPrompt` 與 `buildVeoPrompt` 的分工)。

驗收:兩條鏈路各自可獨立跑通;i2v 缺起始圖時明確提示而非靜默改走 t2v。

### 4.9 宮格 4 / 6 / 9 格 × 橫版 / 直版

對標對象的 `images/reference/` 放了六張參考圖:`4-l`、`4-p`、`6-l`、`6-p`、`9-l`、`9-p` —— 即 **4/6/9 格各有 landscape 與 portrait 兩種版面**。

本專案現況:

- [`src/lib/storyboard-prompt.ts`](../src/lib/storyboard-prompt.ts) 的 `GridSize` 只有 `9 | 25`,且 prompt 內寫死 `strict 3×3 grid`。
- [`src/lib/grid-split.ts`](../src/lib/grid-split.ts) 的 `splitGrid(dataUrl, cols, rows)` **本身已是通用的**,不需改。
- `grid-sequence-tools.tsx` 的 `GRID_COLS` / `GRID_ROWS` 是常數 3。

**為什麼直版很重要**:短影音是 9:16。9 格直版時,合成圖應是 3×3 但**每格為 9:16 比例**(整張圖 27:16),而不是把 16:9 的格子塞進直版畫面 —— 否則每格構圖全部走掉,切出來無法直接用。

**已於 2026-08-13 完成。** 實作與初稿有三處不同:

```ts
// storyboard-prompt.ts
export function gridSpec(size: GridSize, orientation?: GridOrientation): {
  cols: number; rows: number;
  imageAspect: "16:9" | "9:16";   // 整張合成圖的建議輸出比例
  panelAspect: string;            // 每格的近似比例
}
```

1. **回傳值多了 `panelAspect`**。初稿以為「每格比例 = 整張比例」,但那只在 cols/rows 同倍數時成立:16:9 分成 3×2,每格是 `(16/3):(9/2) ≈ 6:5`,**不是 16:9**。若沿用整張比例寫進 prompt,6 格模式的每格構圖會全歪。
2. **`panelAspect` 用常見比例表對映**,不用最簡分數搜尋 —— 後者會算出 `13:11` 這種對模型沒有意義的比例。
3. **修掉一個既有 bug**:`gridSize = 25` 時 prompt 仍寫死 `strict 3×3 grid`,與 25 格自相矛盾。現在依 `gridSpec` 動態組句。

UI 預設 **9 格直版**(此工具主要用於短影音);25 格不開放,1024px 除以 5 每格只剩約 205px。

驗收(已通過):9 格直版的 prompt 說 `3×3 grid ... in 9:16 overall aspect ratio ... each composed for a 9:16 frame`;切換 6 格橫版後說 `3×2 grid ... 16:9 ... 6:5 frame`;實測 6 格切圖順序左上→右下正確,且分鏡多於格數時不會亂填後面的分鏡。

---

## 5. N2 — 資產庫泛化(場景 / 道具 / 服裝)

### 5.1 現況

[`src/lib/schemas.ts`](../src/lib/schemas.ts) 的 `characterAssetSchema` 只表達人物,`type` 欄位是**角色子類**(`actor` / `presenter` / `reface`),不是資產種類。場景一致性目前完全靠每鏡 prompt 重複描述 —— 這是漫劇最常崩的地方:同一間廚房每鏡長不一樣。

### 5.2 設計:kind 與 characterType 是兩個維度

不要把 `scene` / `prop` 硬塞進現有的 `type` enum,那會讓「數字人主播的場景」這種組合無法表達。

```ts
// src/lib/schemas.ts
export const ASSET_KINDS = ["character", "scene", "prop", "costume"] as const;

export const assetSchema = z.object({
  id: z.string(),
  kind: z.enum(ASSET_KINDS).default("character"),
  name: z.string().min(1),
  appearance: z.string().min(1),
  /** 僅 kind === "character" 時有意義 */
  characterType: z.enum(CHARACTER_ASSET_TYPES).optional(),
  /** 僅 kind === "costume" 時有意義:這套服裝屬於哪個角色 */
  ownerAssetId: z.string().optional(),
  referenceImageKeys: z.array(z.string()).default([]),
  voice: z.object({ /* 同現況 */ }).optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

### 5.3 遷移(必須零資料損失)

現有 `frameforge-character-assets` 的 persist **只有 `name` 與 `partialize`,沒有 `version` 也沒有 `migrate`**(已查證)。因為 `partialize: (state) => ({ assets: state.assets })`,`migrate` 收到的 state 只會有 `assets` 一個欄位,實作時不要去碰其他欄位。改動時:

```ts
// src/stores/use-character-asset-store.ts
persist(fn, {
  name: "frameforge-character-assets",   // key 不改,避免使用者資料消失
  version: 1,
  migrate: (state, from) => {
    if (from === 0) {
      // v0 的每筆都是人物;把舊的 type 搬到 characterType
      state.assets = state.assets.map((a) => ({
        ...a, kind: "character", characterType: a.type,
      }));
    }
    return state;
  },
})
```

**驗收必須包含**:塞入 v0 格式資料 → 載入 → 確認 `kind` 補上且 `characterType` 保留原值。

### 5.4 @mention 機制完全複用,但一致性指示句要分 kind

[`src/lib/cast.ts`](../src/lib/cast.ts) 的 `tokenizeMentions` 不在乎資產種類,`@廚房` 與 `@小雨` 走同一條路徑,**這部分不用改**。

要改的是 `resolveCast` 產生的一致性指示句 —— 現在只有一句適用人物的:

> `Keep these characters visually consistent — identical face, hairstyle, body proportions, and outfit.`

對場景說「identical face, hairstyle」是無意義的雜訊。應按 kind 分組出句:

| kind | 一致性指示重點 |
|---|---|
| `character` | face, hairstyle, body proportions, outfit(現況) |
| `scene` | layout, architecture, furniture placement, lighting setup |
| `prop` | shape, material, colour, scale relative to hand |
| `costume` | garment cut, fabric, colour, how it drapes |

`refIndexByAssetId` 的編號機制不變(跨 kind 統一編號,因為參考圖陣列是單一序列)。

### 5.5 UI 改動

- `/characters` 頁改為資產庫,加 kind 分頁或篩選;路由可保留 `/characters` 避免斷連結,或改 `/assets` 並加轉址。
- `cast-picker.tsx` 加 kind 分組顯示。
- `character-sheet-prompt.ts` 依 kind 分歧:場景不要生 turnaround 三視圖,應生「同一空間的多視角 establishing shots」;道具生「白底多角度產品圖」。

### 5.6 批量補齊缺失資產

對標對象 Phase 02 有「批量补齐缺失资产」。本專案有一個**它沒有的優勢可以直接利用**:`@mention` 讓「被引用的資產」變成可程式掃描的。

```ts
// src/lib/cast.ts 新增
/** 掃全片 prompt,找出 @ 了但資產庫裡不存在的名稱 */
export function findMissingMentions(frames: Frame[], assets: Asset[]): string[]
```

現行 `tokenizeMentions` 只認得既有資產名稱,未知的 `@名字` 會原樣保留 —— 所以要另外用寬鬆規則(`@` 後接非空白字元)掃出候選,再減去已知資產名。

流程:掃出缺漏 → 列表顯示 → 一鍵建立資產(名稱帶入,`appearance` 交給 AI 依 prompt 上下文推寫)→ 批次生成參考圖。

驗收:prompt 寫 `@管家` 但資產庫沒有時,能被掃出;建立後同一個掃描結果不再包含它。

### 5.7 驗收條件

1. v0 舊資料遷移後 `kind`/`characterType` 正確,無資料遺失。
2. `@廚房` 能帶入場景參考圖,且 prompt 前綴出現的是場景版指示句,不是人物版。
3. 人物與場景混用時(`@小雨 走進 @廚房`),兩張參考圖都送出且編號與句內錨點一致。
4. 既有純人物專案行為不變。
5. 缺失資產掃描能找出未建立的 `@` 引用(§5.6)。

---

## 6. N3 — Prompt 管理 + 版本歷史

### 6.1 現況

模板全寫死在四個檔案,調 prompt 必須改檔案重新部署:

| 檔案 | 內容 |
|---|---|
| [`src/lib/veo-prompt.ts`](../src/lib/veo-prompt.ts) | `buildVeoPrompt` / `buildImagePrompt` / `buildFlowPrompt` / `buildExtendPrompt`,含 `STYLE_LENS`、`MOOD_LIGHTING`、`CAMERA_DIRECTIONS` 對照表 |
| [`src/lib/storyboard-prompt.ts`](../src/lib/storyboard-prompt.ts) | `buildGridPrompt`(九宮格,單鏡與多鏡兩個分支)、`buildCharacterBlock` |
| [`src/lib/character-sheet-prompt.ts`](../src/lib/character-sheet-prompt.ts) | turnaround / presenter 兩種 |
| [`src/lib/seedance-prompt.ts`](../src/lib/seedance-prompt.ts) | Seedance 專用組句 |

### 6.2 設計:內建模板當 fallback

**關鍵決定**:不要把模板搬進 store 當初始資料。使用者沒改過就用 code 裡的常數,改過才存覆寫值。

理由:①不需要資料初始化流程 ②內建模板可隨版本更新而生效 ③使用者改壞了可以「還原內建」

```ts
// src/lib/schemas.ts
export const PROMPT_TEMPLATE_IDS = [
  "veo", "image", "flow", "extend", "seedance",
  "grid-single", "grid-sequence",
  "character-sheet", "presenter-sheet", "scene-sheet",
] as const;

export const promptTemplateSchema = z.object({
  id: z.enum(PROMPT_TEMPLATE_IDS),
  /** 覆寫用的模板本文,含 {{變數}} 佔位;未覆寫時此筆不存在 */
  body: z.string(),
  updatedAt: z.string(),
});

export const promptTemplateVersionSchema = z.object({
  id: z.string(),
  templateId: z.enum(PROMPT_TEMPLATE_IDS),
  body: z.string(),
  note: z.string().default(""),
  savedAt: z.string(),
});
```

### 6.3 變數插值

需要一個極簡 render(不引入模板引擎):

```ts
// src/lib/prompt-template.ts
/** 只支援 {{key}} 平面替換;未知變數原樣保留,方便使用者看出打錯 */
export function renderTemplate(body: string, vars: Record<string, string>): string
```

各模板可用的變數需在設定頁**列出來**,否則使用者不知道能填什麼(與 `@mention` 當初同樣的可用性問題)。例:

| 模板 | 可用變數 |
|---|---|
| `image` | `{{prompt}}` `{{lens}}` `{{lighting}}` `{{style}}` `{{mood}}` |
| `veo` | 上列 + `{{camera}}` `{{duration}}` `{{speaker}}` `{{dialogue}}` |
| `character-sheet` | `{{appearance}}` `{{name}}` |

### 6.4 UI 改動

新增設定頁(`/settings/prompts` 或專案內分頁):模板列表 → 編輯器 → 即時預覽(用當前分鏡的實際值 render)→ 儲存(自動存一筆版本)→ 版本清單可回滾 → 「還原內建」。

### 6.5 驗收條件

1. 未覆寫任何模板時,所有生成的 prompt 與現行**逐字相同**(可用字串比對驗證,這是防回歸的關鍵)。
2. 覆寫後生成的 prompt 使用新模板。
3. 「還原內建」後回到內建行為,且該筆覆寫從 store 移除。
4. 版本回滾能還原到指定版本的 body。
5. 模板含未知變數時不 crash,原樣輸出。

### 6.6 風險

| 風險 | 對策 |
|---|---|
| 使用者改壞模板導致生成品質崩壞 | 版本歷史 + 還原內建;預覽區顯示 render 後全文 |
| 內建模板更新後與使用者覆寫分歧 | 覆寫存的是完整 body(非 diff),明確告知「已覆寫,不會跟隨內建更新」 |
| 模板數量膨脹難維護 | `PROMPT_TEMPLATE_IDS` 用 enum 收斂,新增模板必須改 enum |

---

## 7. N4 — 交付中心(時間軸 / 粗剪 / 渲染追蹤 / 劇集備份 / 成片)

> 本節與 v0.1 spec 的 **M2 時間軸** 是同一件事,此處補上 BigBanana 額外具備的粗剪與多格式導出。

### 7.1 現況

[`src/lib/timeline-export.ts`](../src/lib/timeline-export.ts) 已能算出完整時間軸(`buildTimeline` 依 `videoDurationSec ?? duration` 累加 `startSec`)並產生對齊的 SRT。**資料層已經有了,缺的是預覽與合成。**

### 7.2 三個子項

**7.2.1 時間軸預覽**

直接複用 `buildTimeline` 的輸出,做水平 gantt:每鏡寬度正比於時長、標出轉場接縫、缺素材的鏡次以警示色標示。再加一個 playlist 播放器(依序播放各鏡影片,無影片則顯示靜態圖 + 停留該鏡時長)。

這一項**不需要任何 API**,可立即實作與驗收。

**7.2.2 AI 粗剪**

用 `gemini-2.5-flash`(免費層有配額)分析各鏡的 `dialogue` / `duration` / `prompt`,回傳結構化建議:

```ts
{ suggestions: [
  { frameId, action: "trim" | "extend" | "reorder" | "cut", toDurationSec?, toIndex?, reason }
] }
```

**必須是「建議 + 逐項接受/拒絕」,不可直接改資料。** 理由:剪接是創作決策,靜默改動使用者的分鏡是不可接受的。

**7.2.3 成片合成**

`ffmpeg.wasm` 在瀏覽器合併 clip + 燒字幕。**這是全部規格中最重的一項**:

| 風險 | 說明 | 對策 |
|---|---|---|
| 體積 | core 約 25MB+ | 動態 import,只在使用者點「合成」時載入 |
| SharedArrayBuffer | 需 COOP/COEP response headers | `next.config.ts` 加 headers;**注意這會影響整站的跨源資源載入,需先確認不破壞現有 Gemini/影片下載** |
| 記憶體 | 長片或高解析度會 OOM | 限制總長與解析度,超過則提示改用剪映流程 |
| 瀏覽器差異 | Safari 支援度較差 | 偵測能力,不支援時降級為「導出素材包」 |

**建議**:成片合成列為 N4 的最後一步,且**保留現有導出剪映流程作為主要出片路徑**。剪映流程已驗證可用,ffmpeg.wasm 是加分項而非取代品。

**成本參考**:對標對象的 `cutos-api` 用 `DASHSCOPE_API_KEY`(阿里雲),而非它主要的生成模型 —— 剪接判斷用便宜模型就夠。本專案用 `gemini-2.5-flash`(免費層有配額)剛好符合這個原則。

**7.2.4 渲染追蹤**

現況:[`src/stores/use-job-store.ts`](../src/stores/use-job-store.ts) 有單鏡的 job 狀態與輪詢,但**沒有跨分鏡的批次總覽**。批次生成 10 鏡影片時,使用者無法一眼看到「3 成功 / 2 進行中 / 1 失敗 / 4 未開始」。

改動:一個總覽面板,列出全片各鏡的 `videoStatus`(`frameSchema` 已有此欄位:`none` / `queued` / `running` / `succeeded` / `failed`),支援「只重試失敗的」。資料已經在了,缺的是彙整視圖。

驗收:批次生成時各鏡狀態即時更新;「重試失敗」只重送 `failed` 的鏡次。

**7.2.5 劇集級備份**

把一集的完整狀態(分鏡 + 資產引用 + 素材)打包成單一檔案,可還原。

現況:已有 [`src/lib/zip.ts`](../src/lib/zip.ts) 的零依賴打包與 `import-json-button` 的匯入,**基礎設施齊備**。缺的是「連同 IndexedDB 素材與資產一起打包」的完整快照,而非只有分鏡 JSON。

與 N5 的「專案備份」是同一套機制的不同粒度,建議一起設計(見 §8.5)。

### 7.3 驗收條件

1. 時間軸預覽的區間與 `timeline.json` 的 `startSec` / `durationSec` 完全一致(同一資料源,可程式比對)。
2. playlist 播放的總時長等於 `totalDurationSec`。
3. 粗剪建議顯示為待確認項,拒絕後分鏡資料不變。
4. ffmpeg 合成前先檢查瀏覽器能力,不支援時明確降級而非失敗。
5. 加 COOP/COEP headers 後,生圖與影片下載代理仍正常(**回歸測試必做**)。

---

## 8. N5 — 專案層級(季 / 集 / 小說拆分 / 世界觀)

### 8.1 現況

兩層:`Project` → `Frame`(`frame.projectId`)。

### 8.2 設計:episodeId 可選,舊資料視為單集

**不要把 `frame.projectId` 改成 `frame.episodeId`** —— 那是破壞性遷移,現有資料全部要重寫。

```ts
export const seasonSchema = z.object({
  id: z.string(), projectId: z.string(), name: z.string(),
  order: z.number().int().min(0), createdAt: z.string(),
});

export const episodeSchema = z.object({
  id: z.string(), seasonId: z.string(), name: z.string(),
  order: z.number().int().min(0),
  synopsis: z.string().default(""),
  createdAt: z.string(),
});

// frameSchema 擴充
episodeId: z.string().optional(),   // 未指定 = 直接掛在專案下(舊資料/單集專案)
```

查詢時 `getFramesByProject` 行為不變;新增 `getFramesByEpisode`。UI 上專案沒有季/集時維持現在的單層視圖,建立第一個季時才顯示層級導覽。

### 8.3 世界觀錨定(結構化,不是三個字串)

對標對象的世界觀包含**地圖、區域、地點、音樂風格**(`世界观.png`),是有結構的實體,不是扁平備註:

```ts
// projectSchema 擴充
worldview: z.object({
  setting: z.string().default(""),      // 時代/地域/世界規則
  visualBible: z.string().default(""),  // 全片視覺基調,注入所有生成 prompt
  musicMood: z.string().default(""),
  /** 區域 → 地點的兩層結構;地點可綁 scene 資產,讓「同一個地點」跨集一致 */
  regions: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().default(""),
    locations: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().default(""),
      /** 對應 N2 的 kind === "scene" 資產,未建立則為空 */
      sceneAssetId: z.string().optional(),
    })).default([]),
  })).default([]),
}).optional(),
```

**與 N2 的接點**:`locations[].sceneAssetId` 讓「世界觀裡的地點」與「可 `@` 引用的場景資產」對上 —— 世界觀負責敘事層的組織,場景資產負責視覺一致性。沒有 N2 時這個欄位留空也能用。

地圖(map)本身建議先只存一張參考圖(沿用 IndexedDB),不做互動式地圖編輯器 —— 那是獨立的大工程,列為非目標。

`visualBible` 應注入所有生圖/生影片 prompt(位置在角色前綴之後、場景描述之前),與 `styleBible` 的概念一致 —— 參考 [`docs/director-3am-call.json`](./director-3am-call.json) 已有的 `project.styleBible` 欄位。

### 8.4 小說匯入自動拆分

貼入長文 → `gemini-2.5-flash` 拆成集 → 場 → 鏡。

| 問題 | 對策 |
|---|---|
| 長文超過單次 token 上限 | 分段處理,每段帶前段摘要維持連貫;段界優先切在章節標記 |
| 拆分結果不可控 | 分兩階段:先只拆「集/場」讓使用者確認,再逐場拆鏡 |
| 角色自動識別 | 拆分時同時產出角色清單,建立資產後**在 prompt 內用 `@` 標記**(見 §12) |

### 8.5 專案備份 / 資料匯出匯入

對標對象在 Project Hub 有「資料匯入/匯出」、Project Overview 有「專案備份/匯出」,與 Phase 04 的「劇集級備份」(§7.2.5)是同一套機制的三種粒度:

| 粒度 | 內容 | 現況 |
|---|---|---|
| 分鏡 | 分鏡陣列 JSON | **已有**(`import-json-button` + `timeline-export`) |
| 劇集 | 一集的分鏡 + 素材 + 資產引用 | 缺 |
| 專案 / 全域 | 所有專案 + 全域資產庫 + 所有素材 | 缺 |

**設計要點**:三種粒度共用一個 `snapshot` 格式,以 `scope` 欄位區分,避免做成三套互不相容的匯出。

```ts
export const snapshotSchema = z.object({
  version: z.literal(1),
  scope: z.enum(["frames", "episode", "project", "all"]),
  exportedAt: z.string(),
  projects: z.array(projectSchema).default([]),
  seasons: z.array(seasonSchema).default([]),
  episodes: z.array(episodeSchema).default([]),
  frames: z.array(frameSchema).default([]),
  assets: z.array(assetSchema).default([]),
  /** IndexedDB 素材以 zip 內相對路徑索引,不塞進 JSON */
  mediaManifest: z.array(z.object({ key: z.string(), file: z.string() })).default([]),
});
```

素材沿用 [`src/lib/zip.ts`](../src/lib/zip.ts) 打包(已驗證可產生合法 zip,通過 `unzip -t` 與 Python `zipfile` CRC 全檢),JSON 與素材放同一個 zip,`mediaManifest` 做對應。匯入時**必須先驗證 `version` 與 `scope`**,並沿用現行「整批驗證、失敗全拒」的原則。

**風險**:全域匯出可能非常大(每張圖 base64 存在 IndexedDB)。應先估算總量並提示,超過閾值時建議分集匯出。

### 8.6 驗收條件

1. 現有專案(無季/集)完全不受影響,`getFramesByProject` 結果不變。
2. 建立季/集後,分鏡能歸屬到集,且未歸屬的舊分鏡仍可見。
3. 小說拆分為兩階段確認,第一階段不建立任何分鏡資料。
4. `worldview.visualBible` 有值時出現在生成的 prompt 中。
5. `worldview.regions[].locations[].sceneAssetId` 能連到 N2 的場景資產;未建立時留空不報錯。
6. 匯出再匯入後,分鏡數、素材數、資產數與匯出前一致(可程式比對)。

---

## 9. N6 — 模型配置 UI(對應「模型配置」/ Project Hub)

### 9.1 現況

模型與金鑰散在三個地方,全部要改 code 或改檔案後重啟:

| 設定 | 位置 |
|---|---|
| 生圖可選模型 | [`generate-image.ts`](../src/actions/generate-image.ts) 的 zod enum + `seedance-options.ts` 的 `modelOptions` |
| 生圖 credit 成本 | `generate-image.ts` 與 `credits.ts` **各有一份**(重複) |
| 影片模型清單 | [`src/lib/video/index.ts`](../src/lib/video/index.ts) 的 `VIDEO_MODELS` |
| 金鑰 | `.env.local`,改完必須重啟 dev server |

**這個缺口今天實際咬過一次**:`gemini-3-pro-image-preview` 於 2026-06-25 停用,修它要動三個檔案。有 UI 配置的話,換 model id 是改一個欄位。

### 9.2 設計

```ts
export const modelConfigSchema = z.object({
  /** 空字串 = 用內建預設。不要把預設值寫死在這裡,否則使用者的舊設定會鎖住內建更新 */
  imageModel: z.string().default(""),
  videoModel: z.string().default(""),
  /** 自訂模型清單:讓使用者新增內建清單沒有的 model id,不必等改 code */
  customImageModels: z.array(customModelSchema).default([]),
});
```

**實作時的兩個修正**(已完成的版本與上面初稿不同):

1. **預設值用空字串而非寫死 model id**。若把 `"gemini-2.5-flash-image"` 存進 store,使用者的舊設定會把內建更新鎖住 —— 之後改內建預設對他們無效。空字串代表「跟隨內建」。
2. **`textModel` 走 action input 而非讀 store**。server action 讀不到 client store,所以六個文字 action 一律加一個 optional `textModel` 欄位,由呼叫端傳入;action 內部用 `resolveTextModel()` 解析,留空即內建預設。

**關鍵限制:金鑰不進這個 store。** 金鑰必須留在 server 端環境變數,前端 store 只存 model id 與標籤。理由:`localStorage` 可被任何同源腳本讀取,把 API key 放進去等於放棄 server action 的保護 —— 這與 v0.1 spec 風險章節「API key 一律走 server action,前端不碰 key」一致,**不可為了對標而讓步**。

若要做到「UI 輸入金鑰」,唯一安全的做法是後端加密儲存,那屬 v0.1 的 M6 範圍。

### 9.3 連帶要修的重複

`MODEL_CREDIT_COST` 在 `generate-image.ts:35` 與 `credits.ts:3` 各存一份,今天修模型 id 時兩邊都得改。應收斂成單一來源。

### 9.4 驗收條件

1. 未設定時所有模型與現行預設完全一致。
2. 在 UI 換 image model 後,生圖送出的 payload 使用新 model id。
3. 新增自訂 model id 後可在下拉選到,且 zod 不再硬擋(改為驗證非空字串)。
4. **`localStorage` 中不出現任何 API 金鑰**(可程式檢查)。
5. credit 成本只有一個定義來源。

---

## 10. N7 — 全自動計畫預審(對應 Phase 01「全自动计划预审」)

### 10.1 為什麼這項對本專案特別有價值

生圖免費層 `limit: 0`、影片無免費層 —— **每次生成都是真金白銀**。在花錢之前先讓便宜的文字模型審一遍整份分鏡計畫,是直接的成本控制,不是錦上添花。

### 10.2 設計

用 `gemini-2.5-flash`(免費層有配額)對全片做結構化審查,回傳問題清單:

```ts
export const planReviewSchema = z.object({
  issues: z.array(z.object({
    frameId: z.string().optional(),        // 無則為全片層級問題
    severity: z.enum(["blocker", "warning", "hint"]),
    category: z.enum([
      "missing-asset",        // @ 了不存在的資產(可與 §5.6 共用掃描結果)
      "missing-prompt",       // 場景描述空白
      "continuity",           // 連戲問題:相鄰鏡景別過近、跳軸
      "pacing",               // 節奏:單鏡過長/過短、總長偏離目標
      "cost",                 // 成本:預估花費與模型選擇
      "prompt-quality",       // prompt 過短、含中文導致生圖不穩、含文字要求
    ]),
    message: z.string(),
    suggestion: z.string().optional(),
  })),
  estimatedCredits: z.number(),
});
```

**成本預估不必靠 AI**:`VIDEO_MODELS[].creditCost` 與 `MODEL_CREDIT_COST` 已有單價,乘上鏡數與秒數即可程式算出,比讓模型猜準確。AI 只負責語意層面的審查(連戲、節奏、prompt 品質)。

**部分檢查完全不需要 AI**,應優先用程式規則做(快、免費、確定):

| 檢查 | 實作方式 |
|---|---|
| 場景描述空白 | 程式 |
| `@` 了不存在的資產 | 程式(§5.6) |
| 相鄰鏡景別過近 | 程式(若 prompt 有結構化景別欄位;目前沒有,需 AI 判讀) |
| 總長偏離目標 | 程式(`buildTimeline` 已算出 `totalDurationSec`) |
| 預估花費 | 程式 |
| 連戲 / 跳軸 / prompt 品質 | AI |

### 10.3 驗收條件

1. 純程式規則的檢查在無 API 額度下也能跑。
2. 預估花費與 `creditCost` 表算出的數字一致。
3. 有 `blocker` 時明確標示,但**不阻擋使用者硬要生成**(建議而非強制)。
4. 審查結果不修改任何分鏡資料。

---

## 11. N8 — 代理服務加固

### 11.1 現況(已有防護,先更正)

[`src/app/api/video/download/route.ts`](../src/app/api/video/download/route.ts) **已經實作了 SSRF 防護**,不是空白:

- `ALLOWED_HOST_SUFFIXES` 白名單,9 個 provider 網域(googleapis / volces / volccdn / byteimg / bytedance / klingai / kuaishou / kwimgs / yximgs)
- 只允許 `https:`,其餘回 403
- 金鑰只在 `googleapis.com` 時才附加,其他 provider 的 CDN 視為公開連結
- 原始碼註解已明確標示此處為 SSRF 防護

對照對標對象 `media-proxy` 的五道防護,本專案的落差比原先評估的小得多:

| 防護 | media-proxy | 本專案 |
|---|---|---|
| 主機白名單 | 有 | **有** |
| 限定協議 | 有 | **有** |
| 禁私網位址 | 有 | 白名單已間接涵蓋(但見 11.2) |
| URL 長度上限 | 有 | 無 |
| 逾時 | 有 | 無 |

### 11.2 真正的問題:後綴比對可被前綴冒充

```ts
target.hostname.endsWith("googleapis.com")
```

`"evil-googleapis.com".endsWith("googleapis.com")` 的結果是 **`true`**。攻擊者只要註冊一個以白名單網域結尾的域名,就能通過檢查。

而第 44–53 行在判定為 `googleapis.com` 時會把 `GOOGLE_AI_API_KEY` 寫進 query string 一併送出 —— **所以這不只是 SSRF,是金鑰外洩路徑**。這是目前這份規格書裡唯一的「應立即修補」等級問題,與功能對標無關,建議獨立於所有 N 項優先處理。

正確的比對:

```ts
const allowed = ALLOWED_HOST_SUFFIXES.some(
  (s) => target.hostname === s || target.hostname.endsWith("." + s)
);
```

### 11.3 其餘補強

- **URL 長度上限**:避免超長 URL 造成的資源消耗。
- **逾時**:原本的 `fetch` 沒有 timeout,慢速上游會一直佔住連線。
  **不可用 `AbortSignal.timeout(ms)`** —— 那會涵蓋整個請求生命週期,而此端點是把 `upstream.body` 直接 streaming 回前端,大檔影片傳到一半就會被中斷。正確做法是 `AbortController` + `setTimeout`,**取得 response 後立刻 `clearTimeout`**,讓逾時只保護「建立連線到收到 headers」這一段。
- **DNS rebinding**:白名單網域若解析到私網位址仍會被放行。屬進階議題,現階段可只記錄不處理。

**不需要拆成獨立服務** —— 對標對象拆服務是因為它是多容器架構,本專案在 route handler 內補齊即可。

### 11.4 驗收條件

1. `https://evil-googleapis.com/x` **被拒絕**(這是修補前會通過的案例,必須成為回歸測試)。
2. `https://storage.googleapis.com/...` 與各 provider 的正常下載仍通過(**回歸測試必做**)。
3. `http://`、`file://`、白名單外主機一律拒絕。
4. 超長 URL 與上游逾時都有明確錯誤回應,不會懸掛。

---

## 12. 跨 Phase 的一個共同改動:AI 產出直接帶 `@` 標記

[`src/actions/generate-storyboard.ts:18`](../src/actions/generate-storyboard.ts) 目前的 `characters` 只是 `z.array(z.string())`(純名稱),產出的分鏡 `castIds` 全空、prompt 用 `The daughter` 這種泛稱(已實測確認)。

改成把資產名單餵進去並要求用 `@名稱` 標記,可**一次補上兩件事**:出場角色標記 + 指涉錨定。這是 N2 之後最划算的小改動,且同時服務 N5 的小說拆分。

另一個相關的未決項:`composeCastPrompt` 已回傳 `usedAssetIds`,但目前**沒有寫回 `frame.castIds`**(生圖時偷改資料太意外)。若要讓 cast-picker 與 `@` 引用同步,應在**編輯 prompt 時**更新,而非生成時。

---

## 13. 資料模型改動彙整

| 檔案 | 改動 | 缺口 |
|---|---|---|
| `src/lib/video/types.ts` | `VideoGenRequest.endImageDataUrl`、`VideoModelOption.supportsEndFrame` | N1 |
| `src/lib/schemas.ts` | `frameSchema.endImageKey` | N1 |
| `src/lib/storyboard-prompt.ts` | `GridSize` 加 `4 | 6`、`GridOrientation`、`gridLayout()` | N1 |
| `src/lib/schemas.ts` | `ASSET_KINDS`、`assetSchema`(kind / characterType / ownerAssetId) | N2 |
| `src/lib/cast.ts` | 一致性指示句依 kind 分組、`findMissingMentions()` | N2 |
| `src/lib/schemas.ts` | `promptTemplateSchema`、`promptTemplateVersionSchema` | N3 |
| `src/lib/prompt-template.ts` | 新檔:`renderTemplate()` | N3 |
| `src/lib/schemas.ts` | `seasonSchema`、`episodeSchema`、`frameSchema.episodeId` | N5 |
| `src/lib/schemas.ts` | `projectSchema.worldview`(含 `regions[].locations[]` 兩層結構) | N5 |
| `src/lib/schemas.ts` | `snapshotSchema`(四種 scope 共用) | N4 / N5 |
| `src/lib/schemas.ts` | `modelConfigSchema`(**不含金鑰**) | N6 |
| `src/lib/schemas.ts` | `planReviewSchema` | N7 |
| `src/lib/db.ts` | `getEndImageKey` / `saveEndImage` / `loadEndImage` / `deleteEndImage` | N1 |
| `src/stores/use-character-asset-store.ts` | persist `version: 1` + `migrate`(注意 `partialize`) | N2 |
| `src/app/api/video/download/route.ts` | 主機白名單 / 協議 / 私網 / 長度 / 逾時 | N8 |

**需要收斂的既有重複**:`MODEL_CREDIT_COST` 目前在 `generate-image.ts:35` 與 `credits.ts:3` 各一份(N6 §9.3)。

---

## 14. 里程碑與依賴

沿用 v0.1 的 M 編號(M2–M6 仍待辦),新增項目編號 N,避免兩套編號衝突:

| 編號 | 內容 | 與 v0.1 的關係 | 依賴 | 規模 |
|---|---|---|---|---|
| **N6** | 模型配置 UI | v0.1 未涵蓋 | 無 | 小 |
| **N1** | 鏡頭工作台(首尾關鍵幀 / 雙鏈路 / 宮格橫直版) | v0.1 未涵蓋 | 無 | 中 |
| **N2** | 資產庫泛化 + 批量補齊缺失資產 | 擴充 M1 | 無 | 中 |
| **N7** | 全自動計畫預審 | v0.1 未涵蓋 | 弱依賴 N2(缺失資產掃描共用) | 小 |
| **N3** | Prompt 管理 + 版本歷史 | v0.1 未涵蓋 | 弱依賴 N2(模板需 kind 分組句) | 中 |
| **N4** | 交付中心(時間軸/粗剪/渲染追蹤/備份/成片) | **等同 M2** 並擴充 | 弱依賴 N1 | 大 |
| **N5** | 專案層級(季/集/小說/世界觀/專案備份) | v0.1 未涵蓋 | 與 N4 共用 `snapshotSchema` | 大 |
| **N8** | 代理服務加固 | v0.1 風險章節已提及原則 | 無 | 小 |

**建議順序:先修 N8 §11.2 的金鑰外洩,再走 N6 → N1 → N2 → N7 → N3 → N4 → N5**。

N8 §11.2 是安全性缺陷不是功能項,不該排在功能後面 —— 改一行 `endsWith` 比對邏輯即可,成本極低而風險是金鑰外洩。N8 的其餘補強(長度上限、逾時)可隨時插入。

功能項的排序理由:

1. **N6 先做,因為它讓後面每一項都更好測** —— 現在換個 model id 要改三個檔案重啟,今天已經因為 `gemini-3-pro-image-preview` 停用踩過一次。規模小、無依賴。
2. **N1 是最大的品質差距** —— provider 抽象已預留,改動集中在 3 個 adapter + UI。宮格橫直版對短影音(9:16)是必需,不是選配。
3. **N2 解漫劇最常崩的問題** —— 場景不一致。`@mention` 機制可完整複用,且「批量補齊」是本專案獨有的優勢(`@` 讓引用可程式掃描)。
4. **N7 排在 N2 之後** —— 缺失資產掃描與 N2 §5.6 共用實作。它的價值是**在花錢之前擋下問題**,對目前無免費額度的處境特別實際。
5. **N3 影響每天的工作迴圈** —— 排在 N1/N2 後,它們的模板才一起受益。
6. **N4 最重** —— ffmpeg.wasm 與 COOP/COEP 是唯一會影響全站的改動,且現有剪映流程已能出片,不急。
7. **N5 遷移風險最大** —— 放最後,用「`episodeId` 可選」把破壞性降到零;與 N4 的備份共用 `snapshotSchema`,兩者宜一起設計。
8. **N8 獨立** —— 安全性修補,不依賴任何其他項,可在任何時間點插入。

**不建議做的**:引入資料庫或後端服務來對標。§2.3 已確認對標對象同樣沒有 DB,資料存瀏覽器本地。後端屬 v0.1 的 M6(營運需求),與功能對標無關。

---

## 15. 風險總表

| 風險 | 影響範圍 | 對策 |
|---|---|---|
| 生圖/生影片無免費額度,無法端到端驗收 | 全部 | 驗收拆兩層:先驗 payload 正確性(攔截 request),再於有額度時驗產出 |
| 各家影片 API 首尾幀參數不一致且會變 | N1 | 收斂在 adapter,`types.ts` 只定契約;實作註明以官方文件為準 |
| 資產 store 遷移導致使用者資料消失 | N2 | persist key 不變 + `migrate` + 遷移驗收條件 |
| 模板覆寫後生成品質崩壞 | N3 | 內建當 fallback + 版本歷史 + 還原內建 |
| COOP/COEP headers 破壞現有跨源載入 | N4 | 加 headers 後對生圖、影片下載代理做回歸測試 |
| ffmpeg.wasm 體積與記憶體 | N4 | 動態 import + 能力偵測 + 降級回剪映流程 |
| 季/集遷移破壞既有分鏡 | N5 | `episodeId` 可選,不改 `projectId` |
| 兩份 spec 對現況描述分歧 | 文件 | 更新 v0.1 的「實作進度」章節(見 §2) |
| **金鑰若進 `localStorage` 等於放棄 server action 保護** | N6 | 前端只存 model id,金鑰留 server 環境變數(§9.2) |
| **下載代理的 `endsWith` 後綴比對可被 `evil-googleapis.com` 冒充,而該分支會附上 `GOOGLE_AI_API_KEY` → 金鑰外洩** | N8 | 改為 `=== s \|\| endsWith("." + s)`;**此項應優先於所有功能項處理**(§11.2) |
| 全域匯出體積過大(素材 base64) | N4 / N5 | 先估算總量並提示,超閾值建議分集匯出 |
| 宮格用橫版比例生直版短影音 → 構圖全走掉 | N1 | `gridLayout()` 依橫直版決定 cols×rows,prompt 明確指定每格比例(§4.9) |
| 計畫預審誤報導致使用者失去信任 | N7 | 純程式規則優先(確定性高),AI 只判語意層;`blocker` 不阻擋硬要生成 |

---

## 16. 內部技術債(D1–D9)

> 與對標無關,是自身架構的問題。編號用 D 以免與功能缺口 N 混淆。
> **D0 已於 2026-08-13 修掉**:三個生圖入口的 prompt 本體不一致(分鏡編輯器與批次生圖只送 `frame.prompt`,只有提示詞總表走 `buildImagePrompt`),已統一並實測三者逐字相同。

### D1 — style / mood 對照表有兩份,且內容不同

```
veo-prompt.ts:        STYLE_LENS(59)  /  MOOD_LIGHTING(40)
storyboard-prompt.ts: LENS_STYLE(24)  /  MOOD_STYLE(5)
```

名稱幾乎互換(`STYLE_LENS` vs `LENS_STYLE`),內容各自演化過。同一個 `Cinematic`:

- `veo-prompt`:`Shot on 35mm anamorphic lens with oval bokeh and horizontal flare, cinematic 2.39:1 widescreen aesthetic, shallow depth of field`
- `storyboard-prompt`:`cinematic film quality, shot on 35mm anamorphic lens with shallow depth of field and oval bokeh`

**不要盲目合併成一份**。九宮格的措辭刻意較短 —— 一張圖要塞 9 格,每格的描述若和單鏡一樣長,prompt 會失焦。正確做法是**一份資料、兩種長度**:

```ts
// 建議:單一來源,分 verbose / compact 兩個欄位
const STYLE_LENS: Record<string, { verbose: string; compact: string }>
```

風險:合併時若不小心改動措辭,既有專案重生的圖會與舊圖風格不一致。建議連同 N3(Prompt 管理)一起做,讓使用者能看到並覆寫這兩份措辭。

### D2 — `MODEL_CREDIT_COST` 有兩份

`generate-image.ts:35` 與 `credits.ts:3` 各存一份。今天修 `gemini-3-pro-image-preview` 時兩邊都得改。收斂到 `credits.ts`,`generate-image.ts` 改 import。屬 **N6** 的一部分。

### D3 — `imageBase64Key` 名字騙人

叫 key 但**從來沒被當 key 用過**:全專案只做 truthy 判斷,實際載入一律 `loadImage(frame.id)`。九宮格切圖還在它後面加了 `#{timestamp}` 當版本號,語意更混。

建議改名為 `hasImage: boolean` + 另一個 `imageVersion?: string`,語意各自清楚。**這是破壞性 schema 改動**,需要 persist migrate,建議與 N2 的資產遷移同批做,只遷一次。

### D4 — `useImageStorage(frameId, revalidateKey)` 是補丁不是架構

外部直接寫 IndexedDB 後,hook 無從得知要重載,只能靠呼叫端**記得**傳一個會變的字串。忘記傳就是靜默的畫面不更新 bug(這個 bug 實際發生過)。

正確方向:圖片狀態納入 store,或用 module-level 的變更事件通知所有訂閱者。與 D3 相關,宜一起處理。

### D5 — client component 做路由守衛,硬導航必 404

`src/app/project/[id]/page.tsx` 是 client component,`getProject(id)` 找不到就 `notFound()`。zustand persist 的 rehydration 是異步的,首次 render 時 store 還是空的 —— **所以直接開 `/project/xxx` 這個 URL 一定 404**,只有從首頁點連結(client 導航)才進得去。

這不只是開發時的不便,是**使用者無法把專案網址存成書籤或分享**。修法:等 rehydration 完成再判斷(`persist` 有 `onFinishHydration` / `hasHydrated`),hydration 未完成時顯示 loading 而非 `notFound()`。

### D6 — 完全沒有測試

`zip.ts`(手寫 ZIP 二進位格式)、`grid-split.ts`(Canvas 切圖)、`timeline-export.ts`(時間軸累加與 SRT 時間碼)、`cast.ts`(`tokenizeMentions`)全是純函式,最適合單元測試,但一個都沒有。

`zip.ts` 特別值得測 —— 它手寫 local header / central directory / EOCD / CRC32,一個位移算錯就產生壞檔,而且**壞在使用者的剪映裡才會被發現**。驗證它時得另外起一個 Node HTTP receiver 才能把 blob 傳出瀏覽器用 `unzip -t` 檢查,那種驗證流程無法重複執行。

**已於 2026-08-13 處理,但沒有用 vitest。** Node 22.12 的 `node:test` + `--experimental-strip-types` 可以直接跑 TypeScript,**零新增依賴**,更符合本專案慣例。

可測範圍受限於瀏覽器 API 依賴:

| 模組 | 瀏覽器 API | 可在 Node 測 |
|---|---|---|
| `zip.ts` | 無(只用 `Blob` / `TextEncoder` / `DataView`,Node 皆有) | 是,已測 |
| `timeline-export.ts` | 無(只 `import type`) | 是,已測 |
| `grid-split.ts` | `document.createElement("canvas")`、`new Image` | 否 |
| `cast.ts` | 無,但頂層 `import { loadAssetImage } from "./db"`(idb-keyval) | 否 —— 需先把純函式拆出獨立模組 |

後兩者若要測,得先做結構調整(`cast.ts` 把 tokenizer 拆成不依賴 db 的檔案;`grid-split.ts` 需 DOM 環境),那才會需要新增依賴,屆時再決定。

`tsconfig.json` 加了 `allowImportingTsExtensions`(因為 Node ESM 要求 import 帶 `.ts` 副檔名),讓 tests 也一起被 `tsc --noEmit` 檢查。

### D7 — 死檔案

- `src/actions/frame.ts` —— 整個檔案只有註解掉的 CRUD 簽名,是 v0.1 spec 時代「未來接 DB」的殘留。
- `src/proxy.ts` —— `matcher` 設了 `/project/:path*` 與 `/api/:path*`,但函式只 `return NextResponse.next()`,每個 matched 請求都白跑一層(log 裡看得到 `proxy.ts: 6ms`)。

兩者都留著 TODO 註解沒問題,但要意識到 `proxy.ts` 是**有執行成本的空殼**。

### D8 — 編輯模式不一致

`frame-editor` 是「填完按儲存變更」,`prompt-row` 是「輸入 500ms 後自動存」。同一份資料兩種心智模型,使用者會不確定改動有沒有生效。建議統一為 debounce 自動存(`prompt-row` 那套已驗證好用),儲存按鈕保留但降級為「立即存」。

### D9 — 影片任務狀態有兩個家

`frameSchema` 有 `videoKey` / `videoStatus` / `videoDurationSec` / `videoError`,而 `use-job-store` 也在管任務狀態。兩邊都可能是真相來源。

**更正**:`use-job-store` **也是 persist 的**(先前本節誤述為「不需持久化」)。它存 `providerJobId`,重開瀏覽器後要靠它繼續輪詢未完成的任務,所以本來就該持久化。

真正的界線是**「結果 vs 任務」**而非「持久 vs 暫時」:

| | 職責 | 持久化 |
|---|---|---|
| `frameSchema.video*` | 分鏡的最終結果(哪個 key 有影片、狀態、時長、錯誤) | 是 |
| `use-job-store` | provider 端任務追蹤(`providerJobId`、輪詢) | 是 |

**實際風險**:`videoStatus` 與 `VideoJob.status` 在 `running` / `succeeded` / `failed` 三個值上重疊,兩邊各自更新就會出現「job 已成功但分鏡還顯示 running」。已在 `frameSchema` 加註解標明,做 **N4 渲染追蹤** 時應進一步收斂為單一來源。

---

## 17. 執行進度

> 開新 session 接手時,**先讀 [`CLAUDE.md`](../CLAUDE.md)**(環境前提、配額限制、驗收慣例、測試資料注入方式),再看本章挑任務。
> 每項完成後把 `[ ]` 改成 `[x]`,並在該 N 項的「驗收條件」逐條確認過再打勾。

### 最優先:安全性(不是功能項)

- [x] 修 `endsWith` 前綴冒充漏洞(§11.2)—— 已於 2026-08-13 修掉。抽出 `matchesHost()`,白名單比對與「是否附加 API key」兩處都改用 `=== s || endsWith("." + s)`。**實測舊版共放行 5 個惡意網域**:`evil-googleapis.com`、`notklingai.com`、`xvolces.com`、`evil-kwimgs.com`、`fakebytedance.com`
- [x] 回歸測試 —— 7 個端點案例全過(冒充網域 / 白名單當前綴 / 非 https / 過長 / 格式錯誤 / 缺參數皆正確拒絕),合法網域仍放行未誤擋

### N6 模型配置 UI(小 · 無依賴)

**2026-08-13 完成(含 textModel)。**

- [x] ~~`modelConfigSchema` + store(**不含金鑰**)~~ —— `use-model-config-store.ts`,空字串代表「用內建預設」,所以沒設定過的行為完全不變、內建預設也能隨版本更新生效
- [x] ~~設定 UI~~ —— 首頁 header 的「模型設定」對話框,可切生圖與生影片預設模型;`src/lib/model-config.ts` 是「覆寫優先、否則內建」的單一解析入口
- [x] ~~自訂 model id~~ —— zod 由 enum 改為 `z.string().min(1)`。**實測**:加入 `gemini-3.1-flash-image` 後選用,送到 server 的 model 確實是它且未被 zod 擋下
- [x] ~~收斂 `MODEL_CREDIT_COST`~~ —— 見技術債 D2
- [x] ~~驗收:`localStorage` 不出現任何金鑰~~ —— 已程式檢查
- [x] ~~textModel~~ —— 2026-08-13 補上。`model-config.ts` 加 `DEFAULT_TEXT_MODEL` / `TEXT_MODEL_OPTIONS` / `resolveTextModel()`,六個文字 action(`generate-storyboard`、`generate-next-frame`、`rough-cut`、`split-novel`、`review-plan-ai`、`infer-asset`)的 input 都加 `textModel?`,由呼叫端以 `useModelConfigStore.getState().textModel` 傳入。**實測**:store 塞入不存在的 `gemini-zenvora-probe-404` 後跑「AI 深度檢查」,Google 回 `models/gemini-zenvora-probe-404 is not found` —— 證明設定值真的進到 URL;改回 `gemini-2.5-flash` 後同一份分鏡成功回傳 2 項觀察(連戲 + 節奏)

**連帶影響**:生圖與生影片面板的模型下拉現在以設定值為預設,但仍可臨時改單次生成用的模型 —— 設定是預設值而非鎖定。

### N1 鏡頭工作台(中)

- [x] ~~`VideoGenRequest.endImageDataUrl` + `VideoModelOption.supportsEndFrame`~~ —— 2026-08-14 完成。同時加了 `supportedAspects` 與 `allowedDurations`,因為查文件時發現**兩個既有錯誤**:Veo 只吃 16:9 / 9:16 但 UI 提供 1:1;Veo 只接受 4 / 6 / 8 秒但分鏡 `duration` 是 4–15 連續值,5 秒直接送出去會被打回來。能力寫在註冊表、UI 依此過濾
- [x] ~~`frameSchema.endImageKey` + `db.ts` end-image 函式~~ —— `endimage-` 前綴獨立一組(`getEndImageKey` / `save` / `load` / `delete`)。**刻意不給 `saveImage` 加參數**:起始幀是「這一鏡的圖」,結束幀是「這一鏡的生成約束」,生命週期不同,備份 manifest 也要分得出來。備份已帶上結束幀
- [x] ~~veo provider 接首尾幀~~ —— **查到官方參數是 `instances[].lastFrame`**(先前標為待查證)。抽出純函式 `buildVeoPayload` 讓回歸可測;只在有起始幀時加 lastFrame。action 那層再擋一次(引擎不支援就丟掉)
- [ ] kling provider 接首尾幀 —— **卡在帳號**:據稱參數是 `image_tail`,但沒有 `KLING_ACCESS_KEY` 無法查證官方文件。`supportsEndFrame` 先標 `false`,不宣稱支援
- [ ] seedance provider 接首尾幀 —— 同上卡在帳號。而且要注意:現有那個 provider 打的是**即夢 VGFM**,它沒有結束幀;Seedance 2.0 才有參考影片,但那是另一個 API(§19)
- [ ] `ImageGenerator` 支援 slot(`"start" | "end"`)—— **未做,改用較小的做法**:結束幀的上傳/預覽/移除直接做在 `VideoPanel` 裡。把 `ImageGenerator` 參數化要動它所有的 db 呼叫與 `useImageStorage`,風險大於價值;而且結束幀是「影片的生成約束」,放在影片面板比放在生圖面板更合語意
- [x] ~~`VideoPanel` 結束幀欄位(依 `supportsEndFrame` 顯示)~~ —— 只在 `supportsEndFrame && 有起始幀 && 鏈路不是 t2v` 時出現;引擎把秒數吸附掉時明講「分鏡設的 5s 會以 4s 送出」
- [x] ~~雙視頻鏈路:t2v / i2v 明確入口(§4.8)~~ —— 2026-08-13 完成。`VideoPanel` 加鏈路下拉,三個選項:`auto`(預設,行為與先前完全一致)/ `i2v` / `t2v`。
  **明確選了就不再自動退讓**:選 i2v 卻沒有關鍵幀時直接報錯,不靜默改走 t2v 燒掉額度;選 i2v 但引擎 `supportsImage === false` 也擋下。
  同時修掉一個既有缺陷:`buildVeoPrompt` 無條件加「必須符合上傳參考圖的長相」,但 t2v 根本沒有參考圖 —— 加 `hasReferenceImage` 選項(**預設 true,既有呼叫方輸出不變**),t2v 時省掉那一句。
  **未採用** spec 原本建議的「i2v 改走 `buildFlowPrompt`」:那會改動目前主路徑的 payload,而生影片沒有免費額度、無法驗證品質是否真的更好。留待有額度時再評估。
  **實測**:選 i2v 且無關鍵幀 → toast 明確提示且 network 面板無任何 server action 請求(擋在送出前);4 個單元測試釘住 `hasReferenceImage` 的預設等價與「只少那一段」。t2v 的實際送出未跑 —— 生影片要真金白銀
- [x] ~~宮格 4/6/9 × 橫直版(§4.9)~~ —— 2026-08-13 完成。實作為 `gridSpec()`(非初稿的 `gridLayout()`),同時回傳排版、整張比例與**每格的近似比例**;`buildGridPrompt` 加 `orientation` 參數,UI 可選格數與方向(預設 9 格直版,因為這個工具主要用於短影音)。8 個單元測試釘住排版數學,並實測 6 格橫版切圖順序正確
- [x] ~~驗收:只有起始幀時 payload 與現行完全一致(防回歸)~~ —— 11 個單元測試(`tests/veo-payload.test.ts`)。這條是首尾關鍵幀最大的風險:改壞現有圖生影片會安靜地變成別的東西,而生影片沒有免費額度、開發時不會有人發現。
  **瀏覽器實測**:攔截 server action 的 request body —— `mode=i2v`、起始幀與結束幀都在且內容不同、5s 已吸附成 4s、Veo 的比例下拉只有 16:9/9:16、切到即夢後結束幀 slot 消失。**全程攔掉 POST,沒有任何請求打到 Veo**

### N2 資產庫泛化(中)

**2026-08-13 完成核心;批量補齊與 costume 歸屬 UI 未做。**

- [x] ~~`ASSET_KINDS` + kind 維度~~ —— **保留 `characterAssetSchema` 的名稱**而非改名成 `assetSchema`,避免為了語意漂亮而大規模重構(`CharacterAsset` 型別散在十幾個檔案)。新增 `kind` / `ownerAssetId`,`type`(actor/presenter/reface)保持原意並在註解標明只在 `kind === "character"` 時有效
- [x] ~~persist `version: 1` + `migrate`~~ —— **實測 v0 資料遷移零損失**:`version` 0→1、補上 `kind: "character"`、`appearance` / `referenceImageKeys` / `tags` / `type` 全部保留
- [x] ~~一致性指示句依 kind 分組~~ —— 四種 kind 各有自己的句式,並且**多種類混用時分成多句**而非全部塞進一句。對場景說 `identical face, hairstyle` 是純雜訊,會稀釋 prompt
- [x] ~~參考圖依 kind 分歧~~ —— 新增 `scene-sheet`(多視角 establishing shots,**不是** turnaround —— 對一個房間說「轉一圈」沒有意義)與 `prop-sheet`(白底多角度產品圖,道具與服裝共用)。這兩個模板也一併納入 N3 的可編輯清單
- [x] ~~資產庫 UI~~ —— kind 選擇、依 kind 篩選(附數量)、卡片徽章;選非人物時「角色類型」欄位自動隱藏。使用者可見的「人物資產」字樣一併改為「資產庫」
- [x] ~~`findMissingMentions()`~~ —— 已於 N7 實作
- [x] ~~批量補齊缺失資產:掃描 + 一鍵建立~~ —— 2026-08-13 完成。`reviewPlan` 改回傳結構化的 `missingAssets`,計畫預審對話框列出缺失名稱並提供「讀上下文建立」。
  `actions/infer-asset.ts` 讀該名稱出現過的分鏡描述(最多 6 段),推斷 **kind** 與英文外觀草稿 —— 與其要使用者從零想外觀,不如給他一份能改的稿。
  **實測**:三鏡引用 `@管家` 與 `@老宅書房`,前者正確推成 `character`(外觀綜合了 worn black tailcoat / white gloves / weathered face),後者正確推成 `scene`(dark walnut panelling / bookshelves / leather armchairs)
- [ ] **批次生成參考圖未做** —— 生圖需要 API 額度(免費層 `limit: 0`),無法驗證產出。資產建立後可逐個到資產庫按「生成設定圖」
- [x] ~~`ownerAssetId` UI~~ —— 2026-08-13 完成。資產編輯器加「屬於哪個人物」下拉,**只在種類為服裝時出現**(與「角色類型」只在人物時出現同一套邏輯);選項只列人物資產,可選「未指定(通用服裝)」。卡片上會顯示「屬於 X」。
  改種類離開服裝時歸屬一併清掉,免得留下看不見的舊值。**刪除人物時,指向它的服裝改回未指定**(store `deleteAsset` 一併處理),不留斷掉的參照。
  **實測**:建服裝並指定歸屬 → localStorage 的 `ownerAssetId` 正確指向該人物、卡片顯示「屬於 管家」;把歸屬改到另一個人物後刪掉那個人物 → 服裝的 owner 變回 none(非 dangling id)、卡片的「屬於」那行消失。測試資產已全部刪除還原

驗收另有 11 個單元測試涵蓋分組出句與各 kind 的參考圖句式。

### N7 全自動計畫預審(小 · 弱依賴 N2)

**2026-08-13 完成純程式規則與 UI;AI 語意檢查未做。**

- [x] ~~純程式規則檢查~~ —— `src/lib/plan-review.ts`,七類規則:空白描述(blocker)、資訊量過低、`@` 了不存在的資產(blocker)、重複描述、含中文、描述要求畫面出現文字(與 no-text 指示衝突)、總長偏離短影音區間、無對白、成本估算
- [x] ~~問題清單 UI~~ —— 工具列「計畫預審」對話框,依 blocker / warning / hint 分組,附成本統計列。**用 TypeScript interface 而非 zod schema** —— 這是內部計算結果,不是需要驗證的外部輸入,加 zod 只是多一層無用的執行期檢查
- [x] ~~驗收~~ —— 純程式規則完全不需 API(32 個單元測試涵蓋);`blocker` 只標示不阻擋生成
- [x] ~~缺失資產掃描~~ —— `findMissingMentions()`(spec §5.6),連帶把 `cast.ts` 的純函式拆成 `mention.ts`(原本頂層 import idb-keyval 導致無法測試,見 §16 D6)
- [x] ~~AI 語意檢查~~ —— 2026-08-13 完成。`actions/review-plan-ai.ts` 四類:連戲、跳軸(180 度線)、描述品質、節奏。用文字模型所以**不耗生圖額度**。
  **prompt 明確禁止它重複報告程式規則已覆蓋的項目**(空描述、重複、缺資產、成本、語言)—— 否則同一件事被報兩次,清單立刻失去可信度。
  按需觸發而非開啟就跑(要花 API 額度)。**實測**:刻意放兩個連續特寫 + 一鏡塞不進 4 秒的長對白,AI 正確指出「剪輯時會造成跳接感」與「對白過長演員無法在時限內講完」,並各自附建議;沒有誤報程式規則那一層的問題

**實作時修掉兩個自己造成的誤報**(驗證時發現,已補上迴歸測試):

1. `@管家 polishing a silver tray` 被判「描述含中文」—— 角色名本來就常是中文。改成檢查前先剝除 `@` 引用。
2. 14 個中文字的描述被判「過短」—— 中文資訊密度高於英文,不能用同一個字數閾值。改用加權後的 `informationLength()`。

誤報比漏報更傷:使用者被誤報幾次就不會再看這份清單。

**設計決定**:`reviewPlan()` 的單價由呼叫方查表傳入,而非在模組內 `import credits / video`。這讓它不依賴任何 provider 或瀏覽器程式碼,才能在 Node 下單元測試。

### N3 Prompt 管理(中 · 弱依賴 N2)

**2026-08-13 完成,但只開放三個模板(理由見下)。**

- [x] ~~`renderTemplate()`~~ —— `{{key}}` 平面替換,**未知變數原樣保留**而非變空字串(打錯變數名要能從輸出看出來)
- [x] ~~模板覆寫 + 版本歷史~~ —— `use-prompt-template-store.ts`。store 只存「改過的」模板,沒改過的鍵不存在;內容沒變不新增版本;每個模板保留 20 筆
- [x] ~~設定頁~~ —— 首頁「Prompt 模板」對話框:分頁切換、編輯、**即時預覽(變數換成範例值)**、版本歷史、回滾、還原內建
- [x] ~~可用變數清單顯示在 UI~~ —— 並有兩個單元測試確保「宣告的變數都真的在模板裡」「模板用到的變數都有宣告」,否則 UI 會顯示不存在的變數
- [x] ~~驗收:未覆寫時逐字相同~~ —— 三個防回歸測試,基準字串從改動前的實作抄出
- [x] ~~影片與宮格 prompt 也開放編輯~~ —— 2026-08-14 完成,但**不是用條件式模板語法**。
  先前的判斷是「要開放這些得先設計 `{{#if}}` 的迷你語言」,重新想過之後這個判斷是錯的:**使用者想改的是措辭,不是結構**。「靜音時走這句、有台詞走那句」是邏輯,把它搬進模板只會讓改一句話變成學一種語法,而且模板寫壞會直接產生無效 prompt。
  所以改成**固定句片段**(`PROMPT_FRAGMENT_IDS`,10 個):開放「哪一句話怎麼寫」,「什麼時候出現這一句」留在程式裡。片段沒有變數,因此**完全不需要模板語法**。每個片段的 meta 帶 `appearsWhen` 說明出現條件 —— 條件在程式裡,所以必須寫給使用者看。
  片段覆寫存在 store 的 `fragments`(與 `overrides` 分開,兩者 id 空間不同);刻意**不做版本歷史** —— 一句話改壞了一眼看得出來,還原一鍵。
  **實測**:改「影片:禁止畫面出現文字」→ 分鏡編輯器的 Veo 預覽立刻換成自訂句、內建句消失、其他片段不受影響;清掉覆寫後回到內建。13 個單元測試,其中最重要的一個是**內建片段與硬編碼時逐字相同**(期望字串從改動前的程式碼原樣抄來,不是從 `FRAGMENT_META` 讀 —— 從同一個來源讀就測不出東西)
- [ ] `buildSeedancePrompt` 未片段化 —— 它**無人 import**(見檔內註解),片段化一個死函式沒有意義

**兩個與初稿不同的決定**:

1. **沒有用 zod schema**,模板與版本用 TypeScript interface。這是內部資料不是外部輸入,加 zod 只是多一層無用的執行期檢查(與 N7 同樣的判斷)。
2. **builder 接可選的 `template` 參數而非自己讀 store**。`buildImagePrompt(frame, template?)` 保持純函式才能單元測試,由呼叫方(四個生圖入口)負責從 store 取覆寫值。

驗收實測:覆寫模板後生圖 payload 確實使用新模板且內建尾段消失;回滾能還原到指定版本;還原內建後覆寫從 store 移除但版本歷史保留(可能還想撿回舊版)。

### N4 交付中心(大 · 弱依賴 N1)

- [x] ~~時間軸預覽:水平 gantt~~ —— 2026-08-13 完成。**刻意複用 `buildTimeline` 而不自己算一份**,預覽區間必須與導出的 timeline.json 完全一致,否則預覽看起來對、進剪映卻歪掉。bar 寬度正比於時長,三種素材狀態分色(有影片 / 只有圖 / 無素材虛線),可點選跳鏡
- [x] ~~playlist 依序播放~~ —— 有影片交給 `<video onEnded>` 推進,其餘用該鏡時長計時。實測每鏡 4 秒時,播放 5 秒後在第 2 鏡、播完自動停止
- [x] ~~AI 粗剪:建議制~~ —— 2026-08-13 完成。`actions/rough-cut.ts` 用 `gemini-2.5-flash`(免費層有額度),**只建議 `cut` 與 `reorder`,不動時長**(§18 待決策第 4 條的結論)。
  三個防呆:回傳 shot 編號而非 frameId(不讓模型碰 UUID)、server 端過濾掉不存在的鏡號與無意義的 reorder、每次套用都重新從 store 取當前順序(使用者可能已處理過別的建議)。
  UI 沒有「全部接受」按鈕,cut 用 destructive 樣式且寫「刪除這一鏡」而非「接受」—— 刪除不可逆,字面就該讓人知道。
  **實測**:刻意放兩鏡重複的內容,模型只給 1 個保守建議並正確指出重複的那一鏡,理由是繁中;套用後 order 自動連續
- [x] ~~渲染追蹤總覽~~ —— 2026-08-13 完成,**併入時間軸而非另開面板**。任務狀態與「素材有無」是兩件事(失敗的鏡次可能還留著舊圖),所以統計列與 gantt 各自呈現:失敗鏡次紅色、生成中有脈動條、bar 提示帶狀態
- [ ] **「只重試失敗鏡次」未做** —— 目前沒有批次生影片功能(只有單鏡),批次重試要先有批次生成;而生影片沒有免費額度,無法驗證產出
- [x] ~~`snapshotSchema` + 備份還原~~ —— 2026-08-13 完成(N4 劇集備份與 N5 專案備份的共用機制)。三種粒度共用一個 schema 以 `scope` 區分;素材以二進位放在同一個 zip,`mediaManifest` 記錄 `kind`(dataUrl / blob)與 mime —— 否則還原時無從得知圖片該重建成字串、影片該重建成 Blob。
  **為此補了 `readZip`**(原本只有 createZip),只支援 store 模式並對 deflate 明確報錯,不回壞資料讓人以為匯入成功。
  匯入分兩階段:先解析顯示「會還原什麼」,確認後才寫入;**只新增與覆蓋,不刪除備份裡沒有的東西**(否則匯入舊的單專案備份會把其他專案清掉)。
  **完整 round-trip 實測**:建資料 → 匯出 → 清空全部 → 匯入 → 所有欄位與三個素材完整還原,圖片回到 data URL 字串、影片回到帶 mime 的 Blob
- [x] ~~ffmpeg.wasm 成片:動態 import + 能力偵測 + 降級回剪映流程~~ —— 2026-08-14 完成(使用者同意破例裝 `@ffmpeg/ffmpeg` + `@ffmpeg/util`)。
  **先前列的兩個限制有一個是誤判**:「加 COOP/COEP 是全站行為改變」只在**多執行緒 core** 成立 —— 它用 `SharedArrayBuffer` 才需要那組 header。改用**單執行緒 core** 完全不需要,blast radius 為零,生圖與下載代理不受影響。慢一些,但這功能本來就不是必要路徑。
  第二個刻意選擇:**串流複製(`-c copy`)不重新編碼**。重編在單執行緒 wasm 裡慢到不可用,而且輸入與輸出得同時擠在 wasm 記憶體裡,長片會 OOM。代價是各段編碼參數必須一致 —— 不一致時 ffmpeg 報錯,照實丟給使用者並提示改走導出剪映,**不偷偷重編**。
  core 二十幾 MB 所以走**動態 import**,按下按鈕才載;`canCompose()` 只做便宜的能力偵測(不載 core),不支援時整顆按鈕不渲染 —— 按了才說不行是最差的體驗。
  **目前的替代路徑是導出剪映 JSON**,已完成且不需要任何額外依賴
- [x] ~~COOP/COEP headers 的回歸測試~~ —— **不需要了**:單執行緒 core 不用那組 header,這一項自動消失。
  **而「沒有成片素材就無法驗證輸出能不能播」也解掉了** —— 不需要 Veo 額度:用 canvas + `MediaRecorder` 就能在瀏覽器裡錄出真的 mp4/h264 片段。
  **實測**:錄好的片段寫進 IndexedDB → 走真正的 UI 按「合成成片」→ 成片是可解碼的合法 mp4(`ftypisom`)、解析度 320×180 不變、**時長 2.032s ≈ 單段 1.033s 的兩倍**。刻意用同一段餵兩次 —— 兩段長度不同時「有沒有漏掉一段」的判斷會模糊(第一次測試就踩到:背景分頁把 timer 節流,第二段只錄到 1 幀)。
  **未驗證**:編碼參數不一致時的失敗路徑、長片的 wasm 記憶體上限 —— 前者需要兩段不同來源的影片,後者需要真的長片

### N5 專案層級(大)

- [x] ~~`seasonSchema` / `episodeSchema` / `frameSchema.episodeId`(可選,不改 `projectId`)~~ —— 2026-08-13 完成。新增 `use-episode-store.ts`(獨立 store,不塞進 project store —— 否則每改一次集名都要重寫整個專案陣列),`getFramesByEpisode` 與 `clearEpisodeAssignments` 加在 frame store。
  UI 三處,**都只在「有建立季/集」時才出現**:工具列「季 / 集」對話框(唯一入口)、分鏡編輯器的「所屬集」下拉、畫布上方的篩選列。
  **篩選只影響顯示哪些節點,不重新編號** —— 篩到某一集看到的是第 4、5、6 鏡而不是重新從 1 開始,因為 `order` 是專案內的鏡號。
  **刪除季/集不刪分鏡**,只把 `episodeId` 清成未指定(跨 store 的連動由對話框做,store 之間不互相 import)。
  備份一併帶走季/集:`snapshotSchema` 加 `seasons` / `episodes`,兩者都是 `.default([])`,**舊備份照樣讀得回來**
- [x] ~~`worldview` 結構化~~ —— 2026-08-13 完成。`setting` / `visualBible` / `musicMood` + `regions[].locations[]` 兩層結構,地點可綁 `sceneAssetId` 讓「世界觀裡的地點」與「可 @ 引用的場景資產」對上。地圖依 §8.3 列為非目標
- [x] ~~`visualBible` 注入所有生成 prompt~~ —— 位置在**角色一致性之後、逐鏡描述之前**:基調在中間才不會被逐鏡描述蓋掉,也不會壓過角色的參考圖約束。三個生圖入口都接上,實測 payload 為四段且基調確實在畫面描述之前;未填或全空白時輸出與先前完全相同(不留空段)
- [x] ~~小說匯入:兩階段確認~~ —— 2026-08-13 完成。第一階段只拆場次與角色,**不建立任何分鏡資料**;確認後才逐場拆鏡。
  第二階段**直接複用 `generate-storyboard`** 而不另寫拆鏡邏輯。逐場序列呼叫而非並行 —— 免費層有 RPM 限制,並行很容易撞 429。
  順便產出角色清單並可一鍵建成資產,建立後拆鏡就能用 `@` 引用 —— 這條銜接是實測過的:建 2 個資產 → 略過 2 場 → 從 1 場產生的 3 鏡全部帶 `@小雨` 引用。
  長文上限 50,000 字並明確提示;spec 原本設計的「分段處理 + 摘要串接」沒做 —— `gemini-2.5-flash` 的 context 足以吃下一般章節,先用上限換簡單
- [x] ~~專案 / 全域備份(共用 `snapshotSchema`)~~ —— 已在 N4 一併完成(`settings/backup-dialog.tsx` 的「匯出範圍」可選全部或單一專案,兩者走同一份 `snapshotSchema`,`scope` 欄位記 `"all" | "project"`)。資產庫一律整份帶走 —— 它是跨專案共用的,少帶會讓還原後的選角失效
- [x] ~~驗收:現有無季/集專案完全不受影響~~ —— **實測**:沒有季的專案畫布無篩選列、編輯器無「所屬集」欄位、`localStorage` 連 `frameforge-episodes` 這個 key 都不會產生。
  建 1 季 1 集後篩選列出現(全部 3 / 未指定 3 / 第 1 集 0),把第 1 鏡指派過去 → 計數變成 未指定 2 / 第 1 集 1,篩到第 1 集只剩 1 個節點且**鏡號仍是 1**,篩到未指定剩 2 個節點且**鏡號仍是 2、3**(沒有重編)。
  刪掉季 → 集一併消失、第 1 鏡的 `episodeId` 回到 none(非 dangling)、篩選列消失。
  2 個單元測試釘住:舊備份(JSON 裡根本沒有 `seasons`/`episodes` 兩個 key)解析後兩者為 `[]` 且分鏡不會憑空長出 `episodeId`;季/集 round-trip 欄位完整

### N8 其餘補強(小)

- [x] URL 長度上限(`MAX_URI_LENGTH = 2048`)—— 已完成
- [x] `fetch` 逾時 —— 已完成,**改用 `AbortController` + `clearTimeout` 而非 `AbortSignal.timeout`**(見 §11.3 更正)

### 技術債(D1–D9,詳見 §16)

**2026-08-13 一輪處理完 D0–D2、D5–D9;D3/D4 刻意延後(理由見下)。**

- [x] ~~**D0** 三個生圖入口 prompt 本體不一致~~ —— 三處統一走 `buildImagePrompt`,實測三者逐字相同(409 字元)
- [x] ~~**D5** client component 路由守衛 → 直接開專案 URL 必 404~~ —— 新增 `useProjectStoreHydrated()`(`useSyncExternalStore`,非 `useState`+`useEffect`,避免漏事件與 cascading render);兩個頁面在 hydration 完成前顯示 loading。實測:直接開專案 URL 與 prompts 頁皆正常,不存在的專案仍正確 404
- [x] ~~**D2** `MODEL_CREDIT_COST` 兩份收斂~~ —— 收斂到 `credits.ts`(先前那份從未被 import,真正在用的是 `generate-image.ts` 自己那份)
- [x] ~~**D1** style/mood 對照表兩份~~ —— 抽出 `src/lib/style-tables.ts` 當唯一來源,`verbose`(單鏡/影片)與 `compact`(宮格)兩種長度。**措辭原樣搬移**,實測 verbose 路徑與重構前逐字相同、compact 路徑未洩漏 verbose 措辭
- [x] ~~**D6** 純函式模組零測試~~ —— **未引入 vitest**,改用 Node 內建 `node:test` + `--experimental-strip-types`(Node 22.12),**零新增依賴**。16 個測試涵蓋 `zip.ts`(含 CRC32 與 `node:zlib` 權威比對、central directory round-trip、中文檔名、空 zip)與 `timeline-export.ts`(時間軸累加、`videoDurationSec` 優先、SRT 時間碼跨一小時)。`pnpm test` 可跑,tests 也納入 `tsc` 檢查
- [x] ~~**D8** 統一編輯模式為 debounce 自動存~~ —— `frame-editor` 改自動存。reset 依賴只放 `selectedFrameId`、自動存依賴用序列化字串,兩處都是為了斷開「存→新 frame 物件→reset→再存」的循環。實測:打字產生 1 次寫入、靜置 3 秒 0 次額外寫入
- [x] ~~**D9** video 欄位與 job store 職責界線~~ —— 已在 `frameSchema` 加註解。**同時更正本文件先前的誤述**(見 §16 D9)
- [x] ~~**D7** 死檔案~~ —— 已評估:`actions/frame.ts` 確認無人 import,保留當設計備忘;`proxy.ts` 加註解標明它是 no-op 但 matcher 仍有執行成本
- [x] ~~**D3** `imageBase64Key` 改名為 `hasImage` + `imageVersion`~~ —— 2026-08-14 完成,與 D4 同批。
  **遷移邏輯抽成 `lib/frame-migrate.ts` 由 store persist migrate 與備份還原共用** —— 這是關鍵:舊備份的 JSON 裡還是舊欄位,只改 store 不改還原路徑,匯入舊備份會變成「素材在 IndexedDB 但畫面說沒有圖」,那是靜默的資料遺失。`imageBase64Key` 因此**保留在 schema 裡標為棄用**(拿掉的話 zod 會把它剝掉)。
  **寫測試時抓到自己的 bug**:原本用「有沒有 `hasImage`」判斷是否已遷移,但舊備份經過 `frameSchema.parse()` 後 zod 的 `.default(false)` 已經把它填上了 —— 那個判斷會讓圖靜默消失。改成「舊欄位有值就以它為準」,並留了一個測試專門守這條。
  **實測**:注入 v0 資料(三格:有圖無版本 / 有圖帶版本後綴 / 沒有圖)→ persist 版本 0→1、兩張圖都在畫布上顯示、版本號 `1700000000000` 沿用、舊欄位清空
- [x] ~~**D4** 圖片狀態納入 store,取代 `revalidateKey` 補丁~~ —— 2026-08-14 完成。
  `useImageStorage(frameId)` 現在**自己從 store 讀 `frame.imageVersion`**,不再由呼叫方傳 `revalidateKey`。先前那個設計把「快取失效」的責任分散給每個呼叫端 —— 漏傳就停在舊畫面,而且漏了不會報錯。現在 `save()` / `remove()` 內部 bump 版本號,繞過 hook 直接寫 IndexedDB 的地方(九宮格切圖)也只要 bump 一次。
  **實測**:在分鏡編輯器上傳圖片 → `imageVersion` 0→1、`hasImage` true,**畫布節點(另一個元件)沒有 reload 就跟著顯示新圖**;刪除圖片 → 版本 1→2、節點的 img 消失。全程沒有任何地方傳 `revalidateKey`

### N9 動作遷移(v2v · 非對標項 · 詳見 §19)

**先做前兩項,它們不用寫程式碼。若第 2 項品質不合格,後面全部不必做。**

- [ ] 試註冊火山方舟或 reseller,確認台灣帳號進不進得去(§19.6③)
- [ ] 用網頁介面手動跑一次:驅動影片 + 角色圖 → 判定成品品質是否可用
- [ ] 決定驅動影片的 URL 問題怎麼解(只收公開 URL / 加後端 / provider asset API,§19.6②)
- [x] ~~修既有的標籤不符~~ —— 2026-08-14 完成。下拉改「即夢 2.0」,站台 description 不再宣稱產出 Seedance 提示詞,provider 與 signer 檔頭寫清楚兩者差別。**`model` id 刻意維持 `"seedance-2.0"`** —— 它被持久化在 `frame.videoModel` 與 model-config store,改了既有資料查不到選項,而 `getProviderForModel` 對未知 model 會靜默退回 veo(送錯 provider)
- [ ] 新 provider `ark-seedance`(不是改現有那個)
- [ ] `VideoMode` 加 `"v2v"` + `VideoModelOption.supportsDrivingVideo`
- [ ] `frameSchema.drivingVideoUrl`(可選,舊資料不受影響)
- [ ] `VideoPanel` 依 `supportsDrivingVideo` 顯示第三條鏈路
- [ ] 驗收:選 v2v 但沒填驅動影片 → 明確報錯,不靜默退回 t2v
- [ ] 驗收:i2v 的 payload 與現行完全一致(防回歸)

### 跨項與文件

- [x] ~~`generate-storyboard` 產出直接帶 `@` 標記~~ —— 2026-08-13 完成。新增 `mentionableAssets` 輸入,prompt 要求模型在場景描述內用 `@名稱` 引用,並**明確禁止發明不在清單裡的 @name**。只餵人物與場景(道具與服裝在分鏡描述裡引用的價值低,名單太長反而讓模型亂標)。
  **實測**(文字模型有免費額度,可真的跑):8 個分鏡全部帶 `@` 標記,`@小雨` 出現 7 鏡、`@老家廚房` 4 鏡,而刻意沒餵進名單的 `@銀托盤` 出現 **0 次** —— 禁止發明的約束有效
- [x] ~~決定 `usedAssetIds` 是否寫回 `castIds`~~ —— 2026-08-13 決定:**不寫回**(與本文件先前「編輯 prompt 時同步」的建議相反,理由如下)。
  同步寫回會與使用者的手動取消打架 —— 取消某個角色後,只要 prompt 還留著 `@` 就又被加回來,使用者無法表達「我知道有 @ 但這格不要帶它」。而 `castIds` 的語意是「手動選角」,`@` 是另一個來源,`composeCastPrompt` 已經取聯集,寫回等於把同一件事存兩份。
  使用者真正的困惑是「@ 到的角色算不算選上」,那是**顯示問題不是資料問題** —— 所以改成在 `CastPicker` 把被 `@` 引用的資產標上 `@` 圖示並高亮,tooltip 寫「場景描述已用 @ 引用，會自動帶入」。
  **實測**:第 1 鏡(prompt 同時 @ 兩個資產)兩顆 chip 都標記;第 2 鏡(只 @ 管家)只有管家標記、老宅書房不標記;三格的 `castIds` 全程保持 `[]` —— 確實沒有寫回任何資料
- [x] ~~更新 [`director-console-spec.md`](./director-console-spec.md) 的「實作進度」章節~~ —— 2026-08-13 更新。M0–M3 的現況改寫(含 t2v/i2v、資產庫泛化、導出剪映、不走 fal.ai),並明講**逐項進度只由本文件 §17 維護**,避免兩份清單各說各話。
  **2026-08-14 再更新**:發現一個比進度過時更嚴重的問題 —— 該文件 **§0 TL;DR 仍寫著「Veo / Seedance / Flow 全部只是產生 prompt 文字,沒有真的生影片」**,那是立案當時的現況,但 M0 早已完成。新讀者先看 TL;DR 會得到完全相反的印象,已加註那一節是 2026-08-12 的基準狀態並指向「實作進度」。同時補上季/集、字幕雙編碼、資訊架構整理,M5 那一列補上 §19 的結論(不必自建白模管線),CLAUDE.md 的文件導覽也一併更正(它自己對這份文件的描述也過時了)

---

## 18. 待決策

1. **N1 的第一個 provider 選哪家?** 建議 Veo(已有 key、已有 `buildVeoPrompt`、v0.1 也是從 Veo 起手)。
2. **`/characters` 路由要改名成 `/assets` 嗎?** 改名較貼合泛化後的語意,但要處理舊連結。
3. **N3 的模板編輯放全域設定還是專案內?** 全域較符合「模板」語意,但專案間可能想用不同基調 —— 或者交給 N5 的 `worldview.visualBible` 承擔專案差異。
4. **AI 粗剪要不要動 `duration`?** 改時長會連動整條時間軸與 SRT,建議首版只建議 `reorder` 與 `cut`,不動時長。
5. **成片合成要不要乾脆走後端?** ffmpeg.wasm 的限制不少;若日後有後端(v0.1 的 M6),後端合併更穩。
6. **`composeCastPrompt` 的 `usedAssetIds` 要不要寫回 `castIds`?** 見 §12,建議在編輯 prompt 時同步而非生成時。
7. **宮格要支援到哪幾種?** 對標對象是 4/6/9;本專案現有 9/25。建議收斂成 4/6/9 並補橫直版,25 格每格解析度太低(1024÷5 ≈ 205px)實用性存疑。
8. **雙視頻鏈路的 t2v 要不要給明確入口?** 契約已支援,但多一個入口就多一組 prompt 模板要維護。
9. **N7 的預審要不要擋生成?** 建議純建議不阻擋 —— 但若之後接了真金流,`blocker` 或許該要求二次確認。
10. **`worldview` 的地圖要做到什麼程度?** 本規格書限定為「存一張參考圖」,互動式地圖編輯器列為非目標。
11. **v2v 要不要做?** 見 §19。決定順序是「先驗品質、再談實作」,不是先寫程式碼。
12. **驅動影片的 URL 問題怎麼解?** 只收使用者貼的公開 URL(保住無後端)vs 加上傳端點(違反 CLAUDE.md 的架構選擇)。建議首版走前者(§19.6②)。
13. **v2v 在流程裡的位置是什麼?** 它是獨立產製模式,不是分鏡工具的功能。硬塞進「分鏡導演台」的敘事會讓定位模糊(§19.10)。
14. **`VIDEO_MODELS` 的「Seedance 2.0」標籤何時修?** 實際打的是即夢 VGFM,現在就在誤導使用者(§19.6①)。

---

## 19. N9 — 動作遷移(v2v):驅動影片 + 角色 → 影片

> **這一節不是 BigBanana 對標項。** 它來自 2026-08-14 的獨立調查,對標對象沒有這個功能。
> 之所以寫進這份文件,是因為它與 N1(鏡頭工作台)、N2(資產庫)共用同一組抽象,
> 而且它可能是**比 t2v 更便宜、動作更可控**的主要產出路徑 —— 影響里程碑優先順序。

### 19.1 是什麼

第三條影片鏈路。既有兩條是「無中生有」,這一條是「借用一段已經成立的表演」:

```
現行 t2v:  文字 → 影片                    動作由模型自由發揮,不可控
現行 i2v:  關鍵幀 + 文字 → 影片            構圖可控,動作仍是模型決定
新增 v2v:  驅動影片 + 角色參考圖 → 影片    動作照抄驅動影片,角色換成你的
```

**為什麼值得做**,兩個現行管線解不掉的問題:

1. **動作品質不用賭。** Veo 一支 10 鏡 × 5 秒約 $20,動作不滿意就是再燒一次。v2v 的動作來自一段真實(或已驗證會紅)的影片。
2. **一致性從「祈禱」變成「注入」。** 現在是希望模型在 10 個鏡次裡記得住臉;v2v 每一鏡都直接餵同一張角色參考圖。

### 19.2 技術背景:白模是什麼

社群常見的說法是「把影片解析成無臉白色人偶」。那個白模的正式名稱是 **SMPL**(Skinned Multi-Person Linear model)—— 參數化 3D 人體模型,沒有臉、沒有衣服、沒有身分,只有體型與姿態。

它比 2D 骨架(OpenPose / DWPose)好在四點:

| | 2D 骨架 | SMPL 白模 |
|---|---|---|
| 帶的資訊 | 關節點座標 | 3D 網格:體型 + 姿態 + 深度 |
| 遮擋 | 要猜 | 有深度圖,知道前後關係 |
| 體型 | 沒有 | 有,且**可換成目標角色的體型**(shape alignment) |
| 換視角 | 不行 | 可以 |

最後兩項是關鍵:驅動影片的人可能一米八、目標角色可能矮胖,2D 骨架直接套會變形,SMPL 可以把角色的體型參數套進動作序列。

學術上的標準管線是 **4D-Humans / WHAM 抽 SMPL → 渲染成白模(含 depth / normal / 身體部位語意圖)→ 擴散模型重繪**,代表作是 Champ(ECCV 2024,開源);現在生產環境主流是 **Wan 2.2 Animate**(ComfyUI 有官方 workflow)。

**但下面 §19.3 的結論是:我們不需要自己蓋這條管線。**

### 19.3 關鍵發現:Seedance 2.0 原生支援,不必自建

各家 provider 的能力落差很大:

| Provider | 參考圖 | **參考影片** | 參考音訊 |
|---|---|---|---|
| **Seedance 2.0** | 9 張 | **3 支,合計 ≤15 秒** | 3 軌 |
| Veo 3.1 | 支援 | **完全不吃** | 不吃 |
| Kling | 支援 | Motion Brush(不同機制) | — |

**Veo 沒有這個入口** —— 你無法叫它「照這段的動作走」。而 **Seedance 2.0 明確支援參考影片**,官方說明強調它擅長複製參考素材的運鏡、編舞與特效。

也就是說:**白模、4D-Humans、ComfyUI、GPU 全部不需要** —— Seedance 內部自己處理。這一條鏈路對本專案而言就是「多一個 provider + 多一個欄位」。

### 19.4 Seedance 2.0 reference-to-video 的請求形狀

以下取自 reseller(Atlas Cloud)公開文件。**火山官方文件是 JS 渲染,抓不到內文,參數名需以官方為準**(見 §19.9 未查證項目)。

| 參數 | 上限 / 值域 | 格式 |
|---|---|---|
| `reference_images` | 9 張 | URL / **Base64** / `asset://` · 300–6000px · 長寬比 0.4–2.5 · <30MB |
| `reference_videos` | 3 支,合計 ≤15 秒 | **只吃 URL 或 asset,不吃 Base64** · MP4/MOV · 單支 2–15s · 24–60fps · <50MB |
| `reference_audios` | 3 軌,合計 ≤15 秒 | WAV/MP3 · 需搭配至少一個影片或圖片 · <15MB |
| `prompt` | — | 以 **"image 1" / "video 1"** 按**輸入順序**指名 |
| `duration` | 4–15 秒 | -1 = 自動 |
| `resolution` | 480p ~ 4K | 預設 720p |
| `ratio` | 16:9 / 4:3 / 1:1 / 3:4 / 9:16 / 21:9 / adaptive | 預設 adaptive |

**價格 $0.112/秒**,約為 Veo 3.1 的 1/3.5:

| | 單價 | 10 鏡 × 5 秒 |
|---|---|---|
| Veo 3.1 | ~$0.40/s | $20.00 |
| Seedance 2.0 | $0.112/s | **$5.60** |

### 19.5 架構上已經對齊的三件事

不是巧合,是同一個設計思路,所以接起來的成本比看起來低:

1. **`@` 引用機制直接對應。** `mention.ts` 現在把 `@管家` 轉成 `管家 (reference image 1)`,靠 `refIndexByAssetId` 編號;Seedance 要的正是「image 1 / video 1 按輸入順序指名」。**這是換一個 formatter,不是改架構。**
2. **`image_urls` 已經是陣列。** `seedance-provider.ts:179` 目前只塞一張,但欄位形狀本來就是多張。
3. **`VideoMode` 與 `VideoProvider` 已抽象。** 加 `"v2v"` 與一家 provider,呼叫端不必大改 —— 這正是 §4.8 雙鏈路那次抽象換來的餘裕。

### 19.6 三個真正的阻礙

**① 本專案的 seedance provider 打的不是 Seedance(標籤與實作不符)**

`seedance-provider.ts:30-32` 的 req_key 是 `jimeng_vgfm_t2v_l20` / `jimeng_vgfm_i2v_l21` / `jimeng_vgfm_av_l10` —— 這些是**即夢 VGFM** 模型,端點 `visual.volcengineapi.com`,Action `CVSync2AsyncSubmitTask`。

而 Seedance 2.0 在**火山方舟(Ark)**上,是另一個 API 通道、另一組 model id。

但 `VIDEO_MODELS` 裡標的是「Seedance 2.0(字節/火山 · ~$0.14/s)」。**這個不符是既有問題,不是本次改動造成的。** 要用 Seedance 2.0 的參考影片能力,得接一個**新的 provider**(暫稱 `ark-seedance`),不是改現有那個的參數。

順帶:UI 上的標籤也該修 —— 現在使用者選「Seedance 2.0」拿到的是即夢。

**② `reference_videos` 只吃 URL —— 與「純前端無後端」正面衝突**

`reference_images` 吃 Base64,所以角色參考圖可以從 IndexedDB 直接送。但**驅動影片不行**,必須是可公開存取的 URL。

`seedance-provider.ts:163` 那行 `isHttp(req.imageDataUrl)` 已經顯示這個限制的既有處理方式:**不是 http(s) 就直接丟掉**。

於是「使用者拖一支本地影片進來當驅動素材」在現行架構下做不到。可選路線:

| 方案 | 代價 |
|---|---|
| 只接受使用者自己貼公開 URL | 體驗差,但**不破壞無後端架構** |
| 加一個上傳端點 / 物件儲存 | 有後端了,違反 CLAUDE.md 的刻意選擇 |
| 用 provider 自己的 asset 上傳 API(若有) | 要查證是否存在;仍需把 blob 送出瀏覽器 |

**建議首版走第一條**,把架構問題留給使用者的既有素材庫(他大概本來就把素材放在某處)。

**③ 帳號取得**

| | 火山方舟直連 | Reseller |
|---|---|---|
| 註冊門檻 | 火山引擎帳號,**可能需要中國大陸實名 / 企業資質**(需自行確認) | 一般信用卡 |
| 端點 | `ark.cn-beijing.volces.com` | 各家自訂 |
| 價格 | 官方價 | 有加成 |

台灣使用者實務上**大概只有 reseller 這條路**,除非能過火山實名。這件事**在寫任何程式碼之前就該先確認**。

### 19.7 設計提案(等 §19.6 的阻礙釐清後才動工)

```ts
// types.ts
export type VideoMode = "t2v" | "i2v" | "v2v";   // 加第三條

export interface VideoGenRequest {
  // ... 現有欄位
  /** v2v:驅動影片的公開 URL(不吃 data URL,見 §19.6②) */
  drivingVideoUrl?: string;
  /** v2v / i2v:多張角色參考圖(現行只送一張) */
  referenceImageUrls?: string[];
}

export interface VideoModelOption {
  // ... 現有欄位
  /** 是否支援驅動影片(只有 Seedance 2.0 是 true) */
  supportsDrivingVideo: boolean;
}

// frameSchema 擴充(可選欄位,舊資料不受影響)
drivingVideoUrl: z.string().optional(),
```

UI:`VideoPanel` 的鏈路下拉加第三個選項,**依 `supportsDrivingVideo` 決定要不要顯示** —— 與現行 `supportsImage` 擋 i2v 的邏輯一致。選了 v2v 但沒填驅動影片 URL 時**明確報錯,不靜默退回 t2v**(與 §4.8 已完成的那條規則相同)。

`prompt` 組句:`composeCastPrompt` 的 `refIndexByAssetId` 直接複用,只是輸出格式從 `reference image N` 換成 provider 要的寫法。

### 19.8 不建議的替代路線(記錄以免日後重問)

| 路線 | 為什麼不建議 |
|---|---|
| 自架 ComfyUI + Wan 2.2 Animate | 要 GPU 主機。**推翻「純前端無後端」的架構選擇**,而 §2.3 的發現正是「不需要為了對標引入後端」 |
| 本地抽白模 + 只送姿態序列去 API | **現成 API 不吃這個輸入**。Viggle / Seedance 收的是「影片 + 角色圖」,不收「姿態序列 + 角色圖」。這個切法只有自架時成立 |
| 走 3D:白模 → retarget 到 rigged 角色 → Three.js 渲染 | 唯一完全免 GPU 且零邊際成本的路,但**資產形式要從「一張圖 + 外觀描述」變成「綁好骨架的 3D 模型」**。與現有資產庫不相容,是另一個專案 |

**白模那一步本身確實不需要 GPU**(判別式模型,MediaPipe 在瀏覽器就能即時抽 3D 骨架),但「把角色畫上去」是 14B 級的擴散模型,**沒有 CPU 或瀏覽器版本**。想省 GPU 的直覺對,但白模不是成本所在。

### 19.9 未查證項目(不要當成已知)

- 火山方舟官方文件的**實際參數名**(本節取自 reseller 文件;官方文件是 JS 渲染,WebFetch 抓不到內文)
- 火山方舟對台灣帳號的**實名要求**
- reference-to-video 模式的**官方計價**(reseller 報 $0.112/s)
- provider 是否提供 **asset 上傳 API** 可解 §19.6② 的 URL 問題
- Kling 的 Motion Brush 與 v2v 的關係(本節只確認它是不同機制)

### 19.10 風險

| 風險 | 說明 |
|---|---|
| **驅動素材的版權** | 拿別人的短影音當驅動,動作與表演的權利歸屬各地法規仍模糊,**音軌明確有風險**。最乾淨的用法是驅動素材為自有拍攝 —— 這也是建議的方向 |
| **定位模糊** | v2v 是獨立的產製模式,不是分鏡工具的功能。硬塞進「分鏡導演台」的敘事會讓 app 定位不清。要先定義它在流程裡的位置(例:分鏡定稿後,某幾鏡走遷移、某幾鏡走生成) |
| 15 秒上限 | 驅動影片合計 ≤15 秒、產出 ≤15 秒。長鏡頭要拆,而拆點會影響動作連續性 |
| 標籤不符已在誤導使用者 | §19.6① —— 這個與 v2v 無關,現在就該修 |

### 19.11 驗收

**不寫程式碼就能做完的前兩步**(順序不要顛倒):

1. **試註冊**,確認進不進得去(火山官方或 reseller)。這是所有後續工作的前提
2. **用網頁介面手動跑一次**:一支驅動影片 + 一張角色圖 → 看成品品質。若品質達不到可用水準,§19.7 的設計全部不必實作

**接上之後才驗的**:

3. 選 v2v 但沒填驅動影片 → 明確報錯,**不靜默退回 t2v**
4. 只有起始幀時的 payload 與現行 i2v **完全一致**(防回歸)
5. `@角色名` 在 v2v 的 prompt 裡被正確轉成 provider 要的參考圖編號
6. 舊專案(沒有 `drivingVideoUrl`)行為完全不變

---

## 20. 已查證但不採用

> 這一節放「調查過、有結論、但決定不做」的東西 —— 免得日後有人再走一次同一條路。

### 20.1 生圖走 Flex 服務層

2026-08-14 調查。**結論是不做**,記錄下來避免日後重複這條路。

起點是官方定價頁把 `gemini-2.5-flash-image` 的 Flex 價列成 **$0.0195/張**,正好是標準層 $0.039 的一半,看起來是「批次生圖免費砍半」。實際查 Flex 的文件後有三個問題:

| 問題 | 說明 |
|---|---|
| **欄位名** | 是 `service_tier`(snake_case)放在 **request body 頂層**,不是 `serviceTier`、也不在 `generationConfig` 裡 |
| **端點不同** | 官方範例用的是 **Interactions API**(`/v1beta/interactions`),不是本專案在用的 `generateContent` |
| **模型清單沒有生圖模型** | Flex 支援的模型全是文字模型(2.5 Flash、3.x Flash/Pro 等),**`gemini-2.5-flash-image` 不在清單裡** |

第三點與定價頁互相矛盾,而**沒有 billing 無法判定哪一份是對的**。在一條會花錢、又測不到的路徑上塞一個可能被靜默忽略、也可能直接 400 的欄位,比不做更糟 —— 程式碼寫過一版後已還原。

**有額度之後要驗的順序**:先用文字模型確認 `service_tier` 在 `generateContent` 上是否生效(文字模型明確在支援清單裡),再試生圖模型。兩者都通才值得接。

**順帶**:Batch API 也不適合。它是非同步、目標 24 小時,而本專案的「批次生圖」是一個跑幾分鐘的 for 迴圈;而且生圖沒有 `use-job-store` 那套任務追蹤機制,要用 Batch 得先為生圖蓋一次。為每張省 $0.02 蓋一套非同步任務系統不划算。
