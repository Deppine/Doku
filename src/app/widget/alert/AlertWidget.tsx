"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCard, type AlertData } from "@/components/AlertCard";
import { AlertClassic } from "@/components/AlertClassic";
import { DEFAULT_SOUND, playAlert, setAudioLogger, type AlertSoundSettings } from "@/lib/alert-sound";

type Incoming = AlertData & { id: string; test?: boolean };

const SHOW_MS = 7000; // แสดงค้างต่อ 1 รายการ
const GAP_MS = 800; // เว้นระยะระหว่างรายการ

export function AlertWidget({ token, tts, variant, debug = false }: { token: string; tts: boolean; variant: "classic" | "card"; debug?: boolean }) {
  // ?debug=1: แสดงบันทึกการทำงานบนจอ ใช้หาว่าเสียง/การเชื่อมต่อติดตรงไหน
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = useRef((msg: string) => {});
  addLog.current = (msg: string) => {
    if (!debug) return;
    const t = new Date().toLocaleTimeString("th-TH", { hour12: false });
    setLogs((l) => [...l.slice(-11), `${t} ${msg}`]);
  };
  useEffect(() => {
    if (!debug) return;
    setAudioLogger((m) => addLog.current(m));
    const a = document.createElement("audio");
    addLog.current(`เริ่มวิดเจ็ต · mp3: ${a.canPlayType("audio/mpeg") || "ไม่รองรับ"} · ${navigator.userAgent.match(/(Chrome|OBS|Streamlabs)[/\w. ]*/g)?.join(" ") ?? ""}`);
    return () => setAudioLogger(null);
  }, [debug]);

  const [current, setCurrent] = useState<Incoming | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [status, setStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [showStatus, setShowStatus] = useState(true);
  const queue = useRef<Incoming[]>([]);
  const playing = useRef(false);
  const sound = useRef<AlertSoundSettings>(DEFAULT_SOUND);

  useEffect(() => {
    if (!token) {
      setStatus("offline");
      return;
    }
    const es = new EventSource(`/api/widget/stream?token=${encodeURIComponent(token)}`);
    let first = true;
    let offlineTimer: ReturnType<typeof setTimeout> | undefined;
    es.addEventListener("ready", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      if (data.sound) sound.current = data.sound;
      addLog.current(`เชื่อมต่อแล้ว · เสียงอ่าน: ${data.sound?.ttsServerUrl && data.sound?.ttsEngine !== "browser" ? "เซิร์ฟเวอร์" : "ในเครื่อง"} · tts=${tts ? "เปิด" : "ปิด"}`);
      clearTimeout(offlineTimer);
      setStatus("online");
      // เซิร์ฟเวอร์ตัดการเชื่อมต่อเป็นรอบ ๆ แล้วต่อใหม่เอง — โชว์ป้ายเฉพาะครั้งแรก
      if (first) {
        first = false;
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 4000);
      } else setShowStatus(false);
    });
    // ตั้งค่าเสียงในแดชบอร์ดแล้วมีผลทันที ไม่ต้องรีเฟรช OBS
    es.addEventListener("settings", (e) => {
      sound.current = JSON.parse((e as MessageEvent).data);
      addLog.current("ได้รับการตั้งค่าเสียงใหม่");
    });
    es.addEventListener("alert", (e) => {
      queue.current.push(JSON.parse((e as MessageEvent).data));
      addLog.current("ได้รับแจ้งเตือน");
      playNext();
    });
    // EventSource ต่อใหม่เองอัตโนมัติ ถ้าต่อไม่ติดเกิน 8 วินาทีค่อยโชว์ว่าหลุด
    es.onerror = () => {
      addLog.current("การเชื่อมต่อสะดุด กำลังต่อใหม่");
      clearTimeout(offlineTimer);
      offlineTimer = setTimeout(() => {
        setStatus("offline");
        setShowStatus(true);
      }, first ? 0 : 8000);
    };
    return () => {
      clearTimeout(offlineTimer);
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function playNext() {
    if (playing.current) return;
    const next = queue.current.shift();
    if (!next) return;
    playing.current = true;
    setLeaving(false);
    setCurrent(next);
    playAlert(sound.current, next, tts);

    setTimeout(() => setLeaving(true), SHOW_MS);
    setTimeout(() => {
      setCurrent(null);
      playing.current = false;
      setTimeout(playNext, GAP_MS);
    }, SHOW_MS + 360);
  }

  return (
    <main className={`flex min-h-dvh items-start justify-center ${variant === "classic" ? "pt-[6vh]" : "pt-10"}`}>
      {current &&
        (variant === "classic" ? (
          <AlertClassic key={current.id} data={current} className={leaving ? "pop-out" : "pop-in"} />
        ) : (
          <AlertCard key={current.id} data={current} className={leaving ? "alert-out" : "alert-in"} />
        ))}
      {showStatus && !current && (
        <p
          className={`fixed bottom-4 left-4 rounded-full px-3 py-1.5 text-[13px] font-medium text-white ${
            status === "online" ? "bg-[#1f9d55]" : status === "connecting" ? "bg-ink-3" : "bg-red"
          }`}
        >
          {status === "online" ? "วิดเจ็ตเชื่อมต่อแล้ว" : status === "connecting" ? "กำลังเชื่อมต่อ…" : "เชื่อมต่อไม่ได้ ตรวจลิงก์วิดเจ็ต"}
        </p>
      )}
      {debug && (
        <pre className="fixed right-2 top-2 max-w-[60vw] whitespace-pre-wrap rounded-lg bg-black/80 p-2 text-[12px] leading-snug text-[#9effa1]">
          {logs.join("\n") || "debug: รอเหตุการณ์…"}
        </pre>
      )}
    </main>
  );
}
