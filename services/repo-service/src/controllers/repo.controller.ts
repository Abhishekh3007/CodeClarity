import { Request, Response } from 'express';
import {
  buildGithubAuthorizeUrl,
  exchangeCodeForAccessToken,
  fetchGithubRepositories,
  fetchGithubUser,
  fetchRepositoryCommits,
  fetchRepositoryPullRequests,
  getGithubConnectionToken,
  listRepositories,
  saveGithubConnection,
  syncRepositories
} from '../services/github.service';

function parseOwnerAndRepo(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(repoUrl);
    const segments = parsed.pathname.replace(/^\//, '').split('/');

    if (segments.length < 2) {
      return null;
    }

    return { owner: segments[0], repo: segments[1] };
  } catch (_error) {
    return null;
  }
}

export async function getGithubAuthUrl(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const authUrl = buildGithubAuthorizeUrl(req.user.userId);
    res.status(200).json({ authUrl });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message || 'Internal server error' });
  }
}

export async function connectGithub(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { code, state } = req.body as { code?: string; state?: string };

    if (!code) {
      res.status(400).json({ message: 'GitHub authorization code is required' });
      return;
    }

    if (!state || state !== req.user.userId) {
      res.status(400).json({ message: 'Invalid OAuth state' });
      return;
    }

    const accessToken = await exchangeCodeForAccessToken(code);
    const githubUser = await fetchGithubUser(accessToken);
    const repositories = await fetchGithubRepositories(accessToken);

    await saveGithubConnection(req.user.userId, String(githubUser.id), accessToken);
    await syncRepositories(req.user.userId, repositories);

    res.status(200).json({
      message: 'GitHub account connected successfully',
      repositoriesSynced: repositories.length
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message || 'Internal server error' });
  }
}

export async function getRepositories(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const repositories = await listRepositories(req.user.userId);
    res.status(200).json(repositories);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message || 'Internal server error' });
  }
}

export async function analyzeRepository(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { repositoryId } = req.body as { repositoryId?: string };

    if (!repositoryId) {
      res.status(400).json({ message: 'repositoryId is required' });
      return;
    }

    res.status(202).json({
      message: 'Repository analysis request accepted',
      repositoryId,
      status: 'queued'
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message || 'Internal server error' });
  }
}

export async function getRepositoryCommits(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { repoUrl } = req.query as { repoUrl?: string };

    if (!repoUrl) {
      res.status(400).json({ message: 'repoUrl query parameter is required' });
      return;
    }

    const parsed = parseOwnerAndRepo(repoUrl);

    if (!parsed) {
      res.status(400).json({ message: 'Invalid repoUrl' });
      return;
    }

    const accessToken = await getGithubConnectionToken(req.user.userId);

    if (!accessToken) {
      res.status(400).json({ message: 'GitHub account is not connected for this user' });
      return;
    }

    const commits = await fetchRepositoryCommits(accessToken, parsed.owner, parsed.repo);
    res.status(200).json(commits);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message || 'Internal server error' });
  }
}

export async function getRepositoryPullRequests(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { repoUrl } = req.query as { repoUrl?: string };

    if (!repoUrl) {
      res.status(400).json({ message: 'repoUrl query parameter is required' });
      return;
    }

    const parsed = parseOwnerAndRepo(repoUrl);

    if (!parsed) {
      res.status(400).json({ message: 'Invalid repoUrl' });
      return;
    }

    const accessToken = await getGithubConnectionToken(req.user.userId);

    if (!accessToken) {
      res.status(400).json({ message: 'GitHub account is not connected for this user' });
      return;
    }

    const pullRequests = await fetchRepositoryPullRequests(accessToken, parsed.owner, parsed.repo);
    res.status(200).json(pullRequests);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message || 'Internal server error' });
  }
}
