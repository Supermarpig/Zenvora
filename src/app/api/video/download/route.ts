import { NextRequest, NextResponse } from "next/server";

/**
 * 影片下載代理:Veo 產出的檔案 URI 需要帶 API key 才能下載。
 * 前端只拿到 URI,實際下載走這裡,key 留在伺服器端。
 * 僅允許 googleapis.com 主機,避免被當成任意 URL 代理(SSRF)。
 */
/** 上游連線逾時(只涵蓋到收到 response headers,不限制影片 body 的傳輸時間) */
const UPSTREAM_TIMEOUT_MS = 30_000;
const MAX_URI_LENGTH = 2048;

/**
 * 主機是否落在允許清單內。
 *
 * 必須用「完全相等」或「.suffix」比對,不能只用 endsWith ——
 * "evil-googleapis.com".endsWith("googleapis.com") 會是 true,
 * 攻擊者註冊這種網域就能通過檢查,而 googleapis 分支會把 API key
 * 附加到 query string 一併送出,構成金鑰外洩。
 */
function matchesHost(hostname: string, suffix: string): boolean {
  return hostname === suffix || hostname.endsWith("." + suffix);
}

export async function GET(req: NextRequest) {
  const uri = req.nextUrl.searchParams.get("uri");
  if (!uri) {
    return NextResponse.json({ error: "缺少 uri 參數" }, { status: 400 });
  }
  if (uri.length > MAX_URI_LENGTH) {
    return NextResponse.json({ error: "uri 過長" }, { status: 400 });
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
    "hailuoai.com", // MiniMax / 海螺 成片 CDN(cdn.hailuoai.com)
    "minimax.io", // MiniMax 國際站檔案
    "minimaxi.com", // MiniMax 大陸站檔案
  ];
  const allowed = ALLOWED_HOST_SUFFIXES.some((s) =>
    matchesHost(target.hostname, s)
  );
  if (target.protocol !== "https:" || !allowed) {
    return NextResponse.json(
      { error: "不允許的下載來源" },
      { status: 403 }
    );
  }

  // 只有 Google(Veo)的檔案 URI 需要帶 API key;其他 provider 的 CDN 為公開連結。
  // 這裡同樣不能用裸 endsWith —— 附加金鑰的判斷比白名單更不能放行冒充網域。
  if (matchesHost(target.hostname, "googleapis.com")) {
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

  // 逾時只掛到「取得 response」為止,拿到 headers 後就清掉 timer,
  // 否則大檔影片 streaming 到一半會被中斷
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), { signal: controller.signal });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "上游下載逾時" : "上游連線失敗" },
      { status: 504 }
    );
  } finally {
    clearTimeout(timer);
  }

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
