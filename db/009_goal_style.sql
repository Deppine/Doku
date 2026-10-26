-- หน้าตาหลอดเป้าหมายใน OBS: neon = แคปซูลนีออน, tube = หลอดแก้วเก็บเงิน, ring = วงแหวนมุมจอ, edge = เส้นขอบจอ, basic = แบบเรียบ (เดิม)
ALTER TABLE `donation_goals` ADD COLUMN `style` VARCHAR(10) NOT NULL DEFAULT 'neon';
