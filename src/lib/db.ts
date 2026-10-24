/**
 * การเชื่อมต่อ MySQL/MariaDB (ตั้ง DATABASE_URL ใน .env.local)
 * เช่น mysql://root:รหัสผ่าน@localhost:3306/donate  ดูเรื่อง SSL/Aiven ที่ db-config.ts
 */
import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from "mysql2/promise";
import { dbConfig } from "./db-config";

const g = globalThis as unknown as { __dbPool?: Pool };

export function db(): Pool {
  if (!g.__dbPool) {
    g.__dbPool = mysql.createPool({
      ...dbConfig(),
      // บน Vercel แต่ละ instance เปิด pool ของตัวเอง ฐานข้อมูลฟรีจำกัดจำนวนการเชื่อมต่อ จึงตั้งให้น้อยได้
      connectionLimit: Number(process.env.DATABASE_POOL_SIZE ?? 5),
      maxIdle: 2,
      idleTimeout: 30_000,
      enableKeepAlive: true,
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
