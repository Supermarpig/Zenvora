"use client";

import { useSyncExternalStore } from "react";
import { useProjectStore } from "@/stores/use-project-store";

const subscribe = (onStoreChange: () => void) =>
  useProjectStore.persist.onFinishHydration(onStoreChange);

const getSnapshot = () => useProjectStore.persist.hasHydrated();

/** SSR 期間一律視為未 hydrate,避免 server/client 首次 render 不一致 */
const getServerSnapshot = () => false;

/**
 * zustand persist 的 rehydration 是異步的 —— 首次 render 時 store 還是空的。
 *
 * 在那個時機判斷「找不到專案」會誤判成 404,結果是**直接開專案 URL 一定失敗**,
 * 只有從首頁點連結(client 端導航)才進得去 —— 也就是使用者無法把專案網址
 * 存成書籤或分享給別人。
 *
 * 所以頁面必須等 hydration 完成,才有資格說「這個專案不存在」。
 *
 * 用 useSyncExternalStore 而非 useState + useEffect:後者若 hydration 在兩者
 * 之間完成就會漏掉事件,而且在 effect 內同步 setState 會觸發 cascading render。
 */
export function useProjectStoreHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
