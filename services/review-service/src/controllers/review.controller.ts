import { Request, Response } from 'express';
import { createReviewRun, getRepositoryForUser, getReviewResults, getReviewRun, FileInput } from '../services/review.service';

function normalizeFiles(files: unknown): FileInput[] {
  if (!Array.isArray(files)) {
    return [];
  }

  return files
    .map((file) => {
      if (!file || typeof file !== 'object') {
        return null;
      }

      const value = file as { filePath?: unknown; language?: unknown; content?: unknown };

      if (typeof value.filePath !== 'string' || typeof value.language !== 'string' || typeof value.content !== 'string') {
        return null;
      }

      return {
        filePath: value.filePath,
        language: value.language,
        content: value.content
      };
    })
    .filter((file): file is FileInput => Boolean(file));
}

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ status: 'ok', service: 'review-service' });
}

export async function analyzeRepository(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { repositoryId, files } = req.body as { repositoryId?: string; files?: unknown };
    const normalizedFiles = normalizeFiles(files);

    if (!repositoryId) {
      res.status(400).json({ message: 'repositoryId is required' });
      return;
    }

    if (normalizedFiles.length === 0) {
      res.status(400).json({ message: 'At least one file is required for analysis' });
      return;
    }

    const repository = await getRepositoryForUser(repositoryId, req.user.userId);
    const reviewRun = await createReviewRun({
      userId: req.user.userId,
      repositoryId: repository.id,
      repositoryName: repository.repoName,
      repositoryUrl: repository.repoUrl,
      files: normalizedFiles
    });

    res.status(201).json({
      message: 'Review queued successfully',
      reviewId: reviewRun.id,
      repositoryId: repository.id,
      totalFiles: normalizedFiles.length,
      status: reviewRun.status
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    res.status(status).json({ message: (error as Error).message || 'Internal server error' });
  }
}

export async function getReviewStatus(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const reviewRun = await getReviewRun(req.params.reviewId, req.user.userId);
    res.status(200).json(reviewRun);
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    res.status(status).json({ message: (error as Error).message || 'Internal server error' });
  }
}

export async function getReviewResultsHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const results = await getReviewResults(req.params.reviewId, req.user.userId);
    res.status(200).json(results);
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    res.status(status).json({ message: (error as Error).message || 'Internal server error' });
  }
}
