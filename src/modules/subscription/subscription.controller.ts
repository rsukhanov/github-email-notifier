import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { BadRequestException } from '../../general/exceptions/http.exception';

export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService
  ) {}

  public subscribe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, repository } = req.body as CreateSubscriptionDto;

      if (!email || !repository) {
        throw new BadRequestException('Email and repository are required');
      }

      await this.subscriptionService.subscribe(email, repository);

      res.status(201).json({ message: 'Subscribed successfully' });
    } catch (error) {
      next(error);
    }
  };
}