import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const drawings = sqliteTable("drawings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  thumbnail: text("thumbnail").notNull(), // base64 PNG
  canvasData: text("canvas_data").notNull(), // JSON serialized strokes
  width: integer("width").notNull().default(1366),
  height: integer("height").notNull().default(1024),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const insertDrawingSchema = createInsertSchema(drawings).omit({
  id: true,
});
export type InsertDrawing = z.infer<typeof insertDrawingSchema>;
export type Drawing = typeof drawings.$inferSelect;
