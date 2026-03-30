import axios from 'axios';
import prisma from '../prisma/client';

const GITHUB_API_URL = 'https://api.github.com';

interface GitHubRepository {
  name: string;
  html_url: string;
}

interface GitHubUser {
  id: number;
  login: string;
}

function getGithubClientId(): string {
  const value = process.env.GITHUB_CLIENT_ID;
  if (!value) {
    throw new Error('GITHUB_CLIENT_ID is not configured');
  }
  return value;
}

function getGithubClientSecret(): string {
  const value = process.env.GITHUB_CLIENT_SECRET;
  if (!value) {
    throw new Error('GITHUB_CLIENT_SECRET is not configured');
  }
  return value;
}

function getGithubCallbackUrl(): string {
  const value = process.env.GITHUB_CALLBACK_URL;
  if (!value) {
    throw new Error('GITHUB_CALLBACK_URL is not configured');
  }
  return value;
}

export function buildGithubAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getGithubClientId(),
    redirect_uri: getGithubCallbackUrl(),
    scope: 'repo read:user',
    state
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForAccessToken(code: string): Promise<string> {
  const response = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: getGithubClientId(),
      client_secret: getGithubClientSecret(),
      code,
      redirect_uri: getGithubCallbackUrl()
    },
    {
      headers: {
        Accept: 'application/json'
      }
    }
  );

  const accessToken = response.data.access_token as string | undefined;

  if (!accessToken) {
    throw new Error('Failed to exchange code for access token');
  }

  return accessToken;
}

export async function fetchGithubUser(accessToken: string): Promise<GitHubUser> {
  const response = await axios.get<GitHubUser>(`${GITHUB_API_URL}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json'
    }
  });

  return response.data;
}

export async function fetchGithubRepositories(accessToken: string): Promise<GitHubRepository[]> {
  const response = await axios.get<GitHubRepository[]>(`${GITHUB_API_URL}/user/repos`, {
    params: {
      per_page: 100,
      sort: 'updated'
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json'
    }
  });

  return response.data;
}

export async function saveGithubConnection(userId: string, githubUserId: string, accessToken: string): Promise<void> {
  await prisma.gitHubConnection.upsert({
    where: { userId },
    create: {
      userId,
      githubUserId,
      accessToken
    },
    update: {
      githubUserId,
      accessToken
    }
  });
}

export async function getGithubConnectionToken(userId: string): Promise<string | null> {
  const connection = await prisma.gitHubConnection.findUnique({
    where: { userId },
    select: { accessToken: true }
  });

  return connection?.accessToken ?? null;
}

export async function syncRepositories(userId: string, repositories: GitHubRepository[]): Promise<void> {
  for (const repository of repositories) {
    const existingRepository = await prisma.repository.findFirst({
      where: {
        userId,
        repoUrl: repository.html_url
      },
      select: { id: true }
    });

    if (existingRepository) {
      await prisma.repository.update({
        where: { id: existingRepository.id },
        data: { repoName: repository.name }
      });
      continue;
    }

    await prisma.repository.create({
      data: {
        userId,
        repoName: repository.name,
        repoUrl: repository.html_url
      }
    });
  }
}

export async function listRepositories(userId: string): Promise<Array<{ id: string; repoName: string; repoUrl: string; lastAnalyzed: Date | null }>> {
  return prisma.repository.findMany({
    where: { userId },
    orderBy: { repoName: 'asc' }
  });
}

export async function fetchRepositoryCommits(accessToken: string, owner: string, repo: string): Promise<unknown[]> {
  const response = await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}/commits`, {
    params: { per_page: 20 },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json'
    }
  });

  return response.data as unknown[];
}

export async function fetchRepositoryPullRequests(accessToken: string, owner: string, repo: string): Promise<unknown[]> {
  const response = await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}/pulls`, {
    params: {
      state: 'open',
      per_page: 20
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json'
    }
  });

  return response.data as unknown[];
}
