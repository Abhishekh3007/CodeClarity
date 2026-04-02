import { Router } from 'express';
import {
  analyzeRepository,
  completeGithubCallback,
  connectGithub,
  getGithubAuthUrl,
  getRepositories,
  getRepositoryCommits,
  getRepositoryPullRequests
} from '../controllers/repo.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const repoRouter = Router();

repoRouter.get('/auth/github/url', authenticateToken, getGithubAuthUrl);
repoRouter.get('/auth/github/callback', completeGithubCallback);
repoRouter.post('/auth/github/callback', authenticateToken, connectGithub);
repoRouter.get('/repos', authenticateToken, getRepositories);
repoRouter.post('/analyze-repo', authenticateToken, analyzeRepository);
repoRouter.get('/repos/commits', authenticateToken, getRepositoryCommits);
repoRouter.get('/repos/pulls', authenticateToken, getRepositoryPullRequests);

export default repoRouter;
