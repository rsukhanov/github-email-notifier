import { prisma } from "../general/db/prisma.service";
import { NotifierService } from "../modules/notifier/notifier.service";
import { ScannerService } from "../modules/scanner/scanner.service";
import { GithubService } from "../modules/subscription/github.service";

jest.useFakeTimers();

jest.mock('../general/db/prisma.service', () => ({
  prisma: {
    repository: { findMany: jest.fn(), update: jest.fn() }
  }
}));

describe('ScannerService', () => {
  let service: ScannerService;
  let mockGithubService: jest.Mocked<GithubService>;
  let mockNotifierService: jest.Mocked<NotifierService>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockGithubService = {
      getLatestReleaseTag: jest.fn(),
    } as any;

    mockNotifierService = {
      sendReleaseEmail: jest.fn(),
    } as any;

    service = new ScannerService(mockGithubService, mockNotifierService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('scan', () => {
    it('should notify active subscribers when a new release is found', async () => {
      const mockRepos = [{
        id: 'repo-1',
        name: 'owner/repo',
        lastSeenTag: 'v1.0.0',
        subscriptions: [
          { email: 'user1@mail.com', token: 'token1' }
        ]
      }];
      (prisma.repository.findMany as jest.Mock).mockResolvedValue(mockRepos);

      mockGithubService.getLatestReleaseTag.mockResolvedValue('v2.0.0');

      await Promise.all([
        service['scan'](),
        jest.runAllTimersAsync()
      ]);

      expect(prisma.repository.update).toHaveBeenCalledWith({
        where: { id: 'repo-1' },
        data: { lastSeenTag: 'v2.0.0' }
      });

      expect(mockNotifierService.sendReleaseEmail).toHaveBeenCalledWith(
        'user1@mail.com', 'owner/repo', 'v2.0.0', 'token1'
      );
    });

    it('should not do anything if tag is the same', async () => {
      const mockRepos = [{
        id: 'repo-1',
        name: 'owner/repo',
        lastSeenTag: 'v1.0.0',
        subscriptions: []
      }];
      (prisma.repository.findMany as jest.Mock).mockResolvedValue(mockRepos);
      mockGithubService.getLatestReleaseTag.mockResolvedValue('v1.0.0');

      await Promise.all([
        service['scan'](),
        jest.runAllTimersAsync()
      ]);

      expect(prisma.repository.update).not.toHaveBeenCalled();
      expect(mockNotifierService.sendReleaseEmail).not.toHaveBeenCalled();
    });

    it('should continue scanning other repos if one fails', async () => {
      (prisma.repository.findMany as jest.Mock).mockResolvedValue([
        { id: 'repo-1', name: 'owner/repo1', lastSeenTag: 'v1.0.0', subscriptions: [] },
        { id: 'repo-2', name: 'owner/repo2', lastSeenTag: 'v1.0.0', subscriptions: [
          { email: 'user@mail.com', token: 'token1' }
        ]}
      ]);

      mockGithubService.getLatestReleaseTag
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValueOnce('v2.0.0');

      await Promise.all([
        service['scan'](),
        jest.runAllTimersAsync()
      ]);

      expect(mockNotifierService.sendReleaseEmail).toHaveBeenCalledTimes(1);
      expect(mockNotifierService.sendReleaseEmail).toHaveBeenCalledWith('user@mail.com', 'owner/repo2', 'v2.0.0', 'token1');
    });

    it('should do nothing if no repos to scan', async () => {
      (prisma.repository.findMany as jest.Mock).mockResolvedValue([]);

      await Promise.all([
        service['scan'](),
        jest.runAllTimersAsync()
      ]);

      expect(mockGithubService.getLatestReleaseTag).not.toHaveBeenCalled();
      expect(mockNotifierService.sendReleaseEmail).not.toHaveBeenCalled();
    });

    it('should call setTimeout between each repo scan', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      (prisma.repository.findMany as jest.Mock).mockResolvedValue([
        { id: 'repo-1', name: 'owner/repo1', lastSeenTag: 'v1.0.0', subscriptions: [] },
        { id: 'repo-2', name: 'owner/repo2', lastSeenTag: 'v1.0.0', subscriptions: [] },
      ]);
      mockGithubService.getLatestReleaseTag.mockResolvedValue('v1.0.0');

      await Promise.all([
        service['scan'](),
        jest.runAllTimersAsync()
      ]);

      expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });
  });
});