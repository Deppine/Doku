import { currentUser } from "@/lib/auth";
import { NavBarClient } from "./NavBarClient";

/** แถบเมนู: อ่านสถานะล็อกอินฝั่งเซิร์ฟเวอร์ แล้วส่งให้ส่วนที่โต้ตอบได้ */
export async function NavBar() {
  const user = await currentUser().catch(() => null); // ฐานข้อมูลล่มก็ยังแสดงเมนูได้
  return (
    <NavBarClient
      user={user ? { username: user.username, displayName: user.displayName, role: user.role } : null}
    />
  );
}
