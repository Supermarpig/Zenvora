import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function PromptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Seedance 提示詞總表 — 專案 {id}</h1>
      <p className="text-muted-foreground">提示詞總表即將在 Phase 7 實作</p>
      <Button variant="outline" asChild>
        <Link href={`/project/${id}`}>返回畫布</Link>
      </Button>
    </div>
  );
}
