import type { Application } from 'express';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AppService } from './app.service';

/** Registers `GET /` and `HEAD /` for gateway / LB probes (version-agnostic). */
@Injectable()
export class ServiceRootRegistrar implements OnModuleInit {
  constructor(
    private readonly appService: AppService,
    private readonly adapterHost: HttpAdapterHost,
  ) {}

  onModuleInit() {
    const expressApp: Application = this.adapterHost.httpAdapter.getInstance();
    expressApp.get('/', (_req, res) => {
      res.status(200).json(this.appService.getServiceRoot());
    });
    expressApp.head('/', (_req, res) => {
      res.status(200).end();
    });
  }
}
