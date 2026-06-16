import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { drawings, type Drawing, type InsertDrawing } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import path from "path";

// Use DATABASE_URL env var if set (Docker volume), otherwise fall back to local data.db
const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), "data.db");

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS drawings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    canvas_data TEXT NOT NULL,
    width INTEGER NOT NULL DEFAULT 1366,
    height INTEGER NOT NULL DEFAULT 1024,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

export interface IStorage {
  getDrawings(): Drawing[];
  getDrawing(id: number): Drawing | undefined;
  createDrawing(data: InsertDrawing): Drawing;
  updateDrawing(id: number, data: Partial<InsertDrawing>): Drawing | undefined;
  deleteDrawing(id: number): void;
}

export class SQLiteStorage implements IStorage {
  getDrawings(): Drawing[] {
    return db.select().from(drawings).orderBy(desc(drawings.updatedAt)).all();
  }

  getDrawing(id: number): Drawing | undefined {
    return db.select().from(drawings).where(eq(drawings.id, id)).get();
  }

  createDrawing(data: InsertDrawing): Drawing {
    return db.insert(drawings).values(data).returning().get();
  }

  updateDrawing(id: number, data: Partial<InsertDrawing>): Drawing | undefined {
    const existing = this.getDrawing(id);
    if (!existing) return undefined;
    return db
      .update(drawings)
      .set({ ...data, updatedAt: Date.now() })
      .where(eq(drawings.id, id))
      .returning()
      .get();
  }

  deleteDrawing(id: number): void {
    db.delete(drawings).where(eq(drawings.id, id)).run();
  }
}

export const storage = new SQLiteStorage();
