import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';

interface RegisterInput {
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const SALT_ROUNDS = 12;

function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwtSecret;
}

export async function registerUser({ email, password }: RegisterInput): Promise<void> {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    const conflictError = new Error('Email already registered');
    (conflictError as Error & { status?: number }).status = 409;
    throw conflictError;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword
    }
  });
}

export async function loginUser({ email, password }: LoginInput): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const unauthorizedError = new Error('Invalid credentials');
    (unauthorizedError as Error & { status?: number }).status = 401;
    throw unauthorizedError;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const unauthorizedError = new Error('Invalid credentials');
    (unauthorizedError as Error & { status?: number }).status = 401;
    throw unauthorizedError;
  }

  const jwtExpiresIn = process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] | undefined;

  return jwt.sign(
    {
      userId: user.id,
      email: user.email
    },
    getJwtSecret(),
    {
      expiresIn: jwtExpiresIn || '7d'
    }
  );
}

export async function getUserProfile(userId: string): Promise<{ id: string; email: string; createdAt: Date }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true
    }
  });

  if (!user) {
    const notFoundError = new Error('User not found');
    (notFoundError as Error & { status?: number }).status = 404;
    throw notFoundError;
  }

  return user;
}
