/**
 * 火山引擎(Volcengine)Volc4 請求簽名 —— AWS SigV4 衍生版,基於 HMAC-SHA256。
 * 即夢(Jimeng VGFM)CV 官方 API 需要此簽名。Seedance 2.0 走火山方舟,
 * 用的是 Bearer API key 不是這套簽章 —— 見 seedance-provider.ts 檔頭。
 *
 * 演算法參考官方文件:https://www.volcengine.com/docs/6369/67269
 * 移植自開源專案 wind-comic(MIT, © 2026 ChrisChen667788),為本專案介面調整。
 * https://github.com/ChrisChen667788/wind-comic
 *
 * 簽名流程:
 *   1. CanonicalRequest
 *   2. StringToSign(含 CredentialScope)
 *   3. 逐級派生簽名金鑰 kDate→kRegion→kService→kSigning
 *   4. HMAC-SHA256 得 Signature
 *   5. 組 Authorization header
 *
 * 環境變數:JIMENG_AK / JIMENG_SK / JIMENG_REGION(預設 cn-north-1)/ JIMENG_SERVICE(預設 cv)
 */

import { createHash, createHmac } from "crypto";

export interface SignRequestInput {
  method: string;
  host: string;
  path: string;
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  body?: string;
  accessKey: string;
  secretKey: string;
  region?: string;
  service?: string;
  timestamp?: Date;
}

export interface SignRequestOutput {
  authorization: string;
  headers: Record<string, string>;
  xDate: string;
  date: string;
}

const ALGORITHM = "HMAC-SHA256";

function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmacBuf(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function hmacHex(key: string | Buffer, data: string): string {
  return createHmac("sha256", key).update(data).digest("hex");
}

/** Volc4 URL encode(RFC 3986,保留 ~,空白→%20) */
function volcEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%7E/g, "~");
}

function buildCanonicalQueryString(
  query?: Record<string, string | number | undefined>
): string {
  if (!query) return "";
  return Object.keys(query)
    .sort()
    .filter((k) => query[k] !== undefined && query[k] !== null)
    .map((k) => `${volcEncode(k)}=${volcEncode(String(query[k]))}`)
    .join("&");
}

function buildCanonicalHeaders(headers: Record<string, string>): {
  canonicalHeaders: string;
  signedHeaders: string;
} {
  const lowered: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    lowered[k.toLowerCase()] = String(v).trim().replace(/\s+/g, " ");
  }
  const sortedKeys = Object.keys(lowered).sort();
  const canonicalHeaders =
    sortedKeys.map((k) => `${k}:${lowered[k]}`).join("\n") + "\n";
  return { canonicalHeaders, signedHeaders: sortedKeys.join(";") };
}

function formatDate(d: Date): { date: string; xDate: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(
    d.getUTCDate()
  )}`;
  const xDate = `${date}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(
    d.getUTCSeconds()
  )}Z`;
  return { date, xDate };
}

function deriveSigningKey(
  secretKey: string,
  date: string,
  region: string,
  service: string
): Buffer {
  const kDate = hmacBuf(secretKey, date);
  const kRegion = hmacBuf(kDate, region);
  const kService = hmacBuf(kRegion, service);
  return hmacBuf(kService, "request");
}

/** 對一次 HTTP 請求生成完整簽名 */
export function signRequest(input: SignRequestInput): SignRequestOutput {
  const {
    method,
    host,
    path,
    query,
    body = "",
    accessKey,
    secretKey,
    region = "cn-north-1",
    service = "cv",
  } = input;

  const { date, xDate } = formatDate(input.timestamp ?? new Date());

  const payloadHash = sha256Hex(body);
  const mergedHeaders: Record<string, string> = {
    ...(input.headers ?? {}),
    host,
    "x-date": xDate,
    "x-content-sha256": payloadHash,
  };

  const { canonicalHeaders, signedHeaders } =
    buildCanonicalHeaders(mergedHeaders);

  const canonicalRequest = [
    method.toUpperCase(),
    path,
    buildCanonicalQueryString(query),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${date}/${region}/${service}/request`;
  const stringToSign = [
    ALGORITHM,
    xDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = deriveSigningKey(secretKey, date, region, service);
  const signature = hmacHex(signingKey, stringToSign);

  const authorization =
    `${ALGORITHM} Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    authorization,
    headers: { ...mergedHeaders, authorization },
    xDate,
    date,
  };
}

export function getJimengCredentials() {
  return {
    accessKey: process.env.JIMENG_AK || "",
    secretKey: process.env.JIMENG_SK || "",
    region: process.env.JIMENG_REGION || "cn-north-1",
    service: process.env.JIMENG_SERVICE || "cv",
  };
}

export function hasJimengCredentials(): boolean {
  const { accessKey, secretKey } = getJimengCredentials();
  return !!(accessKey && secretKey && !accessKey.startsWith("your_"));
}
