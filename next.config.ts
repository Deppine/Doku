import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ปิดปุ่ม "N" ของ Next.js Dev Tools (กันโผล่ใน widget บน OBS ตอนรัน npm run dev)
  devIndicators: false,
  // ไลบรารีอ่านสลิปใช้ worker/ไฟล์ภาษาและ native binary ห้าม bundle
  serverExternalPackages: ["tesseract.js", "sharp", "mysql2"],
  // OBS โหลด widget ผ่าน browser source — ห้าม cache stream
  async headers() {
    return [
      {
        source: "/api/widget/stream",
        headers: [{ key: "Cache-Control", value: "no-cache, no-transform" }],
      },
    ];
  },
};

export default nextConfig;
