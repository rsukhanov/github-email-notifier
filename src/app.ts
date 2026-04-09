import express, { Application, Request, Response, NextFunction } from 'express';
import { SubscriptionRoutes } from './modules/subscription/subscription.routes';
import { HttpException } from './general/exceptions/http.exception';

export class App {
  constructor(
    public app: Application = express(),
    private SubscriptionRoutes: SubscriptionRoutes
  ) {
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(express.json());
  }

  private initializeRoutes(): void {
    this.app.get('/ping', (req: Request, res: Response) => {
      res.status(200).json('pong');
    });

    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', message: 'API is running smoothly' });
    });

    this.app.use('/api/subscribe', this.SubscriptionRoutes.router);
  }


  private initializeErrorHandling(): void {
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof HttpException) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }

      console.error(`[GlobalErrorHandler] Unhandled exception:`, err);
      res.status(500).json({ error: 'Internal Server Error' });
    });
  }
}