import { createZip, readZip, type ZipEntry } from "./zip";
import { snapshotSchema, type MediaManifestEntry, type Snapshot } from "./schemas";

/**
 * 備份快照的打包與解析。
 *
 * 刻意只做「純資料進、純資料出」—— 收集 store 與 IndexedDB 的內容、以及寫回,
 * 都由呼叫方負責。這樣本模組不依賴任何 store 或瀏覽器儲存,可以單元測試。
 */

const SNAPSHOT_JSON = "snapshot.json";
const MEDIA_DIR = "media/";

export interface MediaPayload {
  key: string;
  kind: "dataUrl" | "blob";
  mime: string;
  data: Uint8Array<ArrayBuffer>;
}

/** data URL → 二進位 + mime。存二進位而非原字串,base64 會膨脹 33% */
export function dataUrlToPayload(
  key: string,
  dataUrl: string
): MediaPayload | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;

  const binary = atob(match[2]);
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);

  return { key, kind: "dataUrl", mime: match[1], data };
}

/** 還原成原本存進 IndexedDB 的形態:圖片是 data URL 字串,影片是 Blob */
export function payloadToStoredValue(
  entry: MediaManifestEntry,
  data: Uint8Array<ArrayBuffer>
): string | Blob {
  if (entry.kind === "blob") {
    return new Blob([data], { type: entry.mime });
  }
  let binary = "";
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return `data:${entry.mime};base64,${btoa(binary)}`;
}

/** IndexedDB 的 key 直接當檔名 —— 現有 key 都是安全字元(image- / video- / asset-) */
function fileNameFor(key: string): string {
  return MEDIA_DIR + key;
}

export function snapshotToZip(
  snapshot: Omit<Snapshot, "mediaManifest">,
  media: MediaPayload[]
): Blob {
  const manifest: MediaManifestEntry[] = media.map((m) => ({
    key: m.key,
    file: fileNameFor(m.key),
    kind: m.kind,
    mime: m.mime,
  }));

  const full: Snapshot = { ...snapshot, mediaManifest: manifest };
  const entries: ZipEntry[] = [
    {
      name: SNAPSHOT_JSON,
      data: new TextEncoder().encode(
        JSON.stringify(full, null, 2)
      ) as Uint8Array<ArrayBuffer>,
    },
    ...media.map((m) => ({ name: fileNameFor(m.key), data: m.data })),
  ];

  return createZip(entries);
}

export interface ParsedSnapshot {
  snapshot: Snapshot;
  /** IndexedDB key → 還原後可直接寫入的值 */
  media: Map<string, string | Blob>;
}

/**
 * 解析並驗證備份。沿用「整批驗證、失敗全拒」的原則 ——
 * 半殘的還原比明確失敗糟糕得多。
 */
export async function parseSnapshotZip(file: Blob): Promise<ParsedSnapshot> {
  const entries = await readZip(file);

  const jsonEntry = entries.find((e) => e.name === SNAPSHOT_JSON);
  if (!jsonEntry) {
    throw new Error(`備份缺少 ${SNAPSHOT_JSON},這可能不是本工具產生的備份`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(jsonEntry.data));
  } catch {
    throw new Error(`${SNAPSHOT_JSON} 不是合法的 JSON`);
  }

  const parsed = snapshotSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(
      `備份格式不符:${issue.path.join(".") || "根層級"} — ${issue.message}`
    );
  }

  const byName = new Map(entries.map((e) => [e.name, e.data]));
  const media = new Map<string, string | Blob>();

  for (const item of parsed.data.mediaManifest) {
    const data = byName.get(item.file);
    // manifest 說有、zip 裡卻沒有 —— 寧可整批拒絕也不要還原出半套素材
    if (!data) throw new Error(`備份損毀:manifest 列了 ${item.file} 但檔案不存在`);
    media.set(item.key, payloadToStoredValue(item, data));
  }

  return { snapshot: parsed.data, media };
}
