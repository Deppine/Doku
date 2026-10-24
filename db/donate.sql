CREATE TABLE `users`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(100) NOT NULL,
    `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP());
ALTER TABLE
    `users` ADD UNIQUE `users_username_unique`(`username`);
CREATE TABLE `payment_settings`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `account_name` VARCHAR(150) NOT NULL,
    `promptpay_id` VARCHAR(20) NOT NULL,
    `qr_file_path` VARCHAR(255) NOT NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP());
ALTER TABLE
    `payment_settings` ADD UNIQUE `payment_settings_user_id_unique`(`user_id`);
CREATE TABLE `donations`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `donation_ref` VARCHAR(50) NOT NULL,
    `recipient_user_id` BIGINT UNSIGNED NOT NULL,
    `donor_name` VARCHAR(100) NULL,
    `message` TEXT NULL,
    `expected_amount` DECIMAL(10, 2) NOT NULL,
    `paid_amount` DECIMAL(10, 2) NULL,
    `status` ENUM(
        'pending',
        'submitted',
        'verified',
        'rejected',
        'expired',
        'refunded'
    ) NOT NULL DEFAULT 'pending',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(), `verified_at` TIMESTAMP NULL);
ALTER TABLE
    `donations` ADD INDEX `donations_recipient_user_id_created_at_index`(`recipient_user_id`, `created_at`);
ALTER TABLE
    `donations` ADD UNIQUE `donations_donation_ref_unique`(`donation_ref`);
ALTER TABLE
    `donations` ADD INDEX `donations_status_index`(`status`);
CREATE TABLE `payment_slips`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `donation_id` BIGINT UNSIGNED NOT NULL,
    `original_file_name` VARCHAR(255) NULL,
    `stored_file_path` VARCHAR(255) NOT NULL,
    `file_hash` CHAR(64) NULL,
    `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP());
ALTER TABLE
    `payment_slips` ADD INDEX `payment_slips_donation_id_index`(`donation_id`);
ALTER TABLE
    `payment_slips` ADD INDEX `payment_slips_file_hash_index`(`file_hash`);
CREATE TABLE `payment_verifications`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `slip_id` BIGINT UNSIGNED NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `transaction_ref` VARCHAR(100) NULL,
    `amount` DECIMAL(10, 2) NULL,
    `receiver_promptpay_id` VARCHAR(50) NULL,
    `verification_status` ENUM(
        'pending',
        'verified',
        'rejected',
        'error'
    ) NOT NULL DEFAULT 'pending',
    `response_code` VARCHAR(50) NULL,
    `checked_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP());
ALTER TABLE
    `payment_verifications` ADD UNIQUE `payment_verifications_provider_transaction_ref_unique`(`provider`, `transaction_ref`);
ALTER TABLE
    `payment_verifications` ADD INDEX `payment_verifications_slip_id_index`(`slip_id`);
ALTER TABLE
    `payment_settings` ADD CONSTRAINT `payment_settings_user_id_foreign` FOREIGN KEY(`user_id`) REFERENCES `users`(`id`);
ALTER TABLE
    `payment_verifications` ADD CONSTRAINT `payment_verifications_slip_id_foreign` FOREIGN KEY(`slip_id`) REFERENCES `payment_slips`(`id`);
ALTER TABLE
    `donations` ADD CONSTRAINT `donations_recipient_user_id_foreign` FOREIGN KEY(`recipient_user_id`) REFERENCES `users`(`id`);
ALTER TABLE
    `payment_slips` ADD CONSTRAINT `payment_slips_donation_id_foreign` FOREIGN KEY(`donation_id`) REFERENCES `donations`(`id`);