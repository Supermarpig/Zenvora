import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // i2v 生影片會把起始圖(甚至結束幀)的 data URL 經 server action 送出,
      // 單張 1024×576 PNG 就 ~1.4MB,超過 Next 預設的 1MB。放寬到 12MB
      // 讓關鍵幀 + 結束幀都能過(本地工具,無公網暴露疑慮)。
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
