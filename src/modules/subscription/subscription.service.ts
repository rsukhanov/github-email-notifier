import { prisma } from "../../general/db/prisma.service";
import { BadRequestException, ConflictException, NotFoundException } from "../../general/exceptions/http.exception";
import { GithubService } from "./github.service";

export class SubscriptionService {

  constructor(private githubService: GithubService) {}

  async subscribe(email: string, repoName: string): Promise<void> {
    
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
}