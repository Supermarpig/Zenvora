# Zenvora / FrameForge — AI 分鏡導演台

Next.js 16 + React 19 + Zustand + shadcn/ui。**純前端,無後端資料庫** —— 狀態存 localStorage(zustand persist),圖片與影片存 IndexedDB。這是刻意的架構選擇,不是權宜之計。

## 文件導覽

| 文件 | 內容 |
|---|---|
| `docs/director-console-spec.md` | v0.1 產品與技術規格。里程碑 M0/M1 已完成,M2–M6 待辦。**其「實作進度」章節停在 2026-08-12,已過時** |
| `docs/bigbanana-parity-spec.md` | v0.4 規格。N1–N8 功能對標缺口、§16 內部技術債 D1–D9、§17 執行進度 checkbox。**接手工作先看 §17** |
| `docs/director-prompt-guide.md` | 導演術語與 prompt 寫法手冊 |
| `docs/director-3am-call.json` | 範例分鏡 spec(10 鏡),可用「匯入 JSON」載入 |

## API 配額現實(接手前必讀)

`.env.local` 的 `GOOGLE_AI_API_KEY` 已設定且有效,但:

| 功能 | 模型 | 免費層 |
|---|---|---|
| AI 生成分鏡 / 續鏡 / 拆台詞 | `gemini-2.5-flash` | **可用**(實測 6 秒生 8 鏡) |
| 生圖 | `gemini-2.5-flash-image` | **`limit: 0`** —— 回 429,必須綁 billing |
| 生影片 | Veo / Seedance / Kling | 無免費層 |

**因此涉及生圖/生影片的驗收要拆兩層**:先驗 payload 正確性(攔截 `window.fetch` 檢查 server action 的 request body),有額度時才驗實際產出。不要因為 429 就以為程式壞了。

`gemini-3-pro-image-preview` 已於 2026-06-25 停用,勿再使用;現行可用的生圖模型是 `gemini-2.5-flash-image`、`gemini-3.1-flash-image`、`gemini-3-pro-image`。

## 開發與驗收

```bash
pnpm install               # node_modules 可能不存在
npx tsc --noEmit           # 必須全綠(含 tests/)
npx eslint src/ tests/     # 不可新增 error/warning
pnpm test                  # 62 個單元測試,必須全過
```

測試用 Node 內建 `node:test` + `--experimental-strip-types`(需 Node 22+),**沒有裝 vitest 或任何測試框架**。目前涵蓋 `zip.ts`、`timeline-export.ts`、`plan-review.ts`、`mention.ts`、`storyboard-prompt.ts`(宮格排版)、`prompt-template.ts`。`grid-split.ts` 需要 canvas 所以測不到。

要讓一個模組可測,它不能在頂層 import 碰瀏覽器 API 的東西 —— `cast.ts` 原本頂層 import idb-keyval,所以純函式被拆到 `mention.ts`;`plan-review.ts` 的單價改由呼叫方傳入,而非自己 import `credits` / `video`。**被 tests/ 直接或間接 import 的模組,其 value import 需帶 `.ts` 副檔名**(Node ESM 要求),`plan-review.ts` 第 4 行就是這個原因 —— `tsconfig.json` 為此開了 `allowImportingTsExtensions`。

dev server 用 `preview_start` 的 `frameforge-dev`(`.claude/launch.json`,port 3000),**不要用 Bash 跑**。UI 改動必須用 preview 截圖驗證,不要只靠 tsc 通過就宣稱完成。

### 既有的 ESLint warning(不是你造成的,也不要順手修)

- `create-project-dialog.tsx` — `CreateProjectInput` unused
- `prompt-row.tsx` / `storyboard-grid.tsx` / `image-generator.tsx` — `<img>` 而非 `next/image`
- `frame-editor.tsx:76` — `form.watch()` 無法被 React Compiler memo
- `image-generator.tsx:4` — `ImageIcon` unused

## 測試資料的注入與清理

沒有 seed 指令,驗證功能時自行注入:

- localStorage key:`frameforge-projects`、`frameforge-frames`、`frameforge-character-assets`(**version 1**,v0 資料會被 migrate 補上 `kind`)、`frameforge-model-config`、`frameforge-prompt-templates`
- IndexedDB:`keyval-store` / `keyval`,key 為 `image-{frameId}`、`video-{frameId}`、`asset-{assetId}-{n}`

**兩個踩過的坑**:

