-- สถานะบัญชี: active = ใช้งานได้, pending = สมัครเองแล้วรอผู้ดูแลอนุมัติ, suspended = ถูกระงับ
-- บัญชีที่มีอยู่แล้วเป็น active ทั้งหมด (รันหลัง 003_cloud.sql)
ALTER TABLE `users` ADD COLUMN `status` ENUM('active', 'pending', 'suspended') NOT NULL DEFAULT 'active';
