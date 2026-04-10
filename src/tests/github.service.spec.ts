import { redis } from "../general/cache/redis.service";
import { TooManyRequestsException } from "../general/exceptions/http.exception";
import { GithubService } from "../modules/subscription/github.service";

global.fetch = jest.fn();

jest.mock('../general/cache/redis.service', () => ({
  redis: { get: jest.fn(), set: jest.fn() }
}));

describe('GithubService', () => {
  let service: GithubService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GithubService();
  });

  describe('checkRepoExists', () => {
    it('should return true from cache without fetching', async () => {
      (redis.get as jest.Mock).mockResolvedValue('true');

      const result = await service.checkRepoExists('owner/repo');

      expect(result).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return false from cache without fetching', async () => {
      (redis.get as jest.Mock).mockResolvedValue('false');

      const result = await service.checkRepoExists('owner/repo');

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fetch, cache true, return true on 200', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({ status: 200 });

      const result = await service.checkRepoExists('owner/repo');

      expect(result).toBe(true);
      expect(redis.set).toHaveBeenCalledWith('repo_exists:owner/repo', 'true', 600);
    });

    it('should fetch, cache false, return false on 404', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({ status: 404 });

      const result = await service.checkRepoExists('owner/repo');

      expect(result).toBe(false);
      expect(redis.set).toHaveBeenCalledWith('repo_exists:owner/repo', 'false', 600);
    });

    it('should throw TooManyRequestsException on 429 with remaining=0', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 429,
        headers: { get: (h: string) => h === 'x-ratelimit-remaining' ? '0' : null }
      });

      await expect(service.checkRepoExists('owner/repo'))
        .rejects.toThrow(TooManyRequestsException);
    });

    it('should throw TooManyRequestsException on 403 with remaining=0', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 403,
        headers: { get: (h: string) => h === 'x-ratelimit-remaining' ? '0' : null }
      });

      await expect(service.checkRepoExists('owner/repo'))
        .rejects.toThrow(TooManyRequestsException);
    });

    it('should throw generic error on unexpected status', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 500,
        headers: { get: () => null }
      });

      await expect(service.checkRepoExists('owner/repo'))
        .rejects.toThrow('GITHUB_API_ERROR_500');
    });
  });

  describe('getLatestReleaseTag', () => {
    it('should return cached tag without fetching', async () => {
      (redis.get as jest.Mock).mockResolvedValue('v1.0.0');

      const result = await service.getLatestReleaseTag('owner/repo');

      expect(result).toBe('v1.0.0');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fetch, cache, return tag_name on 200', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({ tag_name: 'v2.0.0' })
      });

      const result = await service.getLatestReleaseTag('owner/repo');

      expect(result).toBe('v2.0.0');
      expect(redis.set).toHaveBeenCalledWith('repo_release:owner/repo', 'v2.0.0', 600);
    });

    it('should return null and not cache on 404', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({ status: 404 });

      const result = await service.getLatestReleaseTag('owner/repo');

      expect(result).toBeNull();
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('should throw TooManyRequestsException on rate limit', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 429,
        headers: { get: (h: string) => h === 'x-ratelimit-remaining' ? '0' : null }
      });

      await expect(service.getLatestReleaseTag('owner/repo'))
        .rejects.toThrow(TooManyRequestsException);
    });
  });
});