-- คอลัมน์เพิ่มที่เว็บต้องใช้ (รันหลัง donate.sql)
-- รันด้วย: npm run db:migrate  (สคริปต์จะข้ามคอลัมน์ที่มีอยู่แล้ว)

-- เก็บภาษาไทยได้ถูกต้อง (ถ้าฐานข้อมูลตั้งค่าเริ่มต้นเป็น latin1 ภาษาไทยจะกลายเป็น ???)
ALTER TABLE `users` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `payment_settings` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `donations` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `payment_slips` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `payment_verifications` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- users: คำแนะนำตัว + token ลับของ widget OBS
ALTER TABLE `users` ADD COLUMN `bio` VARCHAR(160) NOT NULL DEFAULT '';
ALTER TABLE `users` ADD COLUMN `widget_token` CHAR(48) NULL;
ALTER TABLE `users` ADD UNIQUE `users_widget_token_unique`(`widget_token`);

-- payment_settings: การตั้งค่าหน้าโดเนท
ALTER TABLE `payment_settings` ADD COLUMN `min_amount` DECIMAL(10, 2) NOT NULL DEFAULT 10.00;
ALTER TABLE `payment_settings` ADD COLUMN `presets` VARCHAR(100) NOT NULL DEFAULT '20,50,100,300,500';
ALTER TABLE `payment_settings` ADD COLUMN `allow_custom_amount` TINYINT(1) NOT NULL DEFAULT 1;
-- เว็บสร้าง QR เองจากเลขพร้อมเพย์ จึงไม่บังคับไฟล์ QR
ALTER TABLE `payment_settings` MODIFY `qr_file_path` VARCHAR(255) NOT NULL DEFAULT '';

-- donations: เวลาหมดอายุ QR + ข้อมูล QR ที่สร้าง
ALTER TABLE `donations` ADD COLUMN `expires_at` TIMESTAMP NULL;
ALTER TABLE `donations` ADD COLUMN `qr_payload` VARCHAR(255) NULL;
