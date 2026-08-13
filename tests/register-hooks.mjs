import { register } from "node:module";

// 讓 tests 能 import 沿用 bundler 慣例(無副檔名)的 src/ 模組
register("./ts-resolve-hook.mjs", import.meta.url);
