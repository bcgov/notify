import { config } from 'dotenv';
import { resolve } from 'path';

const envFile = process.env.E2E_ENV_FILE || resolve(__dirname, 'env.local');
config({ path: envFile, quiet: true });
