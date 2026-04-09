import { redis } from "../../general/cache/redis.service";
import { TooManyRequestsException } from "../../general/exceptions/http.exception";

export class GithubService {
  private readonly BASE_URL = 'https://api.github.com/repos';
  private readonly CACHE_TTL = 600;

  async checkRepoExists(repoName: string): Promise<boolean> {
    const cacheKey = `repo_exists:${repoName}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return cached === 'true';
    }
    
    const response = await fetch(`${this.BASE_URL}/${repoName}`);

    if (response.status === 200) {
      await redis.set(cacheKey, 'true', this.CACHE_TTL);
      return true;
    }

    if (response.status === 404) {
      await redis.set(cacheKey, 'false', this.CACHE_TTL);
      return false;
    }

    this.checkRateLimit(response);

    throw new Error(`GITHUB_API_ERROR_${response.status}`);
  }

  async getLatestReleaseTag(repoName: string): Promise<string | null> {
    const cacheKey = `repo_release:${repoName}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return cached;
    }

    const response = await fetch(`${this.BASE_URL}/${repoName}/releases/latest`);

    if (response.status === 200) {
      const data = await response.json();
      await redis.set(cacheKey, data.tag_name, this.CACHE_TTL);
      return data.tag_name;
    }

    if (response.status === 404) {
      return null; 
    }

    this.checkRateLimit(response);
    throw new Error(`GITHUB_API_ERROR_${response.status}`);
  }

  private checkRateLimit(response: Response) {
    if (response.status === 429 || response.status === 403) {
      const remaining = response.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        throw new TooManyRequestsException('GitHub API rate limit exceeded');
      }
    }
  }
}