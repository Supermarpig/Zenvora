# Zenvora / FrameForge — AI 分鏡導演台

Next.js 16 + React 19 + Zustand + shadcn/ui。**純前端,無後端資料庫** —— 狀態存 localStorage(zustand persist),圖片與影片存 IndexedDB。這是刻意的架構選擇,不是權宜之計。

## 文件導覽

| 文件 | 內容 |
|---|---|
| `docs/director-console-spec.md` | v0.1 產品與技術規格。里程碑 M0/M1 已完成,M2–M6 待辦。**其「實作進度」章節停在 2026-08-12,已過時** |
| `docs/bigbanana-parity-spec.md` | v0.3 功能對標規格,含 N1–N8 缺口與 §16 執行進度 checkbox。**接手工作先看這份的 §16** |
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
pnpm install          # node_modules 可能不存在
npx tsc --noEmit      # 必須全綠
npx eslint src/       # 不可新增 error/warning
```

dev server 用 `preview_start` 的 `frameforge-dev`(`.claude/launch.json`,port 3000),**不要用 Bash 跑**。UI 改動必須用 preview 截圖驗證,不要只靠 tsc 通過就宣稱完成。

### 既有的 ESLint warning(不是你造成的,也不要順手修)

- `create-project-dialog.tsx` — `CreateProjectInput` unused
- `prompt-row.tsx` / `storyboard-grid.tsx` / `image-generator.tsx` — `<img>` 而非 `next/image`
- `frame-editor.tsx:76` — `form.watch()` 無法被 React Compiler memo
- `image-generator.tsx:4` — `ImageIcon` unused

## 測試資料的注入與清理

沒有 seed 指令,驗證功能時自行注入:

- localStorage key:`frameforge-projects`、`frameforge-frames`、`frameforge-character-assets`,格式為 `{ state: {...}, version: 0 }`
- IndexedDB:`keyval-store` / `keyval`,key 為 `image-{frameId}`、`video-{frameId}`、`asset-{assetId}-{n}`

**兩個踩過的坑**:

1. `/project/[id]/page.tsx` 是 client component,`getProject(id)` 找不到就 `notFound()`。zustand persist 的 rehydration 是異步的,**硬導航會 404** —— 要從首頁用 client 端導航(點連結)進去。
2. 頁面活著時 zustand 會把記憶體狀態寫回 localStorage,**直接 `setItem` 可能被覆蓋**。改完要 reload,或改用 UI 操作。

**驗證完務必清乾淨**(localStorage + IndexedDB),不要把測試分鏡留在使用者的專案裡。

## 專案慣例

- 註解用**繁體中文**,寫「為什麼」而不是「做什麼」。
- **不裝第三方套件**:zip 打包是手寫的 store-mode(`src/lib/zip.ts`)、九宮格切圖用原生 Canvas(`src/lib/grid-split.ts`)。需要新套件時先問。
- **最小化修改**,不順手重構無關的 function。發現範圍外值得改的地方,用講的提出來讓使用者決定。
- 資料驗證一律走 zod schema(`src/lib/schemas.ts`),匯入類功能**整批驗證、失敗全拒**,不要部分匯入留下半殘狀態。
- API 金鑰只在 server action / route handler 使用,**前端與 localStorage 一律不碰 key**。

## 幾個容易誤解的設計

- `imageBase64Key` 全專案只當「有沒有圖」的 truthy 標記,實際載入一律走 `loadImage(frame.id)`。九宮格切圖會在它後面加 `#{timestamp}` 當版本號觸發 revalidate。
- `useImageStorage(frameId, revalidateKey)` 的第二參數:外部直接寫 IndexedDB 時要傳會變動的值,否則畫面停在舊狀態。
- `@角色名` 引用(`src/lib/cast.ts`)只認得既有資產名稱,不用 regex 猜邊界;未知的 `@xxx` 原樣保留。角色來源是「`@` 引用 ∪ `castIds` 手動選角」,`@` 決定參考圖編號順序。
- 九宮格有兩種語意:`buildFrameGridPrompt` 是**單一分鏡的九種鏡位**(挑鏡用);多 frames 的 `buildGridPrompt` 是**九個不同分鏡各一格**(省成本用,對應「連續九宮格」工具)。
