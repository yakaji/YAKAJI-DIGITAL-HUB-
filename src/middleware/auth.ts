import type { Request, Response, NextFunction } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface AuthRequest extends Request {
  firebaseUser?: DecodedIdToken;
}

export async function verifyFirebaseBearerToken(token: string): Promise<DecodedIdToken | null> {
  if (!token) return null;
  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

export const requireFirebaseAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const decodedToken = await verifyFirebaseBearerToken(token);
  if (!decodedToken) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  req.firebaseUser = decodedToken;
  next();
};
