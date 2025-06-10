import { type Request, type Response, type NextFunction } from "express";
import { storage } from "./storage";

export const isPlayerAuthenticated = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const screen = await storage.getScreenByAuthToken(token);

    if (!screen) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Check if screen has a user assigned
    if (!screen.userId) {
      return res.status(401).json({ message: 'Screen not properly configured' });
    }

    // Update last seen
    try {
      await storage.updateScreenById(screen.id, { 
        lastSeen: new Date(),
        isOnline: true 
      });
    } catch (updateError) {
      console.error('Failed to update screen status:', updateError);
      // Continue anyway, this shouldn't block the request
    }

    req.screen = screen;
    next();
  } catch (error) {
    console.error('Player auth error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};