import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export class MetricsService {
  private register: client.Registry;
  private httpRequestsTotal: client.Counter<string>;
  private httpRequestDuration: client.Histogram<string>;

  constructor() {
    this.register = new client.Registry();

    client.collectDefaultMetrics({ register: this.register });

    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_ms',
      help: 'Duration of HTTP requests in ms',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [50, 100, 250, 500, 1000, 2500], 
      registers: [this.register],
    });
  }

  public metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const route = req.route ? req.route.path : req.path;

      this.httpRequestsTotal.inc({
        method: req.method,
        route: route,
        status_code: res.statusCode,
      });

      this.httpRequestDuration.observe(
        { method: req.method, route: route, status_code: res.statusCode },
        duration
      );
    });

    next();
  };

  public getMetricsRoute = async (req: Request, res: Response) => {
    res.set('Content-Type', this.register.contentType);
    res.end(await this.register.metrics());
  };
}