import { Request, Response } from 'express';
import moment from 'moment-timezone';
import { HttpException } from '../../exceptions';
import { OutgoRequestModel, UserModel } from '../../models';
import { OutgoRequestStatus } from '../../types';

export const getMyOutgoRequests = async (req: Request, res: Response) => {
  const { user } = req;
  const startDate = moment().subtract(2, 'weeks').toDate();
  const outgoRequests = await OutgoRequestModel
    .find({
      applier: { $all: [user._id] },
      createdAt: { $gte: startDate },
    })
    .populateTs('applier')
    .populateTs('approver');

  res.json({ outgoRequests });
};

export const getOutgoRequest = async (req: Request, res: Response) => {
  const { user } = req;
  const outgoRequest = await OutgoRequestModel
    .findById(req.params.outgoRequestId)
    .populateTs('approver')
    .populateTs('applier');
  if (!outgoRequest) throw new HttpException(404, '해당 외출 신청이 없습니다.');

  const applierIds = outgoRequest.applier.map((a) => a._id);
  if (user.userType === 'S' && !applierIds.includes(user._id)) {
    throw new HttpException(403, '권한이 없습니다.');
  }
  res.json({ outgoRequest });
};

export const createOutgoRequest = async (req: Request, res: Response) => {
  const request = req.body;
  const { user } = req;
  if (!request.applier.includes(user._id)) {
    throw new HttpException(403, '자신의 외출만 신청할 수 있습니다.');
  }

  const { userType: approverType } = await UserModel.findById(request.approver);
  if (approverType !== 'T') {
    throw new HttpException(403, '승인자는 교사여야 합니다.');
  }

  const now = new Date();
  if (request.duration.start <= now || now <= request.duration.end) {
    throw new HttpException(400, '외출 신청 시간을 확인해 주세요.');
  }

  const outgoRequest = new OutgoRequestModel();
  Object.assign(outgoRequest, {
    ...request,
    status: OutgoRequestStatus.applied,
  });

  await outgoRequest.save();

  res.json({ outgoRequest });
};
