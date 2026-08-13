import { test } from "node:test";
import assert from "node:assert/strict";
import { createZip } from "../src/lib/zip.ts";

/**
 * zip.ts 手寫 ZIP 二進位格式(local header / central directory / EOCD / CRC32)。
 * 一個位移算錯就產生壞檔,而且會壞在使用者的剪映裡才被發現 —— 所以這裡直接
 * 解析產出的位元組驗證結構,而不是只檢查「有沒有丟出錯誤」。
 */

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
const FLAG_UTF8 = 0x0800;

async function bytesOf(entries: { name: string; data: Uint8Array<ArrayBuffer> }[]) {
  const blob = createZip(entries);
  return new Uint8Array(await blob.arrayBuffer());
}

const enc = (s: string) => new TextEncoder().encode(s) as Uint8Array<ArrayBuffer>;

test("開頭是 local file header signature", async () => {
  const b = await bytesOf([{ name: "a.txt", data: enc("hello") }]);
  assert.equal(new DataView(b.buffer).getUint32(0, true), LOCAL_SIG);
});

test("EOCD 記錄的項目數與 central directory 位移正確", async () => {
  const entries = [
    { name: "a.txt", data: enc("aaa") },
    { name: "b/c.txt", data: enc("bbbb") },
    { name: "d.bin", data: new Uint8Array([1, 2, 3]) as Uint8Array<ArrayBuffer> },
  ];
  const b = await bytesOf(entries);
  const dv = new DataView(b.buffer);

  // EOCD 是最後 22 bytes(沒有 comment)
  const eocd = b.length - 22;
  assert.equal(dv.getUint32(eocd, true), EOCD_SIG, "EOCD signature");
  assert.equal(dv.getUint16(eocd + 8, true), entries.length, "本磁碟項目數");
  assert.equal(dv.getUint16(eocd + 10, true), entries.length, "總項目數");

  const cdSize = dv.getUint32(eocd + 12, true);
  const cdOffset = dv.getUint32(eocd + 16, true);
  assert.equal(dv.getUint32(cdOffset, true), CENTRAL_SIG, "cdOffset 指向 central directory");
  assert.equal(cdOffset + cdSize, eocd, "central directory 尾端應緊接 EOCD");
});

test("store 模式:compression method 為 0,且壓縮前後大小相同", async () => {
  const data = enc("some content that would compress well aaaaaaaaaaaa");
  const b = await bytesOf([{ name: "x.txt", data }]);
  const dv = new DataView(b.buffer);

  assert.equal(dv.getUint16(8, true), 0, "compression method 必須是 0(store)");
  assert.equal(dv.getUint32(18, true), data.length, "compressed size");
  assert.equal(dv.getUint32(22, true), data.length, "uncompressed size");
});

test("檔名帶 UTF-8 flag,中文檔名可原樣讀回", async () => {
  const name = "使用說明.txt";
  const b = await bytesOf([{ name, data: enc("內容") }]);
  const dv = new DataView(b.buffer);

  assert.equal(dv.getUint16(6, true) & FLAG_UTF8, FLAG_UTF8, "general purpose bit 11");

  const nameLen = dv.getUint16(26, true);
  const readName = new TextDecoder().decode(b.subarray(30, 30 + nameLen));
  assert.equal(readName, name);
});

test("CRC32 與 zlib 的實作一致", async () => {
  const { crc32 } = await import("node:zlib");
  const payload = enc("The quick brown fox jumps over the lazy dog");
  const b = await bytesOf([{ name: "f.txt", data: payload }]);
  const dv = new DataView(b.buffer);

  // node:zlib 的 crc32 是權威對照(Node 20.15+ / 22+)
  assert.equal(dv.getUint32(14, true), crc32(Buffer.from(payload)));
});

test("round-trip:依 central directory 解析回原始內容", async () => {
  const files = [
    { name: "timeline.json", data: enc('{"a":1}') },
    { name: "assets/001.mp4", data: new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]) as Uint8Array<ArrayBuffer> },
    { name: "中文/檔名.txt", data: enc("中文內容測試") },
  ];
  const b = await bytesOf(files);
  const dv = new DataView(b.buffer);
  const eocd = b.length - 22;
  let cursor = dv.getUint32(eocd + 16, true);

  const recovered: Record<string, Uint8Array> = {};
  for (let i = 0; i < files.length; i++) {
    assert.equal(dv.getUint32(cursor, true), CENTRAL_SIG);
    const size = dv.getUint32(cursor + 24, true);
    const nameLen = dv.getUint16(cursor + 28, true);
    const localOffset = dv.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(b.subarray(cursor + 46, cursor + 46 + nameLen));

    // 從 local header 跳過 30 bytes 固定欄位 + 檔名長度,取出資料
    const localNameLen = dv.getUint16(localOffset + 26, true);
    const dataStart = localOffset + 30 + localNameLen;
    recovered[name] = b.subarray(dataStart, dataStart + size);

    cursor += 46 + nameLen;
  }

  for (const f of files) {
    assert.deepEqual(
      Array.from(recovered[f.name] ?? []),
      Array.from(f.data),
      `內容應可完整還原:${f.name}`
    );
  }
});

test("空清單也產生合法(空的)zip", async () => {
  const b = await bytesOf([]);
  const dv = new DataView(b.buffer);
  assert.equal(b.length, 22, "只有 EOCD");
  assert.equal(dv.getUint32(0, true), EOCD_SIG);
  assert.equal(dv.getUint16(10, true), 0, "0 個項目");
});

test("readZip 能讀回 createZip 產生的內容(含中文檔名與二進位)", async () => {
  const { readZip } = await import("../src/lib/zip.ts");
  const files = [
    { name: "snapshot.json", data: enc('{"version":1}') },
    { name: "media/使用說明.txt", data: enc("中文內容") },
    { name: "media/001.mp4", data: new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]) as Uint8Array<ArrayBuffer> },
  ];
  const entries = await readZip(createZip(files));

  assert.equal(entries.length, files.length);
  for (const f of files) {
    const got = entries.find((e) => e.name === f.name);
    assert.ok(got, `應讀回 ${f.name}`);
    assert.deepEqual(Array.from(got!.data), Array.from(f.data));
  }
});

test("readZip 對空 zip 回空陣列", async () => {
  const { readZip } = await import("../src/lib/zip.ts");
  assert.deepEqual(await readZip(createZip([])), []);
});

test("readZip 對非 zip 檔明確報錯", async () => {
  const { readZip } = await import("../src/lib/zip.ts");
  await assert.rejects(
    () => readZip(new Blob([enc("this is not a zip file at all")])),
    /EOCD|zip/
  );
});
