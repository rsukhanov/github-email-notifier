import { GithubService } from './modules/subscription/github.service';
import { SubscriptionService } from './modules/subscription/subscription.service';
import { SubscriptionController } from './modules/subscription/subscription.controller';
import { SubscriptionRoutes } from './modules/subscription/subscription.routes';
import { App } from './app';
import express from 'express';
import { ScannerService } from './modules/scanner/scanner.service';

export function buildAppContainer(): App {
  const githubService = new GithubService();
  
  const scannerService = new ScannerService(githubService);
  scannerService.start();
  
  const subscriptionService = new SubscriptionService(githubService);

  const subscriptionController = new SubscriptionController(subscriptionService);

  const subscriptionRoutes = new SubscriptionRoutes(subscriptionController);

  const expressInstance = express();
  return new App(expressInstance, subscriptionRoutes);
}
