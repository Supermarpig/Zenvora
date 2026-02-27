"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProjectStore } from "@/stores/use-project-store";
import { createProjectSchema } from "@/lib/schemas";
import type { CreateProjectInput } from "@/lib/schemas";

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const addProject = useProjectStore((s) => s.addProject);

  const form = useForm({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", description: "" },
  });

  function onSubmit(data: Record<string, string>) {
    const project = addProject({ name: data.name, description: data.description });
    toast.success("專案建立成功");
    setOpen(false);
    form.reset();
    router.push(`/project/${project.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="mr-2 h-5 w-5" />
          新增專案
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>建立新專案</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>專案名稱</FormLabel>
                  <FormControl>
                    <Input placeholder="例：產品介紹影片" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述（選填）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="簡單描述這個專案的目的..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button type="submit">建立</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
