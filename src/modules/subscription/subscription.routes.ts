import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';

export class SubscriptionRoutes {
  public router: Router;

  constructor(
    private controller: SubscriptionController
  ) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post('/subscribe', this.controller.subscribe);
    this.router.get('/confirm/:token', this.controller.confirmSubscription);
    this.router.get('/unsubscribe/:token', this.controller.unsubscribe);
    this.router.get('/subscriptions', this.controller.getSubscriptions);
  }
}