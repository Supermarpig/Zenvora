import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  // TODO: 未來加入 NextAuth session 檢查
  return NextResponse.next();
}

export const config = {
  matcher: ["/project/:path*", "/api/:path*"],
};
