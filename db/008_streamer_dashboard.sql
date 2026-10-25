-- แดชบอร์ดสตรีมเมอร์แบบใหม่ (รันหลัง 007_admin_dashboard.sql)
-- รูปแบบแจ้งเตือนบนจอ: classic = ตัวอักษรกลางจอ, card = การ์ดขาว
ALTER TABLE `alert_settings` ADD COLUMN `alert_style` VARCHAR(10) NOT NULL DEFAULT 'classic';
-- เคยกดทดสอบแจ้งเตือนแล้ว (ใช้กับเช็กลิสต์เริ่มต้นใช้งาน)
ALTER TABLE `users` ADD COLUMN `alert_tested_at` TIMESTAMP NULL DEFAULT NULL;
-- เป้าหมายโดเนท: นับยอดที่ผ่านตั้งแต่ starts_at
CREATE TABLE IF NOT EXISTS `donation_goals`(
    `user_id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    `title` VARCHAR(80) NOT NULL,
    `target_amount` DECIMAL(10, 2) NOT NULL,
    `starts_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `donation_goals_user_id_foreign` FOREIGN KEY(`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
