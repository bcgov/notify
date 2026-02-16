/**
 * Load .env.local with override so it wins over devcontainer env (e.g. .env.example).
 * Must be imported first in main.ts, before AppModule.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local'), override: true });
