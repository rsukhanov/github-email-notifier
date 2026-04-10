import express, { Application, NextFunction, Request, Response } from 'express';
import { SubscriptionRoutes } from './modules/subscription/subscription.routes';
import { HttpException } from './general/exceptions/http.exception';
import { serve, setup } from 'swagger-ui-express';
import cors from 'cors';
import YAML from 'yamljs';
import path from 'path';
import { MetricsService } from './general/metrics/metrics.service';

export class App {
  constructor(
    public app: Application = express(),
    private subscriptionRoutes: SubscriptionRoutes,
    private metricsService: MetricsService
  ) {
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSwagger();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares() {
    this.app.use(cors());
    this.app.use(express.json());

    this.app.use(express.static(path.join(process.cwd(), 'public')));
    
    this.app.use(this.metricsService.metricsMiddleware);
  }

  private initializeRoutes() {
    this.app.get('/metrics', this.metricsService.getMetricsRoute);
    this.app.use('/api', this.subscriptionRoutes.router);
  }

  private initializeSwagger() {
    const swaggerDocument = YAML.load(path.join(process.cwd(), 'swagger.yaml'));
    this.app.use('/api-docs', serve, setup(swaggerDocument));
  }


  private initializeErrorHandling() {
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