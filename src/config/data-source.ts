import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';

const getCliDataSourceOptions = (): DataSourceOptions => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const dbUrl = process.env.DATABASE_URL;

  const baseOptions: Partial<DataSourceOptions> = {
    type: 'postgres',
    entities: [path.join(__dirname, '/../../**/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, '/../db/migrations/*{.ts,.js}')],
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: isDevelopment ? ['query', 'error', 'warn'] : ['error', 'warn'],
  };

  if (dbUrl) {
    return {
      ...baseOptions,
      url: dbUrl,
      ssl: !isDevelopment ? { rejectUnauthorized: false } : false,
    } as DataSourceOptions;
  } else {
    return {
      ...baseOptions,
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5433', 10),
      username: process.env.POSTGRES_USER || 'futurenext_user',
      password: process.env.POSTGRES_PASSWORD || 'strong_password123',
      database: process.env.POSTGRES_DB || 'futurenext_dev',
    } as DataSourceOptions;
  }
};

export const dataSourceOptions: DataSourceOptions = getCliDataSourceOptions();
const AppCliDataSource = new DataSource(dataSourceOptions);
export default AppCliDataSource;
