-- นับตัวอักษรที่ส่งไปสร้างเสียงอ่าน (Google/Azure คิดเงินตามจำนวนตัวอักษร) ใช้แสดงในหน้าผู้ดูแล (รันหลัง 005_tts_voice.sql)
CREATE TABLE IF NOT EXISTS `tts_usage`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NULL,                           -- สตรีมเมอร์เจ้าของเสียง
    `source` VARCHAR(10) NOT NULL,                            -- widget / dashboard
    `provider` VARCHAR(10) NOT NULL,                          -- google / azure
    `tier` VARCHAR(10) NOT NULL,                              -- standard / premium (ราคาและโควตาฟรีต่างกัน)
    `voice_name` VARCHAR(60) NOT NULL,
    `chars` INT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `tts_usage_created_at_index`(`created_at`),
    KEY `tts_usage_user_id_index`(`user_id`, `created_at`)
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
