import '../fuseau';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities';

loadEnv();

const toInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  // Mêmes règles que l'application : voir app.module.ts.
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: toInt(process.env.DB_PORT, 5433),
        username: process.env.DB_USER ?? 'ablode',
        password: process.env.DB_PASSWORD ?? 'ablode',
        database: process.env.DB_NAME ?? 'ablode',
      }),
  ...(process.env.DB_SSL === 'true'
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
  entities: ENTITIES,
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  // Les migrations font foi : `synchronize` reste désactivé y compris en dev.
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
};

export default new DataSource(dataSourceOptions);
