/**
 * 設定類對話框(備份 / Prompt 模板 / 模型設定)共用的外部控制介面。
 *
 * 需要它是因為這三個對話框現在從首頁的「設定」下拉選單開啟 —— 選單項目被
 * 選中時選單會關閉並卸載,對話框如果掛在選單裡會跟著消失。所以開關狀態由
 * 頁面持有,對話框渲染在選單之外。
 *
 * 三個 props 都是可選的:不傳時行為與先前完全一樣(自帶觸發按鈕、自己管開關)。
 */
export interface SettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 由選單開啟時不需要自己的觸發按鈕 */
  hideTrigger?: boolean;
}
