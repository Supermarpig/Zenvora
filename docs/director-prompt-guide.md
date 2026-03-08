# 🎬 AI 影像導演 Prompt 手冊

> 用專業電影語言撰寫 AI 圖像 / 影片生成 prompt 的快速參考。
> 適用於 Google Gemini（生圖）、Veo 3（生影片）、Midjourney、DALL-E 等模型。

---

## 目錄

1. [景別 Shot Size](#1-景別-shot-size)
2. [攝影角度 Camera Angle](#2-攝影角度-camera-angle)
3. [鏡頭運動 Camera Movement](#3-鏡頭運動-camera-movement)
4. [光線與打光 Lighting](#4-光線與打光-lighting)
5. [色調與氛圍 Mood & Color](#5-色調與氛圍-mood--color)
6. [構圖法則 Composition](#6-構圖法則-composition)
7. [鏡頭與光學效果 Lens & Optics](#7-鏡頭與光學效果-lens--optics)
8. [Prompt 組合公式](#8-prompt-組合公式)
9. [Veo 3 音效標記](#9-veo-3-音效標記)
10. [實戰範例](#10-實戰範例)

---

## 1. 景別 Shot Size

| 英文術語                    | 中文        | 畫面範圍               | 適用情境                       |
| --------------------------- | ----------- | ---------------------- | ------------------------------ |
| **Extreme Wide Shot (EWS)** | 大遠景      | 人物極小，環境為主     | 建立場景、史詩感開場           |
| **Wide Shot (WS)**          | 遠景 / 全景 | 人物全身 + 環境        | 交代空間關係                   |
| **Full Shot (FS)**          | 全身鏡      | 人物頭到腳             | 展示角色服裝、肢體語言         |
| **Medium Wide Shot (MWS)**  | 中遠景      | 膝蓋以上               | 多人互動場景                   |
| **Medium Shot (MS)**        | 中景        | 腰部以上               | 對話、日常互動（最常用）       |
| **Medium Close-Up (MCU)**   | 中特寫      | 胸口以上               | 強調表情 + 保留手勢            |
| **Close-Up (CU)**           | 特寫        | 臉部填滿畫面           | 情緒高潮、反應鏡頭             |
| **Extreme Close-Up (ECU)**  | 大特寫      | 眼睛 / 嘴唇 / 物件細節 | 製造緊張感、揭示關鍵線索       |
| **Insert Shot**             | 插入鏡頭    | 手部、道具、螢幕畫面   | 補充敘事資訊（手機畫面、按鈕） |

### Prompt 寫法範例

```
❌ a person standing in a room
✅ medium close-up of a flight attendant standing in a luxurious airplane cabin
```

---

## 2. 攝影角度 Camera Angle

| 英文術語                    | 中文          | 視覺效果             | 適用情境                   |
| --------------------------- | ------------- | -------------------- | -------------------------- |
| **Eye Level**               | 平視          | 平等、客觀、中性     | 日常對話、標準敘事         |
| **Low Angle**               | 仰角          | 人物顯得高大、有權威 | 英雄登場、Boss 出場        |
| **High Angle**              | 俯角          | 人物顯得渺小、脆弱   | 展示弱勢、環境壓迫         |
| **Bird's Eye View**         | 鳥瞰          | 正上方 90° 俯視      | 地圖感、群眾場面、食物擺盤 |
| **Worm's Eye View**         | 蟲視角        | 從地面向上看         | 誇張戲劇感、建築宏偉       |
| **Dutch Angle (Tilted)**    | 荷蘭角 / 傾斜 | 畫面歪斜、不安定     | 混亂、瘋狂、心理扭曲       |
| **Over-the-Shoulder (OTS)** | 過肩鏡頭      | 從一人肩後看另一人   | 對話正反打                 |
| **POV (Point of View)**     | 第一人稱視角  | 觀眾＝角色的眼睛     | 沉浸感、VR 風格            |

### Prompt 寫法範例

```
❌ the boss enters the room
✅ low angle shot of a confident man in suit walking through fog, backlit, hero entrance
```

---

## 3. 鏡頭運動 Camera Movement

> **靜態圖片**：描述暗示運動的構圖（如動態模糊）。
> **Veo 3 影片**：直接在 prompt 中描述運動方式。

| 英文術語                 | 中文          | 運動方式               | 視覺效果                             |
| ------------------------ | ------------- | ---------------------- | ------------------------------------ |
| **Static / Fixed**       | 固定鏡頭      | 攝影機完全不動         | 穩定、莊嚴、紀錄片感                 |
| **Pan (Left/Right)**     | 水平搖鏡      | 攝影機原地左右旋轉     | 環顧環境、跟隨角色移動               |
| **Tilt (Up/Down)**       | 垂直搖鏡      | 攝影機原地上下旋轉     | 揭示建築高度、從腳到臉               |
| **Dolly In/Out**         | 推軌前進/後退 | 攝影機在軌道上前後移動 | 逐漸進入/離開場景（有縱深感）        |
| **Dolly Zoom (Vertigo)** | 乖離變焦      | 推軌＋反向變焦         | 空間扭曲感、心理衝擊（經典驚悚手法） |
| **Tracking Shot**        | 跟蹤鏡頭      | 攝影機跟著角色移動     | 伴隨角色行進、走秀                   |
| **Crane Shot**           | 搖臂鏡頭      | 攝影機升高或降低       | 史詩場面、大場景轉小場景             |
| **Steadicam**            | 穩定器        | 手持但極度平穩         | 跟拍長鏡頭、走廊穿越                 |
| **Handheld**             | 手持晃動      | 刻意不穩定             | 紀實感、緊張感、混亂場面             |
| **Zoom In/Out**          | 變焦推進/拉遠 | 鏡頭焦距變化（無位移） | 強調重點、戲劇反應                   |
| **Whip Pan**             | 甩鏡          | 極快速水平旋轉         | 場景快速切換、動作片轉場             |
| **360° Orbit**           | 環繞鏡頭      | 繞著主體旋轉一圈       | 英雄時刻、商品展示                   |
| **Slow Motion**          | 慢動作        | 時間放慢               | 情感高潮、動作瞬間                   |

### Prompt 寫法範例

```
❌ camera moves around the character
✅ slow 360° orbit shot around the pilot standing in fog, dramatic backlight, slow motion
```

---

## 4. 光線與打光 Lighting

### 4.1 自然光源

| 英文術語                | 中文         | 視覺效果                  |
| ----------------------- | ------------ | ------------------------- |
| **Golden Hour**         | 黃金時段     | 日出/日落暖色調，柔和長影 |
| **Blue Hour**           | 藍色時刻     | 日落後的深藍冷調          |
| **Overcast / Diffused** | 陰天漫射光   | 無陰影、均勻柔和          |
| **Harsh Sunlight**      | 強烈直射陽光 | 高對比、明確陰影          |
| **Dappled Light**       | 斑駁光影     | 樹葉間漏下的光斑          |
| **Moonlight**           | 月光         | 冷藍調、神秘感            |

### 4.2 人工打光

| 英文術語                    | 中文                | 視覺效果                       |
| --------------------------- | ------------------- | ------------------------------ |
| **Rembrandt Lighting**      | 倫勃朗光            | 臉部一側三角形光區，古典肖像   |
| **Rim Light / Edge Light**  | 輪廓光              | 只照亮邊緣輪廓，人物從背景分離 |
| **Backlight / Contre-jour** | 逆光                | 從背後打光，人物剪影或光暈     |
| **Side Light**              | 側光                | 一半亮一半暗，戲劇張力         |
| **Under Light**             | 下方打光            | 從下往上照，恐怖/詭異          |
| **Practical Lights**        | 場景實際光源        | 檯燈、霓虹燈、螢幕光           |
| **Neon Light**              | 霓虹燈              | 賽博龐克、夜店、未來感         |
| **Spotlight**               | 聚光燈              | 舞台感、重點突出               |
| **Volumetric Light**        | 體積光 / 丁達爾效應 | 光束穿過煙霧可見光柱           |

### Prompt 寫法範例

```
❌ good lighting in the scene
✅ warm golden hour rim lighting from behind, volumetric light rays through cabin windows, soft fill light on face
```

---

## 5. 色調與氛圍 Mood & Color

| 英文術語                | 中文             | 情緒聯想           |
| ----------------------- | ---------------- | ------------------ |
| **Warm Tones**          | 暖色調（橙黃紅） | 溫馨、懷舊、親密   |
| **Cool Tones**          | 冷色調（藍綠紫） | 疏離、科技、孤寂   |
| **Desaturated / Muted** | 低飽和           | 寫實、紀錄片、憂鬱 |
| **High Contrast**       | 高對比           | 戲劇性、黑色電影   |
| **Pastel**              | 粉彩             | 夢幻、少女、柔和   |
| **Teal and Orange**     | 藍橙對比         | 好萊塢大片標配     |
| **Monochrome**          | 單色             | 藝術感、復古       |
| **Neon / Cyberpunk**    | 霓虹色           | 未來感、夜生活     |

### 常用氛圍關鍵字

| 情境     | Prompt 關鍵字                                                     |
| -------- | ----------------------------------------------------------------- |
| 歡樂派對 | `bright cheerful atmosphere, vibrant colors, party energy`        |
| 浪漫氛圍 | `soft dreamy bokeh, warm pastel tones, intimate lighting`         |
| 恐怖緊張 | `dark horror atmosphere, harsh shadows, desaturated cold tones`   |
| 史詩英雄 | `epic cinematic, dramatic rim light, teal and orange color grade` |
| 企業專業 | `clean corporate lighting, neutral tones, sharp focus`            |
| 復古懷舊 | `vintage film grain, faded warm tones, 35mm film aesthetic`       |

---

## 6. 構圖法則 Composition

| 英文術語                | 中文     | 說明                 | Prompt 寫法                                                |
| ----------------------- | -------- | -------------------- | ---------------------------------------------------------- |
| **Rule of Thirds**      | 三分法   | 主體放在 1/3 交叉點  | `subject placed on the right third`                        |
| **Center Frame**        | 中央構圖 | 主體在正中央         | `symmetrically centered in frame`                          |
| **Symmetry**            | 對稱構圖 | 左右或上下鏡像       | `perfectly symmetrical composition, Wes Anderson style`    |
| **Leading Lines**       | 引導線   | 用線條引導視線至主體 | `converging leading lines toward the subject`              |
| **Frame within Frame**  | 框中框   | 門窗、拱門形成內框   | `framed through a doorway, frame within frame composition` |
| **Negative Space**      | 留白     | 大面積空白突出主體   | `minimal composition with vast negative space`             |
| **Foreground Interest** | 前景元素 | 前景物體增加縱深     | `shot through foreground objects, depth layering`          |
| **Depth Layering**      | 層次縱深 | 前中後景分明         | `foreground, midground, and background clearly separated`  |

### Prompt 寫法範例

```
❌ a person in a hallway
✅ symmetrical composition, a flight attendant standing centered at the end of a long airplane aisle, converging leading lines, depth layering with seat rows in foreground
```

---

## 7. 鏡頭與光學效果 Lens & Optics

| 英文術語                 | 中文           | 效果               | 適用情境                 |
| ------------------------ | -------------- | ------------------ | ------------------------ |
| **Wide Angle (16-24mm)** | 廣角鏡         | 空間感大、邊緣變形 | 環境全貌、誇張透視       |
| **Standard (35-50mm)**   | 標準鏡         | 最接近人眼視角     | 自然的敘事鏡頭           |
| **Telephoto (85-200mm)** | 長焦鏡         | 壓縮空間、淺景深   | 人像、偷拍感、壓迫感     |
| **Macro**                | 微距           | 極近距離細節       | 物件特寫、質感展示       |
| **Anamorphic**           | 變形寬銀幕鏡頭 | 橢圓散景、水平光暈 | 電影感、寬螢幕美學       |
| **Shallow DOF**          | 淺景深         | 背景大幅模糊       | 突出主體、夢幻感         |
| **Deep Focus**           | 深焦           | 前後景都清晰       | 同時呈現多層資訊         |
| **Bokeh**                | 散景           | 圓形光點模糊       | 夢幻、浪漫、城市夜景     |
| **Lens Flare**           | 鏡頭光暈       | 光源產生光條       | 史詩感、J.J. Abrams 風格 |
| **Motion Blur**          | 動態模糊       | 移動物體拖影       | 速度感、動作場面         |
| **Film Grain**           | 底片顆粒       | 類比底片質感       | 復古、獨立電影           |
| **Tilt-Shift**           | 移軸           | 微縮模型效果       | 俯瞰城市、玩具感         |

### Prompt 寫法範例

```
❌ blurry background
✅ shot on 85mm telephoto lens, shallow depth of field, creamy bokeh in background, anamorphic lens flare
```

---

## 8. Prompt 組合公式

### 萬能公式

```
[景別] + [角度] + [主體與動作] + [場景環境] + [光線] + [色調/氛圍] + [鏡頭效果] + [鏡頭運動]
```

### 各欄位範例

| 欄位       | 範例                                                                         |
| ---------- | ---------------------------------------------------------------------------- |
| 景別       | `medium close-up`                                                            |
| 角度       | `low angle`                                                                  |
| 主體與動作 | `a flight attendant tossing a phone into a trash bin with a confident smile` |
| 場景環境   | `inside a luxurious airplane cabin with leather seats`                       |
| 光線       | `warm golden hour light streaming through oval windows`                      |
| 色調/氛圍  | `cinematic teal and orange color grade, comedic atmosphere`                  |
| 鏡頭效果   | `shot on 35mm film, shallow depth of field, subtle film grain`               |
| 鏡頭運動   | `slow dolly in toward the subject`                                           |

### 組合結果

```
Medium close-up, low angle of a flight attendant tossing a phone into a trash bin
with a confident smile, inside a luxurious airplane cabin with leather seats.
Warm golden hour light streaming through oval windows, cinematic teal and orange
color grade, comedic atmosphere. Shot on 35mm film, shallow depth of field,
subtle film grain. Slow dolly in toward the subject.
```

---

## 9. Veo 3 音效標記

> 非官方標記，但實測結構化寫法比純自然語言更精確。

| 標記        | 用途          | 範例                                                    |
| ----------- | ------------- | ------------------------------------------------------- |
| `[SFX]`     | 音效 / 環境音 | `[SFX] airplane cabin ambience, seatbelt ding sound`    |
| `[Music]`   | 配樂風格      | `[Music] upbeat jazz, playful comedic orchestral score` |
| `[Voice]`   | 語音指示      | `[Voice] speaks in Chinese: "歡迎搭乘"`                 |
| `[Silence]` | 靜音          | `[Silence] no dialogue, only ambient sound`             |

### Veo 3 完整 Prompt 結構

```
[畫面描述，含景別、角度、光線、動作]
[鏡頭運動描述]
[SFX] 音效描述
[Music] 配樂描述
[Voice] 語音描述（或省略以靜音）
```

### 範例

```
Medium shot of a flight attendant in a luxurious airplane cabin,
elegantly bowing at 90 degrees toward the camera.
Warm golden hour lighting, cinematic atmosphere.
Slow dolly zoom camera movement.
[SFX] airplane cabin ambience with gentle hum, seatbelt chime ding
[Music] light orchestral score, comedic and warm
```

---

## 10. 實戰範例

以下以 SWAG 航空春酒影片的實際分鏡為例：

---

### 範例 A — 歡迎登機（溫馨莊重）

**導演意圖**：建立場景，暖色調營造尊榮航空感。

```
Wide shot, eye level. Luxurious airplane cabin interior with warm golden hour
lighting streaming through oval windows. A flight attendant in crisp uniform
bowing sincerely at 90 degrees toward the camera while reading from a script.
SWAG airline logo on the wall. Volumetric light rays visible in the cabin air.
Shot on 35mm anamorphic lens, shallow depth of field with seat rows softly
blurred in foreground. Slow dolly zoom creating subtle vertigo effect.
```

---

### 範例 B — KPI 崩潰（喜劇反差）

**導演意圖**：喜劇節奏，從絕望快速轉到黑色幽默。

```
Medium shot, slightly high angle looking down at a passenger. Bright cheerful
office-like cabin lighting with cool fluorescent overhead mixed with warm
window light. A passenger staring at laptop screen showing KPI charts in
despair, a supervisor gliding in from the right on a rolling chair.
A flight attendant elegantly closes the laptop lid and wags her finger at
camera with a knowing sly smile. Comedic corporate humor atmosphere.
Handheld camera with subtle shake for documentary feel.
Shot on 50mm standard lens, moderate depth of field.
```

---

### 範例 C — 緊急廣播（恐怖反轉）

**導演意圖**：氣氛突變，從喜劇切入假緊急狀態。

```
Close-up, low angle. Air traffic control tower interior, dramatic cockpit
lighting with green radar screen glow illuminating the face from below.
A man wearing large aviation headphones shouting desperately into a radio
microphone. Empty liquor bottles scattered on the radar control desk.
Harsh side lighting casting deep shadows on half of his face.
High contrast, desaturated cold tones with only green radar glow as color accent.
Shot on 85mm telephoto, extremely shallow depth of field, radar screens
as soft bokeh circles in background. Dolly zoom creating disorienting
spatial distortion.
```

---

### 範例 D — 英雄登場（史詩出場）

**導演意圖**：最高潮，致敬 Top Gun 的經典英雄出場。

```
Full shot, low angle looking up at the subject. A confident pilot in aviator
sunglasses and leather jacket walking through dramatic fog toward camera
in slow motion. Strong golden backlight creating a glowing rim light silhouette.
Volumetric light beams cutting through thick fog. Lens flare streaking
across the frame. Epic hero entrance, Top Gun movie aesthetic.
Shot on anamorphic widescreen lens with horizontal blue lens flares,
shallow depth of field. Slow steady dolly in with slight upward crane movement.
```

---

## 快速查詢表

當你在撰寫 prompt 時卡住，依序問自己：

| #   | 問題                     | 對應章節         |
| --- | ------------------------ | ---------------- |
| 1   | 觀眾看到多大的範圍？     | → 景別           |
| 2   | 攝影機在什麼高度/角度？  | → 攝影角度       |
| 3   | 攝影機怎麼動？           | → 鏡頭運動       |
| 4   | 光從哪裡來？什麼顏色？   | → 光線與打光     |
| 5   | 整體是什麼情緒/色調？    | → 色調與氛圍     |
| 6   | 畫面怎麼排列？主體在哪？ | → 構圖法則       |
| 7   | 要什麼鏡頭質感？         | → 鏡頭與光學效果 |
