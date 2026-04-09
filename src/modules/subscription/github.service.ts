import { NotFoundException, TooManyRequestsException } from "../../general/exceptions/http.exception";

export class GithubService {
  private readonly BASE_URL = 'https://api.github.com/repos';

  async checkRepoExists(repoName: string): Promise<boolean> {
    const response = await fetch(`${this.BASE_URL}/${repoName}`);

    if (response.status === 200) {
      return true;
    }

    if (response.status === 404) {
      throw new NotFoundException('Repository not found on GitHub');
    }

    if (response.status === 429 || response.status === 403) {
      const remaining = response.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        throw new TooManyRequestsException('GitHub API rate limit exceeded');
      }
    }

    throw new Error(`GITHUB_API_ERROR_${response.status}`);
  }
}