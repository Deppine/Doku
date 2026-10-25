-- หน้าแดชบอร์ดผู้ดูแล (รันหลัง 006_tts_usage.sql)
-- เวลาที่ใช้อ่านสลิปแต่ละใบ (ใช้แสดงค่าเฉลี่ย)
ALTER TABLE `payment_slips` ADD COLUMN `check_ms` INT UNSIGNED NULL;
-- ล็อกอินล่าสุดของแต่ละบัญชี
ALTER TABLE `users` ADD COLUMN `last_login_at` TIMESTAMP NULL DEFAULT NULL;
-- ค่าตั้งของระบบที่ผู้ดูแลเปลี่ยนจากหน้าเว็บได้ (เช่น เปิด/ปิดรับสมัคร)
CREATE TABLE IF NOT EXISTS `app_settings`(
    `k` VARCHAR(50) NOT NULL PRIMARY KEY,
    `v` VARCHAR(255) NOT NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
