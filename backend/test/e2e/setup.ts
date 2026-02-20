import { config } from 'dotenv';
import { resolve } from 'path';

const baseFile = process.env.E2E_ENV_FILE || resolve(__dirname, 'env.local');
config({ path: baseFile, quiet: true });

const localFile =
  process.env.E2E_LOCAL_ENV_FILE || resolve(__dirname, '../../.env.local');
config({ path: localFile, quiet: true });
