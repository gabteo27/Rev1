import { type Request, type Response, type NextFunction } from "express";
import { storage } from "./storage";

export async function isPlayerAuthenticated(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Authorization token is missing or invalid." });
  }

  const token = authHeader.split(' ')[1];

  try {
    const screen = await storage.getScreenByAuthToken(token);

    if (!screen) {
      return res.status(401).json({ message: "Invalid token. Screen not authorized." });
    }

    // Adjuntamos la información de la pantalla a la petición para usarla después
    req.screen = screen;
    next();

  } catch (error) {
    res.status(500).json({ message: "Authentication error." });
  }
}