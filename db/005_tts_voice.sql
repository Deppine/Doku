-- เสียงอ่านข้อความ: เลือกเสียงหญิง/ชาย และใช้เสียงจากเซิร์ฟเวอร์หรือเสียงในเครื่อง (รันหลัง 004_user_status.sql)
ALTER TABLE `alert_settings` ADD COLUMN `tts_voice` VARCHAR(10) NOT NULL DEFAULT 'female';
ALTER TABLE `alert_settings` ADD COLUMN `tts_engine` VARCHAR(10) NOT NULL DEFAULT 'auto';
