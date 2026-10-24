import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ปิดปุ่ม "N" ของ Next.js Dev Tools (กันโผล่ใน widget บน OBS ตอนรัน npm run dev)
  devIndicators: false,
  // ไลบรารีอ่านสลิปใช้ worker/ไฟล์ภาษาและ native binary ห้าม bundle
  serverExternalPackages: ["tesseract.js", "sharp", "mysql2"],
  // Vercel: ไฟล์ที่ไลบรารีอ่านสลิปโหลดตอนรัน (ไฟล์ภาษา + worker + wasm) ต้องติดไปกับฟังก์ชันด้วย
  outputFileTracingIncludes: {
    "/api/donate/*/slip": [
      "./node_modules/@tesseract.js-data/eng/4.0.0_best_int/**",
      "./node_modules/tesseract.js/src/**",
      "./node_modules/tesseract.js-core/*.{js,wasm}",
      // worker ของ tesseract ถูกเปิดเป็น thread แยก Vercel จึงไม่รู้ว่าต้องแนบไลบรารีพวกนี้ (ขาด = ค้างจน 504)
      "./node_modules/bmp-js/**",
      "./node_modules/wasm-feature-detect/**",
      "./node_modules/zlibjs/**",
      "./node_modules/idb-keyval/**",
      "./node_modules/is-url/**",
      "./node_modules/node-fetch/**",
      "./node_modules/regenerator-runtime/**",
    ],
  },
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
