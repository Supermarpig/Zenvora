import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface VideoJob {
  frameId: string;
  providerId: string;
  providerJobId: string;
  model: string;
  status: "running" | "succeeded" | "failed";
  error?: string;
  createdAt: string;
}

interface JobState {
  jobs: Record<string, VideoJob>; // key = frameId
  getJob: (frameId: string) => VideoJob | undefined;
  startJob: (job: Omit<VideoJob, "status" | "createdAt">) => void;
  setJobStatus: (
    frameId: string,
    status: VideoJob["status"],
    error?: string
  ) => void;
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
            [job.frameId]: {
              ...job,
              status: "running",
              createdAt: new Date().toISOString(),
            },
          },
        }));
      },

      setJobStatus: (frameId, status, error) => {
        set((state) => {
          const existing = state.jobs[frameId];
          if (!existing) return state;
          return {
            jobs: {
              ...state.jobs,
              [frameId]: { ...existing, status, error },
            },
          };
        });
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
    }
  )
);