1. `/project/[id]` 與其 `/prompts` 是 client component,而 zustand persist 的 rehydration 是異步的。兩者都用 `useProjectStoreHydrated()` 等 hydration 完成後才判斷 404 —— **不要把判斷改回首次 render 就做**,那會讓直接開專案 URL 全部 404(技術債 D5 修的就是這個)。現在硬導航是正常的。
2. 頁面活著時 zustand 會把記憶體狀態寫回 localStorage,**直接 `setItem` 可能被覆蓋**。改完要 reload,或改用 UI 操作。

**驗證完務必清乾淨**(localStorage + IndexedDB),不要把測試分鏡留在使用者的專案裡。

## 專案慣例

- 註解用**繁體中文**,寫「為什麼」而不是「做什麼」。
- **不裝第三方套件**:zip 打包是手寫的 store-mode(`src/lib/zip.ts`)、九宮格切圖用原生 Canvas(`src/lib/grid-split.ts`)。需要新套件時先問。
- **最小化修改**,不順手重構無關的 function。發現範圍外值得改的地方,用講的提出來讓使用者決定。
- 資料驗證一律走 zod schema(`src/lib/schemas.ts`),匯入類功能**整批驗證、失敗全拒**,不要部分匯入留下半殘狀態。
- API 金鑰只在 server action / route handler 使用,**前端與 localStorage 一律不碰 key**。

## 幾個容易誤解的設計

- `imageBase64Key` 全專案只當「有沒有圖」的 truthy 標記,實際載入一律走 `loadImage(frame.id)`。九宮格切圖會在它後面加 `#{timestamp}` 當版本號觸發 revalidate。(這個命名問題是已知技術債 D3,待與資產遷移同批修。)
- `useImageStorage(frameId, revalidateKey)` 的第二參數:外部直接寫 IndexedDB 時要傳會變動的值,否則畫面停在舊狀態。(技術債 D4。)
- **資產有 `kind` 與 `type` 兩個維度**:`kind` 是種類(character / scene / prop / costume),`type` 是角色子類(actor / presenter / reface)且只在 `kind === "character"` 時有意義。一致性指示句與參考圖 prompt 都依 `kind` 分歧 —— 對場景說「identical hairstyle」是雜訊,對房間生 turnaround 沒有意義。
- **`src/lib/style-tables.ts` 是 style/mood 鏡頭語言的唯一來源**,`verbose` 給單鏡與影片、`compact` 給宮格。措辭改動會讓既有專案重生的圖跟舊圖不一致,別隨手改。
- `frame-editor` 與 `prompt-row` 都是 **debounce 自動存**。`frame-editor` 的兩個 effect 依賴刻意避開 `frame` 物件(用 `selectedFrameId` 與序列化字串),否則會形成「存→新物件→reset→再存」的循環。
- `frameSchema` 的 `video*` 欄位是**結果**,`use-job-store` 是**任務**,兩者都 persist。`videoStatus` 與 `VideoJob.status` 有值域重疊,更新時要同步兩邊。
- `@角色名` 引用的解析在 `src/lib/mention.ts`(純函式,可測),`cast.ts` re-export 並負責讀參考圖。只認得既有資產名稱,不用 regex 猜邊界;未知的 `@xxx` 原樣保留。角色來源是「`@` 引用 ∪ `castIds` 手動選角」,`@` 決定參考圖編號順序。
- **Prompt 模板可被使用者覆寫**(`src/lib/prompt-template.ts`)。內建模板留在 code 裡當 fallback,store 只存改過的。`buildImagePrompt(frame, template?)` 與 `buildCharacterSheetPrompt(input, templates?)` 接可選模板參數以保持純函式,呼叫方負責從 store 取。**改內建模板的字串會讓既有專案重生的圖跟舊圖不一致**,有防回歸測試盯著。
- **時間軸預覽與導出剪映共用 `buildTimeline`**,不要為預覽另寫一份計算 —— 兩邊算出不同區間的話,預覽看起來對但進剪映會歪。
- 宮格排版由 `gridSpec(size, orientation)` 決定。注意「每格比例」不等於「整張比例」—— 16:9 分成 3×2,每格是 6:5。
- 九宮格有兩種語意:`buildFrameGridPrompt` 是**單一分鏡的九種鏡位**(挑鏡用);多 frames 的 `buildGridPrompt` 是**九個不同分鏡各一格**(省成本用,對應「連續九宮格」工具)。
