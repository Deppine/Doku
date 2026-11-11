-- เลิกใช้หลอดเป้าหมายแบบ neon (แคปซูลนีออน), edge (เส้นขอบจอ), pixel (เกจพลังพิกเซล), beer (แก้วเบียร์ฟองล้น) → ย้ายไปแบบเรียบ และให้แบบเรียบเป็นค่าเริ่มต้น
ALTER TABLE `donation_goals` ALTER COLUMN `style` SET DEFAULT 'basic';
UPDATE `donation_goals` SET `style` = 'basic' WHERE `style` IN ('neon', 'edge', 'pixel', 'beer');
