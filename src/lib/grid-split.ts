/**
 * 把一張合成的宮格圖切成單格圖片,順序為左上 → 右下。
 *
 * 用途:讓 AI 一次生成一張九宮格分鏡圖,切開後依序填入各分鏡 —— 一次生圖的
 * 成本換到 9 格畫面。純前端 Canvas,不經過任何 API。
 */

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("圖片讀取失敗"));
    img.src = src;
  });
}

export async function splitGrid(
  dataUrl: string,
  cols: number,
  rows: number
): Promise<string[]> {
  const img = await loadImageElement(dataUrl);

  // 用 floor 取整,寧可邊緣少一兩個 pixel,也不要讓最後一格取到界外
  const cellWidth = Math.floor(img.naturalWidth / cols);
  const cellHeight = Math.floor(img.naturalHeight / rows);
  if (cellWidth < 1 || cellHeight < 1) {
    throw new Error("圖片太小,無法切成宮格");
  }

  const cells: string[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const canvas = document.createElement("canvas");
      canvas.width = cellWidth;
      canvas.height = cellHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("無法取得 canvas context");

      ctx.drawImage(
        img,
        col * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight,
        0,
        0,
        cellWidth,
        cellHeight
      );
      cells.push(canvas.toDataURL("image/png"));
    }
  }

  return cells;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("檔案讀取失敗"));
    reader.readAsDataURL(file);
  });
}
