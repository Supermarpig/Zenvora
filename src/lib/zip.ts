/**
 * 極簡 ZIP 打包(store 模式,不做壓縮)。
 *
 * 為什麼不壓縮:打包內容是 mp4 / png,本身已是壓縮格式,再 deflate 幾乎沒有效益,
 * 因此省下引入壓縮套件的成本。若日後需要壓縮大量純文字,再考慮換方案。
 *
 * 限制:不支援 zip64,單一壓縮包上限 4GB。短影音素材不會踩到。
 */

export interface ZipEntry {
  /** zip 內的相對路徑,例如 "assets/001.mp4" */
  name: string;
  /** 明確標註 ArrayBuffer,Blob 建構子不接受 SharedArrayBuffer 版本 */
  data: Uint8Array<ArrayBuffer>;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** ZIP 沿用 DOS 時間格式(秒數精度為 2 秒) */
function dosDateTime(d: Date): { time: number; date: number } {
  const time =
    (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date =
    ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const EOCD_SIZE = 22;
/** general purpose bit 11:檔名為 UTF-8,中文檔名才不會亂碼 */
const FLAG_UTF8 = 0x0800;

export function createZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(new Date());

  const localParts: Uint8Array<ArrayBuffer>[] = [];
  const centralParts: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(LOCAL_HEADER_SIZE + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // local file header signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, FLAG_UTF8, true);
    lv.setUint16(8, 0, true); // 0 = store
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true); // compressed size
    lv.setUint32(22, size, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra field length
    local.set(nameBytes, LOCAL_HEADER_SIZE);
    localParts.push(local, entry.data);

    const central = new Uint8Array(CENTRAL_HEADER_SIZE + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); // central directory signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, FLAG_UTF8, true);
    cv.setUint16(10, 0, true); // store
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true); // extra
    cv.setUint16(32, 0, true); // comment
    cv.setUint16(34, 0, true); // disk number start
    cv.setUint16(36, 0, true); // internal attributes
    cv.setUint32(38, 0, true); // external attributes
    cv.setUint32(42, offset, true); // local header 位移
    central.set(nameBytes, CENTRAL_HEADER_SIZE);
    centralParts.push(central);

    offset += local.length + size;
  }

  const centralSize = centralParts.reduce((n, part) => n + part.length, 0);

  const eocd = new Uint8Array(EOCD_SIZE);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // end of central directory signature
  ev.setUint16(8, entries.length, true); // 本磁碟項目數
  ev.setUint16(10, entries.length, true); // 總項目數
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true); // central directory 起始位移

  return new Blob([...localParts, ...centralParts, eocd], {
    type: "application/zip",
  });
}

// --- 讀取 ---

const EOCD_MIN_SIZE = 22;
/** EOCD 可能帶 comment,要從尾端往前找 signature */
const MAX_EOCD_SEARCH = EOCD_MIN_SIZE + 0xffff;

/**
 * 解析 store 模式的 ZIP。
 *
 * 刻意只支援 compression method 0 —— 本專案產生的備份一律是 store 模式
 * (內容多為已壓縮的 mp4/png)。遇到 deflate 就明確報錯,而不是回傳壞資料
 * 讓使用者以為匯入成功。
 */
export async function readZip(blob: Blob): Promise<ZipEntry[]> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length < EOCD_MIN_SIZE) throw new Error("檔案太小,不是合法的 zip");

  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let eocd = -1;
  const searchFrom = Math.max(0, bytes.length - MAX_EOCD_SEARCH);
  for (let i = bytes.length - EOCD_MIN_SIZE; i >= searchFrom; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("找不到 zip 結構(EOCD),檔案可能損毀");

  const count = dv.getUint16(eocd + 10, true);
  let cursor = dv.getUint32(eocd + 16, true);

  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];

  for (let i = 0; i < count; i++) {
    if (dv.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error("zip central directory 結構異常");
    }
    const method = dv.getUint16(cursor + 10, true);
    const size = dv.getUint32(cursor + 24, true);
    const nameLen = dv.getUint16(cursor + 28, true);
    const extraLen = dv.getUint16(cursor + 30, true);
    const commentLen = dv.getUint16(cursor + 32, true);
    const localOffset = dv.getUint32(cursor + 42, true);
    const name = decoder.decode(
      bytes.subarray(cursor + 46, cursor + 46 + nameLen)
    );

    if (method !== 0) {
      throw new Error(`${name} 使用了壓縮(method ${method}),此匯入只支援未壓縮的備份`);
    }

    // local header 的檔名長度可能與 central 不同,要各自讀
    const localNameLen = dv.getUint16(localOffset + 26, true);
    const localExtraLen = dv.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    if (dataStart + size > bytes.length) {
      throw new Error(`${name} 的資料超出檔案範圍`);
    }

    entries.push({
      name,
      data: bytes.slice(dataStart, dataStart + size) as Uint8Array<ArrayBuffer>,
    });

    cursor += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}
