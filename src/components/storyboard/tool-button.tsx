"use client";

import { Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * 工具列 / 側邊欄共用的按鈕。
 *
 * 存在的理由:同一個功能在頂部工具列是「圖示 + 文字」,在左側側邊欄是
 * 「純圖示 + hover 標籤」。**兩種樣式寫在一個地方**,否則九個元件各自
 * 複製一份,改個間距要改九次。
 *
 * `...props` 會原樣傳到 Button —— `DialogTrigger asChild` 靠這條路把
 * onClick 與 ref 傳進來,拿掉會讓那些觸發器失效。
 */
interface ToolButtonProps extends React.ComponentProps<typeof Button> {
  icon: LucideIcon;
  label: string;
  /** true = 側邊欄的純圖示樣式 */
  rail?: boolean;
  /** 顯示在標籤後的數字(例如角色數、季數);0 或未給則不顯示 */
  badge?: number;
  /** 進行中:圖示換成轉圈 */
  loading?: boolean;
}

export function ToolButton({
  icon: Icon,
  label,
  rail = false,
  badge,
  loading = false,
  variant = "outline",
  ...props
}: ToolButtonProps) {
  const IconEl = loading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Icon className="h-4 w-4" />
  );

  if (!rail) {
    return (
      <Button variant={variant} size="sm" {...props}>
        <span className="mr-1.5">{IconEl}</span>
        {label}
        {!!badge && (
          <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
            {badge}
          </span>
        )}
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={label}
          {...props}
        >
          {IconEl}
          {!!badge && (
            <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-primary px-1 text-[9px] leading-4 text-primary-foreground">
              {badge}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
