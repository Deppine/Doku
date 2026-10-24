import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { AlertDemo } from "@/components/AlertDemo";
import { getStreamers } from "@/lib/streamers";


const facts = [
  {
    title: "เงินเข้าบัญชีคุณทันที",
    body: "ผู้ชมสแกน QR พร้อมเพย์ที่มียอดเงินในตัว เงินโอนตรงเข้าบัญชีของคุณ ไม่ต้องรอรอบถอน",
  },
  {
    title: "ตรวจสลิปให้อัตโนมัติ",
    body: "ระบบเช็คยอด ผู้รับ และสลิปซ้ำให้ทุกรายการ ก่อนขึ้นจอ ไม่ต้องนั่งเปิดแอปธนาคารดูเอง",
  },
  {
    title: "วางลง OBS ได้ในลิงก์เดียว",
    body: "คัดลอกลิงก์วิดเจ็ตไปใส่เป็น Browser Source แจ้งเตือนจะเด้งพร้อมเสียงและอ่านข้อความให้",
  },
];

const steps = [
  "ผู้ชมกรอกชื่อ ข้อความ และยอดเงินในหน้าโดเนทของคุณ",
  "สแกน QR พร้อมเพย์ด้วยแอปธนาคารไหนก็ได้ แล้วแนบสลิป",
  "ระบบตรวจสลิป แล้วแจ้งเตือนขึ้นจอไลฟ์ภายในไม่กี่วินาที",
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const demo = (await getStreamers())[0];
  return (
    <>
      <NavBar />
      <main>
        {/* พื้นหลังหัวหน้า: ไฟแดงเรือง ๆ + จุดพิกเซลแบบจอ LED ค่อย ๆ จางออก */}
        <div className="relative isolate overflow-hidden">
          <div aria-hidden className="hero-bg">
            <div className="hero-glow" />
            <div className="hero-pixels" />
          </div>
        <section className="mx-auto max-w-[980px] px-4 pb-20 pt-20 text-center sm:pt-28">
          <h1 className="display mx-auto max-w-[16ch] text-[clamp(44px,8vw,88px)] [text-wrap:balance]">
            {/* แบ่งคำเอง กันเบราว์เซอร์ตัดคำไทยกลางคำ เช่น "พร้อม|เพย์" */}
            <span className="whitespace-nowrap">โดเนทขึ้นจอ</span> <span className="whitespace-nowrap">เงินเข้า</span>
            <wbr />
            <span className="whitespace-nowrap">พร้อมเพย์</span>
            <wbr />
            <span className="whitespace-nowrap">คุณโดยตรง</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[52ch] text-[clamp(19px,2.2vw,24px)] leading-snug text-ink-2">
            หน้ารับเงินสำหรับสตรีมเมอร์ ไม่หักค่าธรรมเนียม ไม่ต้องรอถอนเงิน
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href={demo ? `/${demo.username}` : "/streamers"} className="btn-primary">
              ลองโดเนท
            </Link>
            <Link href="/dashboard" className="btn-quiet">
              ตั้งค่าวิดเจ็ต OBS
            </Link>
          </div>

          {/* จอไลฟ์จำลอง: ให้เห็นของจริงที่ผู้ชมจะได้เห็น */}
          {/* พื้นหลังมืดแทนฉากเกม เพื่อให้เห็นแจ้งเตือนแบบเดียวกับใน OBS */}
          <div className="@container relative mx-auto mt-14 aspect-video max-w-[640px] overflow-hidden rounded-[24px] bg-[#15171c] shadow-[0_40px_100px_-30px_rgb(225_6_0/0.45),0_0_0_1px_rgb(255_255_255/0.06)]">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(90%_70%_at_20%_110%,#3a1d2a_0%,transparent_60%),radial-gradient(80%_70%_at_90%_-10%,#1d2a44_0%,transparent_60%)]"
            />
            <div className="absolute inset-0 flex items-center justify-center pb-[4%]">
              <AlertDemo />
            </div>
            <p className="absolute bottom-4 left-0 right-0 text-[12px] text-white/45">ตัวอย่างแจ้งเตือนบนจอไลฟ์</p>
          </div>
        </section>
        </div>

        <section className="bg-paper">
          <div className="mx-auto grid max-w-[980px] gap-10 px-4 py-20 sm:grid-cols-3 sm:gap-8">
            {facts.map((f) => (
              <div key={f.title}>
                <h2 className="text-[24px] font-semibold leading-tight tracking-tight">{f.title}</h2>
                <p className="mt-3 text-[17px] text-ink-2">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[980px] px-4 py-24">
          <h2 className="display max-w-[16ch] text-[clamp(32px,5vw,56px)]">สามขั้นตอนจากผู้ชมถึงหน้าจอ</h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s} className="border-t-2 border-red pt-5">
                <span className="amount text-[40px] text-red">{i + 1}</span>
                <p className="mt-3 text-[19px] leading-snug">{s}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <Footer />
    </>
  );
}
