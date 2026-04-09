import { prisma } from "../../general/db/prisma.service";
import { BadRequestException, ConflictException, NotFoundException } from "../../general/exceptions/http.exception";
import { GithubService } from "./github.service";

export class SubscriptionService {

  constructor(private githubService: GithubService) {}

  async subscribe(email: string, repoName: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }
    const repoRegex = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
    if (!repoRegex.test(repoName)) {
      throw new BadRequestException('Invalid repository format. Use owner/repo');
    }

    const existsOnGithub = await this.githubService.checkRepoExists(repoName);
    if (!existsOnGithub) {
      throw new NotFoundException('Repository not found on GitHub');
    }

    const repository = await prisma.repository.upsert({
      where: { name: repoName },
      update: {},
      create: { name: repoName },
    });

    const existingSubscription = await prisma.subscription.findUnique({
      where: {
        email_repositoryId: {
          email,
          repositoryId: repository.id,
        },
      },
    });

    if (existingSubscription) {
      throw new ConflictException('Already subscribed to this repository');
    }

    await prisma.subscription.create({
      data: {
        email,
        repositoryId: repository.id,
      },
    });
  }

  async getSubscriptions(email: string) {
    const subscriptions = await prisma.subscription.findMany({
      where: { email },
      include: { repository: true },
    });

    return subscriptions.map((sub) => ({
      email: sub.email,
      repo: sub.repository.name,
      confirmed: sub.status === 'ACTIVE',
      last_seen_tag: sub.repository.lastSeenTag,
    }));
  }

  async confirmSubscription(token: string) {
    const subscription = await prisma.subscription.findUnique({ where: { token } });
    if (!subscription) {
      throw new NotFoundException('Token not found');
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'ACTIVE' },
    });
  }

  async unsubscribe(token: string): Promise<void> {
    const subscription = await prisma.subscription.findUnique({ where: { token } });
    if (!subscription) {
      throw new NotFoundException('Token not found');
    }

    await prisma.subscription.delete({ where: { id: subscription.id } });
  }
}