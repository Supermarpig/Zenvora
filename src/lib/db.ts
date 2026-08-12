import { get, set, del, keys } from "idb-keyval";

export function getImageKey(frameId: string): string {
  return `image-${frameId}`;
}

export async function saveImage(frameId: string, base64: string): Promise<void> {
  await set(getImageKey(frameId), base64);
}

export async function loadImage(frameId: string): Promise<string | undefined> {
  return get<string>(getImageKey(frameId));
}

export async function deleteImage(frameId: string): Promise<void> {
  await del(getImageKey(frameId));
}

export async function getAllImageKeys(): Promise<string[]> {
  const allKeys = await keys();
  return allKeys.filter((k) => String(k).startsWith("image-")).map(String);
}

// --- 影片(以 Blob 儲存,避免 base64 膨脹)---

export function getVideoKey(frameId: string): string {
  return `video-${frameId}`;
}

export async function saveVideo(frameId: string, blob: Blob): Promise<void> {
  await set(getVideoKey(frameId), blob);
}

export async function loadVideo(frameId: string): Promise<Blob | undefined> {
  return get<Blob>(getVideoKey(frameId));
}

export async function deleteVideo(frameId: string): Promise<void> {
  await del(getVideoKey(frameId));
}

// --- 人物資產參考圖(跨專案重用,key 不綁 frameId)---

export function getAssetImageKey(assetId: string, index: number): string {
  return `asset-${assetId}-${index}`;
}

export async function saveAssetImage(
  assetId: string,
  index: number,
  base64: string
): Promise<string> {
  const key = getAssetImageKey(assetId, index);
  await set(key, base64);
  return key;
}

export async function loadAssetImage(
  key: string
): Promise<string | undefined> {
  return get<string>(key);
}

export async function deleteAssetImage(key: string): Promise<void> {
  await del(key);
}
