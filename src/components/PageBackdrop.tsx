/**
 * พื้นหลังชุดเดียวกับหน้าแรก: แสงแดงเรืองด้านบน + จุด LED ค่อย ๆ จางลงตามความยาวหน้า
 * วางเป็นลูกตัวแรกของ <main className="relative isolate overflow-hidden ...">
 */
export function PageBackdrop() {
  return (
    <div aria-hidden className="hero-bg hero-bg--page">
      <div className="hero-glow" />
      <div className="hero-pixels" />
    </div>
  );
}
