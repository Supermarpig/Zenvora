import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 進行中的影片任務追蹤 —— 只存「重開瀏覽器後要續輪詢」所需的資訊,**不存狀態**。
 *
 * 狀態的單一真相是 `frame.videoStatus`(收斂 §16 D9):先前這裡也存一份
 * `status` / `error`,與 frame 上那份值域重疊,兩邊各自更新就會矛盾。現在改成
 * 「job 存在與否 == 有沒有在跑」,狀態一律問 frame。job 在送出時 `startJob` 建立,
 * 在成功 / 失敗 / 使用者移除時 `removeJob`(輪詢因此只在 job 存在時進行)。
 */
export interface VideoJob {
  frameId: string;
  providerId: string;
  providerJobId: string;
  model: string;
  createdAt: string;
}

interface JobState {
  jobs: Record<string, VideoJob>; // key = frameId
  getJob: (frameId: string) => VideoJob | undefined;
  startJob: (job: Omit<VideoJob, "createdAt">) => void;
  removeJob: (frameId: string) => void;
}

export const useJobStore = create<JobState>()(
  persist(
    (set, get) => ({
      jobs: {},

      getJob: (frameId) => get().jobs[frameId],

      startJob: (job) => {
        set((state) => ({
          jobs: {
            ...state.jobs,
            [job.frameId]: { ...job, createdAt: new Date().toISOString() },
          },
        }));
      },

      removeJob: (frameId) => {
        set((state) => {
          const next = { ...state.jobs };
          delete next[frameId];
          return { jobs: next };
        });
      },
    }),
    {
      name: "frameforge-video-jobs",
      partialize: (state) => ({ jobs: state.jobs }),
      // 舊資料相容:先前 persist 的 job 帶 status/error 欄位,型別移除後那些鍵仍在
      // JSON 裡但無人讀,無害;job 是暫態、無 zod 驗證,不需要 migrate。
    }
  )
);
