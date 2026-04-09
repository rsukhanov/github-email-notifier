import express, { Application, NextFunction, Request, Response } from 'express';
import { SubscriptionRoutes } from './modules/subscription/subscription.routes';
import { HttpException } from './general/exceptions/http.exception';
import { serve, setup } from 'swagger-ui-express';
import cors from 'cors';
import YAML from 'yamljs';
import path from 'path';

export class App {
  constructor(
    public app: Application = express(),
    private subscriptionRoutes: SubscriptionRoutes
  ) {
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSwagger();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private initializeRoutes() {
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', message: 'API is running smoothly' });
    });

    this.app.use('/api', this.subscriptionRoutes.router);
  }

  private initializeSwagger() {
    const swaggerDocument = YAML.load(path.join(process.cwd(), 'swagger.yaml'));
    this.app.use('/api-docs', serve, setup(swaggerDocument));
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