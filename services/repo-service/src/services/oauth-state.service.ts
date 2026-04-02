import jwt from 'jsonwebtoken';

interface OAuthStatePayload {
  userId: string;
}

function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwtSecret;
}

export function createOAuthStateToken(userId: string): string {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '10m' });
}

export function verifyOAuthStateToken(state: string): OAuthStatePayload {
  const decoded = jwt.verify(state, getJwtSecret());

  if (typeof decoded === 'string' || !decoded.userId) {
    throw new Error('Invalid OAuth state payload');
  }

  return { userId: String(decoded.userId) };
}
