import cron from 'node-cron';
import { prisma } from '../../general/db/prisma.service';
import { GithubService } from '../subscription/github.service';
import { NotifierService } from '../notifier/notifier.service';

export class ScannerService {
  private readonly SCAN_MINUTE_INTERVAL = 1; 
  constructor(
    private githubService: GithubService,
    private notifierService: NotifierService
  ) {}

  public start() {
    console.log(`⏱️ Scanner scheduled to run every ${this.SCAN_MINUTE_INTERVAL} minutes...`);
    
    cron.schedule(`*/${this.SCAN_MINUTE_INTERVAL} * * * *`, async () => {
      console.log('🔍 Scanner started checking for new releases...');
      
      await this.scan();
    });
  }

  private async scan() {
    try {
      const reposToScan = await prisma.repository.findMany({
        where: {
          subscriptions: {
            some: { status: 'ACTIVE' }
          }
        },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' }
          }
        }
      });

      for (const repo of reposToScan) {
        try {
          const latestTag = await this.githubService.getLatestReleaseTag(repo.name);

          if (latestTag && latestTag !== repo.lastSeenTag) {
            console.log(`📦 New release found for ${repo.name}: ${latestTag}`);

            await prisma.repository.update({
              where: { id: repo.id },
              data: { lastSeenTag: latestTag },
            });

            for (const subscription of repo.subscriptions) {
              this.notifierService.sendReleaseEmail(
                subscription.email, 
                repo.name, 
                latestTag, 
                subscription.token
              );
            }
          }

        } catch (error) {
          console.error(`⚠️ Failed to check ${repo.name}:`, error);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('✅ Scanner finished checking.');
    } catch (error) {
      console.error('❌ Scanner error:', error);
    }
  }
}