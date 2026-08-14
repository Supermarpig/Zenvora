import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Episode, Season } from "@/lib/schemas";

/**
 * 季 / 集。**專案之下的可選層** —— 沒建立任何季的專案行為與先前完全一致。
 *
 * 刻意獨立成一個 store 而不塞進 project store:季/集是自己的實體集合,
 * 混進專案物件裡會讓每次改集名都寫一次整個專案陣列。
 *
 * 這個 store 不碰分鏡。刪除季/集時要清掉分鏡的 `episodeId`,那要跨 store,
 * 由呼叫端(`episode-manager-dialog`)一起做 —— store 之間不互相 import,
 * 免得產生循環依賴與難追的連動。
 */
interface EpisodeState {
  seasons: Season[];
  episodes: Episode[];

  getSeasons: (projectId: string) => Season[];
  getEpisodes: (seasonId: string) => Episode[];
  /** 某專案底下的所有集(跨季,依季序再依集序) */
  getProjectEpisodes: (projectId: string) => Episode[];
  getEpisode: (id: string) => Episode | undefined;

  addSeason: (projectId: string, name: string) => Season;
  addEpisode: (seasonId: string, name: string) => Episode;
  renameSeason: (id: string, name: string) => void;
  updateEpisode: (id: string, data: Partial<Omit<Episode, "id">>) => void;
  /** 回傳被一併刪掉的集 id,呼叫端要用它清分鏡的 episodeId */
  deleteSeason: (id: string) => string[];
  deleteEpisode: (id: string) => void;
  deleteByProject: (projectId: string) => void;

  /** 備份還原用:同 id 覆蓋,不在清單內的既有資料保留不刪 */
  upsert: (seasons: Season[], episodes: Episode[]) => void;
}

export const useEpisodeStore = create<EpisodeState>()(
  persist(
    (set, get) => ({
      seasons: [],
      episodes: [],

      getSeasons: (projectId) =>
        get()
          .seasons.filter((s) => s.projectId === projectId)
          .sort((a, b) => a.order - b.order),

      getEpisodes: (seasonId) =>
        get()
          .episodes.filter((e) => e.seasonId === seasonId)
          .sort((a, b) => a.order - b.order),

      getProjectEpisodes: (projectId) => {
        const seasons = get().getSeasons(projectId);
        return seasons.flatMap((s) => get().getEpisodes(s.id));
      },

      getEpisode: (id) => get().episodes.find((e) => e.id === id),

      addSeason: (projectId, name) => {
        const season: Season = {
          id: crypto.randomUUID(),
          projectId,
          name,
          order: get().getSeasons(projectId).length,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ seasons: [...state.seasons, season] }));
        return season;
      },

      addEpisode: (seasonId, name) => {
        const episode: Episode = {
          id: crypto.randomUUID(),
          seasonId,
          name,
          order: get().getEpisodes(seasonId).length,
          synopsis: "",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ episodes: [...state.episodes, episode] }));
        return episode;
      },

      renameSeason: (id, name) => {
        set((state) => ({
          seasons: state.seasons.map((s) => (s.id === id ? { ...s, name } : s)),
        }));
      },

      updateEpisode: (id, data) => {
        set((state) => ({
          episodes: state.episodes.map((e) =>
            e.id === id ? { ...e, ...data } : e
          ),
        }));
      },

      deleteSeason: (id) => {
        const removed = get()
          .episodes.filter((e) => e.seasonId === id)
          .map((e) => e.id);
        set((state) => ({
          seasons: state.seasons.filter((s) => s.id !== id),
          episodes: state.episodes.filter((e) => e.seasonId !== id),
        }));
        return removed;
      },

      deleteEpisode: (id) => {
        set((state) => ({
          episodes: state.episodes.filter((e) => e.id !== id),
        }));
      },

      deleteByProject: (projectId) => {
        const seasonIds = new Set(
          get()
            .seasons.filter((s) => s.projectId === projectId)
            .map((s) => s.id)
        );
        if (seasonIds.size === 0) return;
        set((state) => ({
          seasons: state.seasons.filter((s) => s.projectId !== projectId),
          episodes: state.episodes.filter((e) => !seasonIds.has(e.seasonId)),
        }));
      },

      upsert: (seasons, episodes) => {
        if (seasons.length === 0 && episodes.length === 0) return;
        set((state) => {
          const s = new Map(state.seasons.map((x) => [x.id, x]));
          seasons.forEach((x) => s.set(x.id, x));
          const e = new Map(state.episodes.map((x) => [x.id, x]));
          episodes.forEach((x) => e.set(x.id, x));
          return { seasons: [...s.values()], episodes: [...e.values()] };
        });
      },
    }),
    {
      name: "frameforge-episodes",
      partialize: (state) => ({
        seasons: state.seasons,
        episodes: state.episodes,
      }),
    }
  )
);
