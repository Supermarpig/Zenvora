import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 目前是 no-op。留著是為了未來加 session 檢查,但要意識到:
 * 下方 matcher 仍會讓每個 /project/* 與 /api/* 請求多跑一層(dev log 可見
 * `proxy.ts: Nms`)。如果長期不加驗證,應考慮縮小 matcher 或整個移除。
 */
export function proxy(_request: NextRequest) {
  // TODO: 未來加入 NextAuth session 檢查
  return NextResponse.next();
}

export const config = {
  matcher: ["/project/:path*", "/api/:path*"],
};
