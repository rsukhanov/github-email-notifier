import { GithubService } from './modules/subscription/github.service';
import { SubscriptionService } from './modules/subscription/subscription.service';
import { SubscriptionController } from './modules/subscription/subscription.controller';
import { SubscriptionRoutes } from './modules/subscription/subscription.routes';
import { App } from './app';
import express from 'express';
import { ScannerService } from './modules/scanner/scanner.service';
import { NotifierService } from './modules/notifier/notifier.service';
import { MetricsService } from './general/metrics/metrics.service';

export function buildAppContainer(): App {
  const githubService = new GithubService();
  const notifierService = new NotifierService();
  
  const scannerService = new ScannerService(githubService, notifierService);
  scannerService.start();

  const subscriptionService = new SubscriptionService(githubService, notifierService);
  const subscriptionController = new SubscriptionController(subscriptionService);

  const subscriptionRoutes = new SubscriptionRoutes(subscriptionController);

  const metricsService = new MetricsService();
  const expressInstance = express();
  return new App(expressInstance, subscriptionRoutes, metricsService);
}
