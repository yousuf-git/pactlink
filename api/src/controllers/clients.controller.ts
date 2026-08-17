import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ClientModel } from '../models/index.js';
import { asyncHandler, NotFoundError } from '../middleware/error.js';
import type { CreateClientInput, UpdateClientInput } from '../validation/client.schema.js';

/** GET /api/v1/clients — owner-scoped client list. */
export const listClients = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = new Types.ObjectId(req.user!.sub);
  const clients = await ClientModel.find({ ownerId }).sort({ createdAt: -1 });
  res.json({ data: clients });
});

/** GET /api/v1/clients/:id */
export const getClient = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = new Types.ObjectId(req.user!.sub);
  const client = await ClientModel.findOne({ _id: req.params.id, ownerId });
  if (!client) throw new NotFoundError('Client');
  res.json({ data: client });
});

/** POST /api/v1/clients — create an owner-scoped client. */
export const createClient = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = new Types.ObjectId(req.user!.sub);
  const body = req.body as CreateClientInput;
  const client = await ClientModel.create({ ...body, ownerId });
  res.status(201).json({ data: client });
});

/** PATCH /api/v1/clients/:id */
export const updateClient = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = new Types.ObjectId(req.user!.sub);
  const body = req.body as UpdateClientInput;
  const client = await ClientModel.findOneAndUpdate(
    { _id: req.params.id, ownerId },
    { $set: body },
    { new: true, runValidators: true },
  );
  if (!client) throw new NotFoundError('Client');
  res.json({ data: client });
});

/** DELETE /api/v1/clients/:id */
export const deleteClient = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = new Types.ObjectId(req.user!.sub);
  const client = await ClientModel.findOneAndDelete({ _id: req.params.id, ownerId });
  if (!client) throw new NotFoundError('Client');
  res.status(204).send();
});
