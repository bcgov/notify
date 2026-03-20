import { config } from 'dotenv';
import { resolve } from 'path';

// Quiet logs when running e2e tests
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent';

const baseFile = process.env.E2E_ENV_FILE || resolve(__dirname, 'env.local');
config({ path: baseFile, quiet: true });

const localFile =
  process.env.E2E_LOCAL_ENV_FILE || resolve(__dirname, '../../.env.local');
config({ path: localFile, quiet: true });
