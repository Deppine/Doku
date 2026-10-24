/** หน้า widget สำหรับ OBS: พื้นหลังโปร่งใส */
export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html,body{background:transparent!important;overflow:hidden}`}</style>
      {children}
    </>
  );
}
