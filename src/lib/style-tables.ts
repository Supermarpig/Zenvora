/**
 * 視覺風格與氛圍的鏡頭語言對照表 —— **唯一來源**。
 *
 * 兩種長度刻意並存:
 * - `verbose`:單鏡生圖與影片 prompt 用,細節完整。
 * - `compact`:宮格 prompt 用。一張圖要塞 9 格,每格描述若跟單鏡一樣長,
 *   整份 prompt 會失焦,模型反而抓不到重點。
 *
 * 先前這兩套分別散在 veo-prompt.ts(`STYLE_LENS` / `MOOD_LIGHTING`)與
 * storyboard-prompt.ts(`LENS_STYLE` / `MOOD_STYLE`),名稱幾乎互換、內容各自
 * 演化過。這裡的措辭是從兩處原樣搬移的 —— **勿隨意改動**,否則既有專案重生的
 * 圖會跟舊圖風格不一致。
 */

export interface StyleVariants {
  verbose: string;
  compact: string;
}

export const STYLE_LENS: Record<string, StyleVariants> = {
  Photorealistic: {
    verbose:
      "Shot on ARRI Alexa cinema camera with Zeiss Master Prime lens, natural photorealistic rendering",
    compact: "photorealistic, shot on cinema camera with natural lighting",
  },
  Cinematic: {
    verbose:
      "Shot on 35mm anamorphic lens with oval bokeh and horizontal flare, cinematic 2.39:1 widescreen aesthetic, shallow depth of field",
    compact:
      "cinematic film quality, shot on 35mm anamorphic lens with shallow depth of field and oval bokeh",
  },
  Anime: {
    verbose:
      "Anime-style cel-shaded illustration with vivid colors and clean lines",
    compact: "anime-style cel-shaded illustration",
  },
  Cyberpunk: {
    verbose:
      "Blade Runner neo-noir aesthetic, rain-soaked reflections, holographic UI overlays, shot on anamorphic lens",
    compact: "cyberpunk Blade Runner aesthetic with neon reflections",
  },
  Watercolor: {
    verbose:
      "Watercolor painting style with soft washes of translucent color, artistic brushstroke texture",
    compact: "watercolor painting style with soft translucent washes",
  },
  "Film Noir": {
    verbose:
      "Classic film noir black-and-white, high-contrast venetian blind shadow patterns, shot on vintage Cooke lens",
    compact:
      "film noir black-and-white with high contrast and venetian blind shadows",
  },
  Illustration: {
    verbose:
      "Polished digital illustration, clean vector-like lines, stylized character proportions",
    compact: "polished digital illustration with clean stylized lines",
  },
  "3D Render": {
    verbose:
      "Photorealistic 3D render, physically-based materials, ray-traced global illumination, Unreal Engine 5 quality",
    compact:
      "photorealistic 3D render with ray-traced lighting, Unreal Engine 5 quality",
  },
};

export const MOOD_LIGHTING: Record<string, StyleVariants> = {
  "Warm/Golden Hour": {
    verbose:
      "Warm golden hour lighting with soft amber rim light, gentle volumetric rays through windows, anamorphic lens flare",
    compact:
      "warm golden hour lighting with soft amber rim light and volumetric rays",
  },
  "Moody/Dramatic": {
    verbose:
      "Dramatic high-contrast Rembrandt lighting, deep side shadows with teal-and-orange color grading, strong rim light separation",
    compact:
      "dramatic high-contrast lighting with deep shadows and teal-orange color grading",
  },
  "Bright/Cheerful": {
    verbose:
      "Bright even fill lighting with vibrant saturated colors, soft key light at 45 degrees, cheerful commercial energy",
    compact:
      "bright cheerful lighting with vibrant saturated colors and soft fill light",
  },
  "Cold/Blue Tone": {
    verbose:
      "Cool blue-toned overhead fluorescent lighting, desaturated clinical palette, isolated cold atmosphere",
    compact: "cool blue-toned lighting with desaturated clinical palette",
  },
  "Neon/Glow": {
    verbose:
      "Vivid neon glow illumination with magenta and cyan accents reflecting off surfaces, cyberpunk night aesthetic",
    compact:
      "vivid neon glow with magenta and cyan accents, cyberpunk night aesthetic",
  },
  "Soft/Dreamy": {
    verbose:
      "Soft diffused lighting through sheer curtain, warm pastel tones, heavy foreground bokeh creating dreamy depth",
    compact: "soft diffused dreamy lighting with pastel tones and heavy bokeh",
  },
  "Dark/Horror": {
    verbose:
      "Harsh underlight casting distorted upward shadows, desaturated cold palette with single red accent, oppressive darkness",
    compact:
      "dark horror atmosphere with harsh underlight and desaturated cold palette",
  },
  "Vintage/Retro": {
    verbose:
      "Vintage warm faded tones with visible 35mm film grain, nostalgic soft-focus edges, tungsten practical light sources",
    compact:
      "vintage warm faded tones with 35mm film grain and nostalgic soft-focus",
  },
};
