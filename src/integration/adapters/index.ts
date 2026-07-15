import { CustomerDatabaseAdapter } from '../interfaces/adapter';
import { CustomerSystemConfig } from '../interfaces/config';
import { MockAdapter } from './mock-adapter';
import { SqlServerAdapter } from './sqlserver-adapter';
import { MySQLAdapter } from './mysql-adapter';
import { PostgreSQLAdapter } from './postgresql-adapter';

export function createAdapter(config: CustomerSystemConfig): CustomerDatabaseAdapter {
  if (config.mockMode) {
    return new MockAdapter();
  }

  switch (config.dbType.toLowerCase()) {
    case 'mssql':
    case 'sqlserver':
      return new SqlServerAdapter(config);
    case 'mysql':
      return new MySQLAdapter(config);
    case 'postgresql':
    case 'postgres':
      return new PostgreSQLAdapter(config);
    default:
      throw new Error(`Unsupported database type: ${config.dbType}`);
  }
}
