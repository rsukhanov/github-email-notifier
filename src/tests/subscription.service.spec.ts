import { prisma } from "../general/db/prisma.service";
import { BadRequestException, NotFoundException, ConflictException } from "../general/exceptions/http.exception";
import { NotifierService } from "../modules/notifier/notifier.service";
import { GithubService } from "../modules/subscription/github.service";
import { SubscriptionService } from "../modules/subscription/subscription.service";

jest.mock('../general/db/prisma.service', () => ({
  prisma: {
    repository: { upsert: jest.fn() },
    subscription: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() }
  }
}));

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let mockGithubService: jest.Mocked<GithubService>;
  let mockNotifierService: jest.Mocked<NotifierService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGithubService = {
      checkRepoExists: jest.fn(),
      getLatestReleaseTag: jest.fn(),
    } as any;

    mockNotifierService = {
      sendConfirmationEmail: jest.fn(),
      sendReleaseEmail: jest.fn(),
    } as any;

    service = new SubscriptionService(mockGithubService, mockNotifierService);
  });

  describe('subscribe', () => {
    it('should throw BadRequestException for invalid email', async () => {
      await expect(service.subscribe('bad-email', 'owner/repo')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid repo format', async () => {
      await expect(service.subscribe('test@mail.com', 'badrepo')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if repo does not exist on GitHub', async () => {
      mockGithubService.checkRepoExists.mockResolvedValue(false);
      await expect(service.subscribe('test@mail.com', 'owner/repo')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if subscription already exists', async () => {
      mockGithubService.checkRepoExists.mockResolvedValue(true);
      (prisma.repository.upsert as jest.Mock).mockResolvedValue({ id: 'repo-1' });
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({ id: 'sub-1' });

      await expect(service.subscribe('test@mail.com', 'owner/repo')).rejects.toThrow(ConflictException);
    });

    it('should successfully subscribe and send email', async () => {
      mockGithubService.checkRepoExists.mockResolvedValue(true);
      (prisma.repository.upsert as jest.Mock).mockResolvedValue({ id: 'repo-1' });
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.subscription.create as jest.Mock).mockResolvedValue({ token: 'test-token' });

      await service.subscribe('test@mail.com', 'owner/repo');

      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: { email: 'test@mail.com', repositoryId: 'repo-1' }
      });
      expect(mockNotifierService.sendConfirmationEmail).toHaveBeenCalledWith('test@mail.com', 'owner/repo', 'test-token');
    });
  });

  describe('confirmSubscription', () => {
    it('should throw NotFoundException for invalid token', async () => {
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.confirmSubscription('bad-token')).rejects.toThrow(NotFoundException);
    });

    it('should NOT fetch release tag if lastSeenTag already set', async () => {
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        repository: { id: 'repo-1', name: 'owner/repo', lastSeenTag: 'v1.0.0' }
      });
      (prisma.subscription.update as jest.Mock).mockResolvedValue({});

      await service.confirmSubscription('token');

      expect(mockGithubService.getLatestReleaseTag).not.toHaveBeenCalled();
    });

  });

  describe('unsubscribe', () => {
    it('should throw NotFoundException for invalid token', async () => {
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.unsubscribe('bad-token')).rejects.toThrow(NotFoundException);
    });

    it('should delete subscription', async () => {
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({ id: 'sub-1' });
      (prisma.subscription.delete as jest.Mock).mockResolvedValue({});

      await service.unsubscribe('token');

      expect(prisma.subscription.delete).toHaveBeenCalledWith({ where: { id: 'sub-1' } });
    });
  });

  describe('getSubscriptions', () => {
    it('should return mapped subscriptions', async () => {
      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([
        {
          email: 'test@mail.com',
          status: 'ACTIVE',
          repository: { name: 'owner/repo', lastSeenTag: 'v1.0.0' }
        }
      ]);

      const result = await service.getSubscriptions('test@mail.com');

      expect(result).toEqual([{
        email: 'test@mail.com',
        repo: 'owner/repo',
        confirmed: true,
        last_seen_tag: 'v1.0.0'
      }]);
    });

    it('should return confirmed: false for PENDING subscription', async () => {
      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([
        {
          email: 'test@mail.com',
          status: 'PENDING',
          repository: { name: 'owner/repo', lastSeenTag: null }
        }
      ]);

      const result = await service.getSubscriptions('test@mail.com');
      expect(result[0].confirmed).toBe(false);
    });
  });
});