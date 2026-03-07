import type { Project, Frame } from "./schemas";

const PROJECT_ID = "swag-airline-2026";

export const seedProject: Project = {
  id: PROJECT_ID,
  name: "SWAG 航空 2026 春酒開場影片",
  description:
    "航空主題春酒開場影片，模擬機艙安全廣播，分為四階段：登機須知、機艙設施、航程重點、特別廣播（機長進場）",
  characters: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const seedFrames: Frame[] = [
  // ─── Scene 1: Welcome (0:00-0:12) ───
  {
    id: "frame-01a",
    projectId: PROJECT_ID,
    order: 0,
    prompt:
      "Luxurious airplane cabin interior with warm golden lighting, a flight attendant bowing sincerely at 90 degrees toward the camera while reading from a script, SWAG airline logo on the wall, cinematic wide shot",
    speaker: "空服員",
    dialogue: "各位貴賓您好，歡迎搭乘 SWAG 航空公司 2026 號班機，本次航班由台北 CHALET V 出發，",
    cameraMovement: "Dolly Zoom",
    duration: 8,
    style: "Cinematic",
    mood: "Warm/Golden Hour",
  },
  {
    id: "frame-01b",
    projectId: PROJECT_ID,
    order: 1,
    prompt:
      "Luxurious airplane cabin interior, flight attendant standing at entrance reading script with earnest expression, warm golden lighting, SWAG airline logo, medium close-up",
    speaker: "空服員",
    dialogue: "目的地是——財富自由的遠方。在航程開始前，請再次確認您的座位位置。",
    cameraMovement: "Zoom In",
    duration: 8,
    style: "Cinematic",
    mood: "Warm/Golden Hour",
  },

  // ─── Scene 2: KPI (0:12-0:22) ───
  {
    id: "frame-02a",
    projectId: PROJECT_ID,
    order: 2,
    prompt:
      "Airplane cabin seating area, a passenger staring at laptop screen showing KPI charts in despair, a supervisor gliding in on seat, a flight attendant elegantly closing the laptop lid with a sly smile, medium shot",
    speaker: "空服員",
    dialogue: "若您發現隔壁乘客是您不認識的主管，請保持尷尬而不失禮貌的微笑，",
    cameraMovement: "Pan Right",
    duration: 8,
    style: "Cinematic",
    mood: "Bright/Cheerful",
  },
  {
    id: "frame-02b",
    projectId: PROJECT_ID,
    order: 3,
    prompt:
      "Airplane cabin, flight attendant wagging finger at camera with a knowing smile after closing laptop, comedic corporate humor, close-up",
    speaker: "空服員",
    dialogue: "並假裝昨天的 KPI 只是場夢。",
    cameraMovement: "Zoom In",
    duration: 8,
    style: "Cinematic",
    mood: "Bright/Cheerful",
  },

  // ─── Scene 3: Romance Turbulence (0:22-0:35) ───
  {
    id: "frame-03a",
    projectId: PROJECT_ID,
    order: 4,
    prompt:
      "Airplane cabin, two passengers sitting side by side, one clutching their chest dramatically with exaggerated gasping expression, soft bokeh lighting, romantic comedy atmosphere",
    speaker: "空服員",
    dialogue: "若您發現隔壁乘客是您從未見過的帥哥美女，請放心，",
    cameraMovement: "Zoom In",
    duration: 8,
    style: "Cinematic",
    mood: "Soft/Dreamy",
  },
  {
    id: "frame-03b",
    projectId: PROJECT_ID,
    order: 5,
    prompt:
      "Airplane cabin, flight attendant standing behind passengers with deadpan smile while wildly shaking the seat to simulate turbulence, comedic romantic atmosphere, medium wide shot",
    speaker: "空服員",
    dialogue: "現在感受到的劇烈晃動並非亂流，而是您心跳加速的正常反應。",
    cameraMovement: "Zoom Out",
    duration: 8,
    style: "Cinematic",
    mood: "Soft/Dreamy",
  },

  // ─── Scene 4: Phone + Clapping (0:35-0:45) ───
  {
    id: "frame-04a",
    projectId: PROJECT_ID,
    order: 6,
    prompt:
      "Airplane cabin, a flight attendant cleanly tossing a smartphone into a nearby trash bin then turning to camera with a smile, medium close-up",
    speaker: "空服員",
    dialogue: "為了確保航程順利，請開啟「人間蒸發」模式。現在，請不要吝嗇你的雙手，",
    cameraMovement: "Fixed",
    duration: 8,
    style: "Cinematic",
    mood: "Bright/Cheerful",
  },
  {
    id: "frame-04b",
    projectId: PROJECT_ID,
    order: 7,
    prompt:
      "Airplane cabin, flight attendant clapping hands rapidly like a seal with silent enthusiasm, crowd cheering in background, party atmosphere, dynamic handheld camera",
    speaker: "空服員",
    dialogue: "當主持人拍手手時，請用最瘋狂的尖叫聲與掌聲，填滿整個機艙。",
    cameraMovement: "Handheld",
    duration: 8,
    style: "Cinematic",
    mood: "Bright/Cheerful",
  },

  // ─── Scene 5: Food Area (0:45-0:57) ───
  {
    id: "frame-05a",
    projectId: PROJECT_ID,
    order: 8,
    prompt:
      "Luxurious airplane cabin, flight attendant elegantly gesturing toward gourmet buffet station, meanwhile a passenger with glazed eyes about to bite a stapler, warm spotlight, medium wide shot",
    speaker: "空服員",
    dialogue: "接下來為您介紹本機主要設施。本機能源補給區位於客艙左側，",
    cameraMovement: "Tracking Shot",
    duration: 8,
    style: "Cinematic",
    mood: "Warm/Golden Hour",
  },
  {
    id: "frame-05b",
    projectId: PROJECT_ID,
    order: 9,
    prompt:
      "Airplane cabin, flight attendant pushing a dazed passenger out of frame while gesturing toward food area, comedic split-attention composition, warm lighting",
    speaker: "空服員",
    dialogue: "若您出現血糖偏低、眼神渙散，或對人生產生短暫懷疑的情況，請自行前往補充燃料。",
    cameraMovement: "Pan Right",
    duration: 8,
    style: "Cinematic",
    mood: "Warm/Golden Hour",
  },

  // ─── Scene 6: Drinks (0:57-1:05) ───
  {
    id: "frame-06",
    projectId: PROJECT_ID,
    order: 10,
    prompt:
      "Elegant airplane bar area, soft drinks, red wine, white wine bottles and cocktail mixing setup, flight attendant presenting beverages with professional gesture, warm spotlight, food photography style",
    speaker: "空服員",
    dialogue: "除了食物以外，另提供軟飲、紅白酒暢飲及專業調酒。",
    cameraMovement: "Pan Right",
    duration: 8,
    style: "Cinematic",
    mood: "Warm/Golden Hour",
  },

  // ─── Scene 7: Restroom (1:05-1:15) ───
  {
    id: "frame-07a",
    projectId: PROJECT_ID,
    order: 11,
    prompt:
      "Airplane restroom area with glowing blue neon sign, flight attendant elegantly pointing toward restroom, passenger at doorway with legs tightly crossed in extreme urgency, medium shot",
    speaker: "空服員",
    dialogue: "排放系統——本機洗手間位於機尾方向，若您因中獎預感太過強烈，",
    cameraMovement: "Pan Left",
    duration: 8,
    style: "Cinematic",
    mood: "Bright/Cheerful",
  },
  {
    id: "frame-07b",
    projectId: PROJECT_ID,
    order: 12,
    prompt:
      "Airplane restroom area, passenger desperately crossing legs at doorway, flight attendant calmly gesturing toward blue indicator light, humorous atmosphere, close-up",
    speaker: "空服員",
    dialogue: "導致生理壓力急速升高，請依照藍色指示燈前往。",
    cameraMovement: "Zoom In",
    duration: 8,
    style: "Cinematic",
    mood: "Bright/Cheerful",
  },
  {
    id: "frame-07c",
    projectId: PROJECT_ID,
    order: 13,
    prompt:
      "Airplane restroom area, flight attendant giving reassuring smile and wink to camera, warm comedic atmosphere, medium close-up",
    speaker: "空服員",
    dialogue: "請放心，所有的使用紀錄與停留時間，絕對不列入年度考核。",
    cameraMovement: "Fixed",
    duration: 8,
    style: "Cinematic",
    mood: "Bright/Cheerful",
  },

  // ─── Scene 8: Fashion Walk (1:15-1:23) ───
  {
    id: "frame-08",
    projectId: PROJECT_ID,
    order: 14,
    prompt:
      "Wide airplane cabin aisle, a passenger strutting exaggerated supermodel runway walk with dramatic steps, reaching camera and striking a confident pose, spotlights and camera flashes, glamorous atmosphere",
    speaker: "空服員",
    dialogue: "本次航程將依序通過以下高度區段。一開始，飛越環球領空，欣賞來自各國嘉賓的精彩走秀。",
    cameraMovement: "Tracking Shot",
    duration: 8,
    style: "Cinematic",
    mood: "Warm/Golden Hour",
  },

  // ─── Scene 9: Kahoot (1:23-1:30) ───
  {
    id: "frame-09a",
    projectId: PROJECT_ID,
    order: 15,
    prompt:
      "Airplane cabin, a passenger holding up phone with dead battery screen, flight attendant pointing and silently mocking with exaggerated laugh gesture, comedic dynamic angle",
    speaker: "空服員",
    dialogue: "接下來，進入腦力空戰 Kahoot 區域，請確認手機電量充足，",
    cameraMovement: "Handheld",
    duration: 8,
    style: "Cinematic",
    mood: "Bright/Cheerful",
  },
  {
    id: "frame-09b",
    projectId: PROJECT_ID,
    order: 16,
    prompt:
      "Airplane cabin, passengers intensely focused on phones playing quiz game, competitive expressions, colorful Kahoot interface glowing on screens, dynamic angles",
    speaker: "空服員",
    dialogue: "答錯不會被彈射出艙，但會被同事笑到明年。",
    cameraMovement: "Zoom In",
    duration: 8,
    style: "Cinematic",
    mood: "Bright/Cheerful",
  },

  // ─── Scene 10: Bingo + Special Ops + Red Envelope (1:30-1:40) ───
  {
    id: "frame-10a",
    projectId: PROJECT_ID,
    order: 17,
    prompt:
      "Airplane cabin, bingo cards floating in the air, passengers frantically marking numbers, competitive game show atmosphere, dramatic spotlight",
    speaker: "空服員",
    dialogue: "接著進行賓果大亂鬥，之後進入特種任務禁區，",
    cameraMovement: "Zoom In",
    duration: 8,
    style: "Cinematic",
    mood: "Bright/Cheerful",
  },
  {
    id: "frame-10b",
    projectId: PROJECT_ID,
    order: 18,
    prompt:
      "Airplane cabin, passengers holding random objects above their heads ready for a challenge, special ops military style lighting with green tint, action movie feel",
    speaker: "空服員",
    dialogue: "請隨時準備好身邊任何能派上用場的物品。最後進入大獎雷達區，",
    cameraMovement: "Handheld",
    duration: 8,
    style: "Cinematic",
    mood: "Moody/Dramatic",
  },
  {
    id: "frame-10c",
    projectId: PROJECT_ID,
    order: 19,
    prompt:
      "Giant red envelopes with golden Chinese characters descending from above like bombs on a radar screen, passengers holding on to seats, airplane shaking, epic cinematic moment",
    speaker: "空服員",
    dialogue: "請保持坐姿並繫好安全帶，因為紅包降落的力道，可能會震碎您的理智。",
    cameraMovement: "Crane Shot",
    duration: 8,
    style: "Cinematic",
    mood: "Neon/Glow",
  },

  // ─── Scene 11: Sunglasses Dance (1:30-1:40) ───
  {
    id: "frame-11a",
    projectId: PROJECT_ID,
    order: 20,
    prompt:
      "Airplane cabin, flight attendant putting on oversized dramatic sunglasses with expressionless face, body wildly dancing nightclub moves, dynamic handheld camera",
    speaker: "空服員",
    dialogue: "落地之後，本航班不提供返家服務，將直接轉機前往 onCor 續攤基地。",
    cameraMovement: "Handheld",
    duration: 8,
    style: "Cinematic",
    mood: "Moody/Dramatic",
  },
  {
    id: "frame-11b",
    projectId: PROJECT_ID,
    order: 21,
    prompt:
      "Airplane cabin, flight attendant headbanging wildly then suddenly stopping and pointing aggressively at camera, comedic contrast between deadpan face and wild body, dynamic handheld",
    speaker: "空服員",
    dialogue: "今晚沒事的朋友們，請務必跟上大隊伍，讓我們一起續攤狂歡到底！",
    cameraMovement: "Handheld",
    duration: 8,
    style: "Cinematic",
    mood: "Moody/Dramatic",
  },

  // ─── Scene 12: Static Transition (1:40-1:45) ───
  {
    id: "frame-12",
    projectId: PROJECT_ID,
    order: 22,
    prompt:
      "TV static and radio interference visual effect, screen filled with analog noise and scan lines, red warning lights flashing urgently, emergency broadcast aesthetic",
    speaker: "",
    dialogue: "（無線電「嘶嘶」通訊干擾聲，伴隨緊急警報聲）",
    cameraMovement: "Zoom In",
    duration: 5,
    style: "Cinematic",
    mood: "Dark/Horror",
  },

  // ─── Scene 13: Mayday (1:45-2:00) ───
  {
    id: "frame-13a",
    projectId: PROJECT_ID,
    order: 23,
    prompt:
      "Air traffic control tower interior, a man wearing large aviation headphones at radar control desk with empty liquor bottles on table, green radar screens glowing, dramatic cockpit lighting",
    speaker: "威力",
    dialogue: "Mayday! Mayday! 這裡是威力！這裡是威力！機組人員請注意！",
    cameraMovement: "Zoom In",
    duration: 8,
    style: "Cinematic",
    mood: "Dark/Horror",
  },
  {
    id: "frame-13b",
    projectId: PROJECT_ID,
    order: 24,
    prompt:
      "Air traffic control tower, close-up of man shouting into radio with desperate expression, empty bottles and radar screens in background, tense atmosphere",
    speaker: "威力",
    dialogue: "雷達監控顯示，現場出現嚴重航安事故：有部分人員的『酒精油箱』竟然顯示為零！",
    cameraMovement: "Dolly Zoom",
    duration: 8,
    style: "Cinematic",
    mood: "Dark/Horror",
  },

  // ─── Scene 14: Final Shout ───
  {
    id: "frame-14",
    projectId: PROJECT_ID,
    order: 25,
    prompt:
      "Air traffic control tower, the man shouting final passionate words into radio microphone, dramatic camera push-in, screen cuts to black with a deep thud, cinematic ending shot",
    speaker: "威力",
    dialogue: "這已嚴重違反《航空法第 87 條：春酒不喝醉、人生就白廢》！請相關人員立即補充燃料！",
    cameraMovement: "Dolly Zoom",
    duration: 8,
    style: "Cinematic",
    mood: "Moody/Dramatic",
  },

  // ─── Scene 15: Sam Entrance ───
  {
    id: "frame-15",
    projectId: PROJECT_ID,
    order: 26,
    prompt:
      "A confident pilot in aviator sunglasses walking through dramatic fog and backlit by golden light, Top Gun movie style entrance, slow motion, leather jacket, epic hero shot, smoke machine effect",
    speaker: "Sam",
    dialogue: "（現場音控接手：播放機場廣播音樂 → Top Gun Anthem 重低音 → Sam 出場）",
    cameraMovement: "Dolly Zoom",
    duration: 8,
    style: "Cinematic",
    mood: "Moody/Dramatic",
  },
];
