import fs from 'fs';
import Joi from 'joi';
import {
  Router, RequestHandler, Request, Response, NextFunction,
} from 'express';

import { HTTPMethod, UserType } from '../types';
import { checkUserType, validator } from '../middlewares';

interface ValidateSchema {
  [key: string]: Joi.AnySchema;
}

interface Route {
  method: HTTPMethod;
  path: string;
  middlewares?: RequestHandler[];
  handler: RequestHandler;
  validateSchema?: ValidateSchema;
  allowedUserTypes?: (UserType | '*')[];
}

const wrapper = (asyncFn: any) =>
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      return await asyncFn(req, res, next);
    } catch (error) {
      return next(error);
    }
  }
  );

const createRouter = (routes: Route[]) => {
  const router = Router();

  routes.forEach((route) => {
    router[route.method](
      route.path,
      ...(route.allowedUserTypes
        ? [checkUserType(...route.allowedUserTypes)] : []),
      ...(route.middlewares
        ? route.middlewares : []),
      ...(route.validateSchema
        ? [validator(Joi.object(route.validateSchema))] : []),
      wrapper(route.handler),
    );
  });

  return router;
};

export const services = fs.readdirSync(__dirname)
  .filter((s) => !s.startsWith('index'))
  // eslint-disable-next-line
  .map((s) => require(`${__dirname}/${s}/routes`).default);

export const routes = services.map((s) => s.routes.map((r: Route): Route => ({
  ...r,
  path: s.baseURL + r.path,
}))).reduce((a, s) => [...a, ...s]);

export const serviceRouter = createRouter(routes);
