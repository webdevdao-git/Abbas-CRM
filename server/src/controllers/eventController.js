import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { asyncHandler, notFound } from '../utils/errors.js';
import { TEMPLATE_PLACEHOLDERS } from '../utils/templates.js';
import { deliveryMode } from '../services/whatsappService.js';

/// Every screen reads event details from here rather than hardcoding them.
export async function getActiveEvent() {
  const event = await prisma.event.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    include: { functions: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!event) throw notFound('No active event configured. Run the seed script.');
  return event;
}

/// Resolves a function key ("ENGAGEMENT" / "DAREES") to its row.
export async function getFunctionByKey(event, key) {
  const fn = event.functions.find((candidate) => candidate.key === key);
  if (!fn) throw notFound(`Function ${key} is not configured for this event.`);
  return fn;
}

export const getEvent = asyncHandler(async (_req, res) => {
  const { functions, ...event } = await getActiveEvent();
  res.json({
    event,
    functions,
    whatsappMode: deliveryMode(),
    placeholders: TEMPLATE_PLACEHOLDERS,
  });
});

export const updateEventSchema = z.object({
  name: z.string().trim().min(1, 'Event name is required').max(120),
  date: z.coerce.date({ errorMap: () => ({ message: 'A valid event date is required' }) }),
  venue: z.string().trim().max(200).optional().or(z.literal('')),
  hostName: z.string().trim().max(120).optional().or(z.literal('')),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const updateEvent = asyncHandler(async (req, res) => {
  const current = await getActiveEvent();
  const event = await prisma.event.update({ where: { id: current.id }, data: req.body });
  res.json({ event });
});

// ------------------------------------------------------------- functions

export const updateFunctionSchema = z.object({
  name: z.string().trim().min(1, 'Function name is required').max(120),
  time: z.string().trim().max(80).optional().or(z.literal('')),
  venue: z.string().trim().max(200).optional().or(z.literal('')),
});

export const updateFunction = asyncHandler(async (req, res) => {
  const event = await getActiveEvent();
  const fn = await getFunctionByKey(event, req.params.key.toUpperCase());

  const updated = await prisma.eventFunction.update({ where: { id: fn.id }, data: req.body });
  res.json({ function: updated });
});

// ------------------------------------------------------------- templates

export const listTemplates = asyncHandler(async (_req, res) => {
  const event = await getActiveEvent();
  const templates = await prisma.messageTemplate.findMany({
    where: { eventId: event.id },
    orderBy: { key: 'asc' },
  });
  res.json({ templates, placeholders: TEMPLATE_PLACEHOLDERS });
});

export const updateTemplateSchema = z.object({
  body: z.string().trim().min(1, 'Message body cannot be empty').max(4000),
  name: z.string().trim().max(120).optional(),
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const event = await getActiveEvent();
  const key = req.params.key.toUpperCase();

  const template = await prisma.messageTemplate.update({
    where: { eventId_key: { eventId: event.id, key } },
    data: req.body,
  });
  res.json({ template });
});
