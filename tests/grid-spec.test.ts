import { test } from "node:test";
import assert from "node:assert/strict";
import { gridSpec } from "../src/lib/storyboard-prompt.ts";

/**
 * 直版排版算錯的後果是「整張圖生出來每格構圖都歪」,而那要生完圖才看得出來
 * (而且生圖要錢)。所以這裡把排版數學釘住。
 */

test("9 格橫版是 3×3、整張 16:9、每格 16:9", () => {
  const s = gridSpec(9, "landscape");
  assert.deepEqual([s.cols, s.rows], [3, 3]);
  assert.equal(s.imageAspect, "16:9");
  assert.equal(s.panelAspect, "16:9");
});

test("9 格直版是 3×3、整張 9:16、每格 9:16", () => {
  const s = gridSpec(9, "portrait");
  assert.deepEqual([s.cols, s.rows], [3, 3]);
  assert.equal(s.imageAspect, "9:16");
  assert.equal(s.panelAspect, "9:16", "短影音要的就是這個");
});

test("4 格是 2×2,兩種方向都保持整張比例", () => {
  assert.deepEqual(
    [gridSpec(4, "landscape").cols, gridSpec(4, "landscape").rows],
    [2, 2]
  );
  assert.equal(gridSpec(4, "landscape").panelAspect, "16:9");
  assert.equal(gridSpec(4, "portrait").panelAspect, "9:16");
});

test("6 格依方向換排版:橫版 3×2、直版 2×3", () => {
  const l = gridSpec(6, "landscape");
  const p = gridSpec(6, "portrait");
  assert.deepEqual([l.cols, l.rows], [3, 2]);
  assert.deepEqual([p.cols, p.rows], [2, 3]);
});

test("6 格的每格不是 16:9,而是接近正方的 6:5 / 5:6", () => {
  // 16:9 分成 3×2,每格 (16/3):(9/2) ≈ 1.19 —— 若沿用整張比例會讓構圖全歪
  assert.equal(gridSpec(6, "landscape").panelAspect, "6:5");
  assert.equal(gridSpec(6, "portrait").panelAspect, "5:6");
});

test("25 格是 5×5(先前 prompt 寫死 3×3 與此矛盾)", () => {
  const s = gridSpec(25, "landscape");
  assert.deepEqual([s.cols, s.rows], [5, 5]);
  assert.equal(s.cols * s.rows, 25);
});

test("每種格數的 cols×rows 都等於格數", () => {
  for (const size of [4, 6, 9, 25] as const) {
    for (const o of ["landscape", "portrait"] as const) {
      const s = gridSpec(size, o);
      assert.equal(s.cols * s.rows, size, `${size} 格 ${o} 排版不符`);
    }
  }
});

test("預設方向是橫版(向後相容)", () => {
  assert.deepEqual(gridSpec(9), gridSpec(9, "landscape"));
});
