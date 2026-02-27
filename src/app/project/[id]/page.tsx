import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function StoryboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">分鏡畫布 — 專案 {id}</h1>
      <p className="text-muted-foreground">React Flow 畫布即將在 Phase 4 實作</p>
      <Button variant="outline" asChild>
        <Link href="/">返回首頁</Link>
      </Button>
    </div>
  );
}
