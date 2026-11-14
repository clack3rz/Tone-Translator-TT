import type { RequestHandler } from 'express';

export const denySourceExport: RequestHandler = (_req, res) => {
  res.status(403).json({ error: 'Source archive export is disabled', code: 'FORBIDDEN' });
};
