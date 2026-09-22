import app from './app.js';
import { env } from './config/env.js';
import { checkDatabase } from './config/prisma.js';

const server = app.listen(env.port, async () => {
  const database = await checkDatabase();
  console.log(`\n  Abbas Engagement API  →  http://localhost:${env.port}`);
  console.log(`  Environment           →  ${env.nodeEnv}`);
  console.log(
    `  Database              →  ${database.connected ? 'connected' : `UNREACHABLE (${database.message})`}\n`
  );
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
