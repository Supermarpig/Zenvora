import { NextRequest, NextResponse } from "next/server";

/**
 * 影片下載代理:Veo 產出的檔案 URI 需要帶 API key 才能下載。
 * 前端只拿到 URI,實際下載走這裡,key 留在伺服器端。
 * 僅允許 googleapis.com 主機,避免被當成任意 URL 代理(SSRF)。
 */
export async function GET(req: NextRequest) {
  const uri = req.nextUrl.searchParams.get("uri");
  if (!uri) {
    return NextResponse.json({ error: "缺少 uri 參數" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(uri);
  } catch {
    return NextResponse.json({ error: "uri 格式錯誤" }, { status: 400 });
  }

  // 允許清單:各 provider 的官方檔案 / CDN host 後綴(SSRF 防護,只放行已知來源)
  const ALLOWED_HOST_SUFFIXES = [
    "googleapis.com", // Veo
    "volces.com", // 火山引擎 / Seedance
    "volccdn.com",
    "byteimg.com",
    "bytedance.com",
    "klingai.com", // Kling / 可灵
    "kuaishou.com", // 快手 CDN
    "kwimgs.com",
    "yximgs.com",
  ];
  const allowed = ALLOWED_HOST_SUFFIXES.some((s) =>
    target.hostname.endsWith(s)
  );
  if (target.protocol !== "https:" || !allowed) {
    return NextResponse.json(
      { error: "不允許的下載來源" },
      { status: 403 }
    );
  }

  // 只有 Google(Veo)的檔案 URI 需要帶 API key;其他 provider 的 CDN 為公開連結
  if (target.hostname.endsWith("googleapis.com")) {
    const key = process.env.GOOGLE_AI_API_KEY;
    if (!key || key === "your_api_key_here") {
      return NextResponse.json(
        { error: "未設定 GOOGLE_AI_API_KEY" },
        { status: 500 }
      );
    }
    if (!target.searchParams.has("key")) target.searchParams.set("key", key);
    if (!target.searchParams.has("alt")) target.searchParams.set("alt", "media");
  }

  const upstream = await fetch(target.toString());
  if (!upstream.ok || !upstream.body) {
    const body = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `下載失敗 ${upstream.status}: ${body.slice(0, 200)}` },
      { status: 502 }
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "video/mp4",
      "Cache-Control": "no-store",
    },
  });
}
