import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

/**
 * Node 的 ESM 解析要求相對 import 帶副檔名,但 src/ 沿用 bundler 慣例
 * (`from "./style-tables"`)。與其為了跑測試在 src/ 到處加 `.ts` 汙染既有風格,
 * 在測試環境補上副檔名即可。
 *
 * 只處理相對路徑、且對應的 .ts 檔存在時才改寫,其餘一律交給預設解析。
 */
export function resolve(specifier, context, next) {
  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  const hasExtension = /\.[cm]?[jt]sx?$/.test(specifier);

  if (isRelative && !hasExtension && context.parentURL) {
    for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
      const url = new URL(candidate, context.parentURL);
      if (existsSync(fileURLToPath(url))) {
        return next(candidate, context);
      }
    }
  }

  return next(specifier, context);
}
