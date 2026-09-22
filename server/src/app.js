import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env, isProduction, isWhatsAppApiConfigured } from './config/env.js';
import { checkDatabase } from './config/prisma.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import guestRoutes from './routes/guestRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import statsRoutes from './routes/statsRoutes.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin/serverless requests arrive without an Origin header.
      if (!origin || env.clientOrigins.includes(origin) || !isProduction) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
if (!isProduction) app.use(morgan('dev'));

app.get('/api/health', async (_req, res) => {
  const database = await checkDatabase();
  res.status(database.connected ? 200 : 503).json({
    status: database.connected ? 'ok' : 'degraded',
    database,
    whatsappMode: isWhatsAppApiConfigured ? 'cloud-api' : 'click-to-chat',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/stats', statsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
