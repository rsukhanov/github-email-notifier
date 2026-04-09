import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { BadRequestException } from '../../general/exceptions/http.exception';

export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService
  ) {}

  public subscribe = async (
    req: Request, 
    res: Response, 
    next: NextFunction
  ) => {
    try {
      const { email, repo } = req.body as CreateSubscriptionDto;

      if (!email || !repo) {
        throw new BadRequestException('Email and repository are required');
      }

      await this.subscriptionService.subscribe(email, repo);

      res.status(200).json({ message: 'Subscribed successfully' });
    } catch (error) {
      next(error);
    }
  };

  public confirmSubscription = async (
    req: Request, 
    res: Response, 
    next: NextFunction
  ) => {
    try {
      const { token } = req.params as { token: string };
      if (!token) throw new BadRequestException('Invalid token');

      await this.subscriptionService.confirmSubscription(token);
      res.status(200).json({ message: 'Subscription confirmed successfully' });
    } catch (error) {
      next(error);
    }
  };

  public unsubscribe = async (
    req: Request, 
    res: Response, 
    next: NextFunction
  ) => {
    try {
      const { token } = req.params as { token: string };
      if (!token) throw new BadRequestException('Invalid token');

      await this.subscriptionService.unsubscribe(token);
      res.status(200).json({ message: 'Unsubscribed successfully' });
    } catch (error) {
      next(error);
    }
  };

  public getSubscriptions = async (
    req: Request, 
    res: Response, 
    next: NextFunction
  ) => {
    try {
      const email = req.query.email as string;
      if (!email) throw new BadRequestException('Invalid email');

      const subscriptions = await this.subscriptionService.getSubscriptions(email);
      res.status(200).json(subscriptions);
    } catch (error) {
      next(error);
    }
  };
}