"use client";

import Link from "next/link";
import { ArrowLeft, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterLibrary } from "@/components/character/character-library";

export default function CharactersPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            <h1 className="text-xl font-bold">人物資產</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <CharacterLibrary />
      </main>
    </div>
  );
}
