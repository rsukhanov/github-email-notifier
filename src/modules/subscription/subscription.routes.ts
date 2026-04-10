import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
import { apiKeyAuthMiddleware } from '../../general/middleware/auth.middleware';

export class SubscriptionRoutes {
  public router: Router;

  constructor(
    private controller: SubscriptionController
  ) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post('/subscribe', apiKeyAuthMiddleware, this.controller.subscribe);
    this.router.get('/confirm/:token', this.controller.confirmSubscription);
    this.router.get('/unsubscribe/:token', this.controller.unsubscribe);
    this.router.get('/subscriptions', apiKeyAuthMiddleware, this.controller.getSubscriptions);
  }
}