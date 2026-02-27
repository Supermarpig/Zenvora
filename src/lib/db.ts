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
