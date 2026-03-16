import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'backend' });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'CodeClarity backend initialized with TypeScript' });
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});
