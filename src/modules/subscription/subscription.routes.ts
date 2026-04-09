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
    this.router.post('/', this.controller.subscribe);
  }
}