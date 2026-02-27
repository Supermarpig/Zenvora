import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">FrameForge</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          AI 分鏡鍛造所 — 即將上線
        </p>
      </div>
      <Button asChild>
        <Link href="/project/demo">進入分鏡編輯器（Demo）</Link>
      </Button>
    </div>
  );
}
