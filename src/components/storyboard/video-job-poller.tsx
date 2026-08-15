"use client";

import { useJobStore } from "@/stores/use-job-store";
import { useVideoGeneration } from "@/hooks/use-generate-video";

/**
 * 全域影片任務輪詢器 —— 讓「整晚批次跑」成立。
 *
 * 問題:輪詢+下載存檔的邏輯在 `useVideoGeneration`,而它掛在**影片面板**上;
 * 面板一關輪詢就停,任務即使在 ComfyUI 跑完也不會被抓回存進分鏡(批次 8 鏡
 * 不可能面板都開著)。
 *
 * 解法:掛在專案頁(rail)、不隨對話框開關。對 job store 裡**每個在跑的任務**
 * 各渲染一個隱形 `JobWatcher`,等於把既有的 poll→download→saveVideo 邏輯
 * 搬到 App 層跑,零重複。任務完成→removeJob→該 watcher 自動卸載。
 *
 * (面板與這裡可能同時為同一鏡掛 hook:poll query 由 react-query 依 key 去重,
 *  下載則由 use-generate-video 內的 module 層 Set 去重,不會存兩次。)
 */
function JobWatcher({ frameId }: { frameId: string }) {
  useVideoGeneration(frameId);
  return null;
}

export function VideoJobPoller() {
  const jobs = useJobStore((s) => s.jobs);
  return (
    <>
      {Object.keys(jobs).map((frameId) => (
        <JobWatcher key={frameId} frameId={frameId} />
      ))}
    </>
  );
}
