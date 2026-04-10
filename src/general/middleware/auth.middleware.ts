import { Request, Response, NextFunction } from 'express';

export const apiKeyAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requireAuth = process.env.REQUIRE_API_KEY === 'true';
  
  if (!requireAuth) {
    return next();
  }

  const clientApiKey = req.header('x-api-key') || req.header('authorization');
  const serverApiKey = process.env.API_KEY;

  if (!clientApiKey || clientApiKey !== serverApiKey) {
    res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
    return;
  }

  next();
};