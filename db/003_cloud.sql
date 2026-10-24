-- ตารางสำหรับรันบนหลายเครื่อง/serverless (Vercel) — รันหลัง 002_alert_settings.sql

-- คิวแจ้งเตือนไป widget (แทน event bus ในหน่วยความจำ) widget จะดึงรายการที่ id มากกว่าที่เคยเห็น
CREATE TABLE IF NOT EXISTS `widget_events`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `kind` VARCHAR(20) NOT NULL,                              -- alert / settings / reload
    `payload` JSON NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `widget_events_user_id_index`(`user_id`, `id`),
    KEY `widget_events_created_at_index`(`created_at`)
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ไฟล์ที่อัปโหลด (สลิป / เสียงแจ้งเตือน) เก็บในฐานข้อมูลแทนดิสก์
CREATE TABLE IF NOT EXISTS `stored_files`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `kind` VARCHAR(10) NOT NULL,                              -- slip / sound
    `mime` VARCHAR(100) NOT NULL,
    `size` INT UNSIGNED NOT NULL,
    `data` MEDIUMBLOB NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- นับครั้งกันเดารหัสผ่าน / สมัครรัว ใช้ร่วมกันทุกเครื่อง
CREATE TABLE IF NOT EXISTS `rate_limits`(
    `k` VARCHAR(191) NOT NULL PRIMARY KEY,
    `n` INT UNSIGNED NOT NULL DEFAULT 0,
    `until_ms` BIGINT UNSIGNED NOT NULL
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- เวลาล่าสุดที่ widget ใน OBS ต่ออยู่ (ใช้บอกว่า "ออนไลน์" ตอนกดทดสอบ)
ALTER TABLE `users` ADD COLUMN `widget_seen_at` TIMESTAMP NULL DEFAULT NULL;
