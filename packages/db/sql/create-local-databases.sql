-- Local development databases for IGHubOs.
-- Run once as root (MySQL Workbench → open this file → replace the password → Execute).
-- Then put the same password in apps/api/.env (copy apps/api/.env.example).

CREATE DATABASE IF NOT EXISTS ighubos_dev  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS ighubos_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Replace CHANGE_ME with a password of your own before running.
CREATE USER IF NOT EXISTS 'ighubos'@'localhost' IDENTIFIED BY 'CHANGE_ME';

GRANT ALL PRIVILEGES ON ighubos_dev.*  TO 'ighubos'@'localhost';
GRANT ALL PRIVILEGES ON ighubos_test.* TO 'ighubos'@'localhost';
FLUSH PRIVILEGES;
