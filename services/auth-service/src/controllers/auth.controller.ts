import { Request, Response } from 'express';
import { getUserProfile, loginUser, registerUser } from '../services/auth.service';

function validateEmailAndPassword(email: unknown, password: unknown): string | null {
  if (typeof email !== 'string' || typeof password !== 'string') {
    return 'Email and password are required';
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    return 'Email and password are required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    return 'Invalid email format';
  }

  if (normalizedPassword.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  return null;
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const validationError = validateEmailAndPassword(email, password);

    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    await registerUser({ email: String(email).trim().toLowerCase(), password: String(password) });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    const statusCode = (error as Error & { status?: number }).status || 500;
    res.status(statusCode).json({ message: (error as Error).message || 'Internal server error' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const validationError = validateEmailAndPassword(email, password);

    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    const token = await loginUser({ email: String(email).trim().toLowerCase(), password: String(password) });

    res.status(200).json({ token });
  } catch (error) {
    const statusCode = (error as Error & { status?: number }).status || 500;
    res.status(statusCode).json({ message: (error as Error).message || 'Internal server error' });
  }
}

export async function profile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userProfile = await getUserProfile(req.user.userId);
    res.status(200).json(userProfile);
  } catch (error) {
    const statusCode = (error as Error & { status?: number }).status || 500;
    res.status(statusCode).json({ message: (error as Error).message || 'Internal server error' });
  }
}
