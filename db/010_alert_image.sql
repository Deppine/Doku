-- รูป/GIF ประกอบแจ้งเตือน (แสดงเหนือข้อความในแบบตัวอักษรกลางจอ)
-- alert_image_path: ไฟล์ที่อัปโหลด (db:<id>.<ext> หรือ path บนดิสก์) · size: s/m/l · anim: pop/rise/zoom
-- alert_sticker: สติกเกอร์โดกูจากคลัง (id ใน src/lib/stickers.ts หรือ random) · มีค่า = ใช้แทนรูปที่อัปโหลด
ALTER TABLE `alert_settings` ADD COLUMN `alert_image_path` VARCHAR(255) NULL DEFAULT NULL;
ALTER TABLE `alert_settings` ADD COLUMN `alert_image_size` VARCHAR(2) NOT NULL DEFAULT 'm';
ALTER TABLE `alert_settings` ADD COLUMN `alert_image_anim` VARCHAR(8) NOT NULL DEFAULT 'pop';
ALTER TABLE `alert_settings` ADD COLUMN `alert_sticker` VARCHAR(10) NULL DEFAULT NULL;
