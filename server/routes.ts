import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDrawingSchema } from "@shared/schema";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // GET all drawings
  app.get("/api/drawings", (req, res) => {
    const list = storage.getDrawings();
    res.json(list);
  });

  // GET single drawing
  app.get("/api/drawings/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const drawing = storage.getDrawing(id);
    if (!drawing) return res.status(404).json({ error: "Not found" });
    res.json(drawing);
  });

  // POST create drawing
  app.post("/api/drawings", (req, res) => {
    try {
      const data = insertDrawingSchema.parse(req.body);
      const drawing = storage.createDrawing(data);
      res.status(201).json(drawing);
    } catch (e) {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // PATCH update drawing
  app.patch("/api/drawings/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const partial = insertDrawingSchema.partial().parse(req.body);
    const updated = storage.updateDrawing(id, partial);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  // DELETE drawing
  app.delete("/api/drawings/:id", (req, res) => {
    const id = parseInt(req.params.id);
    storage.deleteDrawing(id);
    res.status(204).send();
  });

  return httpServer;
}
