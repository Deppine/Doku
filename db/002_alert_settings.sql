-- การตั้งค่าเสียงแจ้งเตือนของแต่ละสตรีมเมอร์ (รันหลัง 001_app_columns.sql)
CREATE TABLE IF NOT EXISTS `alert_settings`(
    `user_id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    `sound_preset` VARCHAR(20) NOT NULL DEFAULT 'chime',      -- chime / bell / coin / pop / custom / none
    `sound_file_path` VARCHAR(255) NULL,                      -- ไฟล์เสียงที่อัปโหลดเอง (ใน uploads/)
    `sound_volume` TINYINT UNSIGNED NOT NULL DEFAULT 70,      -- 0–100
    `tts_enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `tts_template` VARCHAR(200) NOT NULL DEFAULT '{name} โดเนท {amount} บาท {message}',
    `tts_rate` DECIMAL(3, 2) NOT NULL DEFAULT 1.00,           -- 0.5–1.5
    `tts_volume` TINYINT UNSIGNED NOT NULL DEFAULT 100,       -- 0–100
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `alert_settings_user_id_foreign` FOREIGN KEY(`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
