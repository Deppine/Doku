/**
 * การเชื่อมต่อ MySQL/MariaDB (ตั้ง DATABASE_URL ใน .env.local)
 * เช่น mysql://root:รหัสผ่าน@localhost:3306/donate
 */
import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from "mysql2/promise";

const g = globalThis as unknown as { __dbPool?: Pool };

export function db(): Pool {
  if (!g.__dbPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("ยังไม่ได้ตั้ง DATABASE_URL ใน .env.local");
    g.__dbPool = mysql.createPool({
      uri: url,
      connectionLimit: 10,
      decimalNumbers: true, // DECIMAL → number
      charset: "utf8mb4",
    });
  }
  return g.__dbPool;
}

export async function query<T extends RowDataPacket>(sql: string, params: unknown[] = []) {
  const [rows] = await db().query<T[]>(sql, params);
  return rows;
}

export async function exec(sql: string, params: unknown[] = []) {
  const [res] = await db().query<ResultSetHeader>(sql, params);
  return res;
}

export type { RowDataPacket };
