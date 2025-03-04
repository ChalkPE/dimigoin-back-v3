import express from 'express';
import mongoose from 'mongoose';

import fs from 'fs';
import cors from 'cors';
import bearerToken from 'express-bearer-token';
import helmet from 'helmet';
import config from './config';

import { attachUserInfo, errorHandler } from './middlewares';
import { serviceRouter, serviceDocsRouter } from './services';
import { setCronJobsAndRun } from './resources/cron';

// Defualt Setting
import {
  ConfigModel,
  PlaceModel,
  AfterschoolModel,
  AfterschoolApplicationModel,
} from './models';
import { ConfigKeys } from './types';
import { defaultPlaces, defaultConfigs } from './resources/default';
import { setAfterschoolApplierCount } from './resources/redis';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.connectMongoDB();
    this.initializeRouter();
    this.initializeErrorHandlers();
    this.initializeFileStorage();
    this.initializeRedisStore();
    if (process.env.NODE_ENV === 'prod') {
      this.initializeCronJobs();
      this.initializeConfigs();
      this.initializePlaces();
    }
  }

  private initializeRouter() {
    this.app.use('/', serviceRouter);
    this.app.use('/docs', serviceDocsRouter);
  }

  private initializeMiddlewares() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(bearerToken({
      headerKey: 'Bearer',
      reqKey: 'token',
    }));
    this.app.use(attachUserInfo);
  }

  private initializeErrorHandlers() {
    this.app.use(errorHandler);
  }

  private connectMongoDB() {
    const { mongoUri } = config;
    const mongooseOption = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    };
    mongoose.connect(mongoUri, mongooseOption);
  }

  private async initializeConfigs() {
    const keys = Object.values(ConfigKeys);
    const registerdKeys = (await ConfigModel.find({})).map((c) => c.key);

    await Promise.all(
      keys
        .filter((k) => !registerdKeys.includes(k))
        .map((k) => new ConfigModel({
          key: k,
          value: defaultConfigs[k],
        }).save()),
    );
  }

  private async initializePlaces() {
    const registeredPlaces = await PlaceModel.find({});

    await Promise.all(
      defaultPlaces
        .filter((p) => !registeredPlaces.find(
          (r) => r.name === p.name,
        ))
        .map((p) => new PlaceModel(p).save()),
    );
  }

  private async initializeCronJobs() {
    await setCronJobsAndRun();
  }

  private async initializeFileStorage() {
    fs.promises.mkdir(config.fileStoragePath, { recursive: true });
  }

  private async initializeRedisStore() {
    const afterschools = await AfterschoolModel.find({});
    for (const afterschool of afterschools) {
      await setAfterschoolApplierCount(
        afterschool._id,
        await AfterschoolApplicationModel.countDocuments({
          afterschool: afterschool._id,
        }),
      );
    }
  }
}

export default App;
