import { Request, Response } from 'express';
import { HttpException } from '../../exceptions';
import { MealModel } from '../../models';
import {
  isValidDate, getWeekStartString, getWeekEndString, getTodayDateString,
} from '../../resources/date';

export const getWeeklyMeals = async (req: Request, res: Response) => {
  const meals = await MealModel.find({
    date: {
      $gte: getWeekStartString(),
      $lte: getWeekEndString(),
    },
  });

  res.json({ meals });
};

export const getTodayMeal = async (req: Request, res: Response) => {
  const date = getTodayDateString();
  const meal = await MealModel.findOne({ date });
  if (!meal) throw new HttpException(404, '오늘의 급식 정보가 없습니다.');

  res.json({ meal });
};

export const getMealByDate = async (req: Request, res: Response) => {
  let { date } = req.params;
  if (date === 'today') date = getTodayDateString();
  if (!isValidDate(date)) throw new HttpException(400, '유효하지 않은 날짜입니다.');

  const meal = await MealModel.findOne({ date });
  if (!meal) throw new HttpException(404, '해당 날짜의 급식 정보가 없습니다.');

  res.json({ meal });
};

export const editMealByDate = async (req: Request, res: Response) => {
  const { date } = req.params;
  if (!isValidDate(date)) throw new HttpException(400, '유효하지 않은 날짜입니다.');

  const meal = await MealModel.findOne({ date });
  if (!meal) throw new HttpException(404, '해당 날짜의 급식 정보가 없습니다.');

  Object.assign(meal, req.body);
  await meal.save();

  res.json({ meal });
};

export const createMeal = async (req: Request, res: Response) => {
  const { date } = req.params;
  if (!isValidDate(date)) throw new HttpException(400, '유효하지 않은 날짜입니다.');

  const meal = await new MealModel({
    date,
    ...req.body,
  }).save();
  res.json({ meal });
};
