export interface CustomerSystemConfig {
  dbType: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbEncrypt: boolean;
  dbTrustCertificate: boolean;
  mockMode: boolean;
  connectionTimeout: number;
  requestTimeout: number;
  maxRetries: number;
  retryDelayMs: number;
  anprSecret: string;
}

export function loadConfig(): CustomerSystemConfig {
  return {
    dbType: process.env.CUSTOMER_DB_TYPE || 'mssql',
    dbHost: process.env.CUSTOMER_DB_HOST || '',
    dbPort: parseInt(process.env.CUSTOMER_DB_PORT || '1433', 10),
    dbName: process.env.CUSTOMER_DB_NAME || '',
    dbUser: process.env.CUSTOMER_DB_USER || '',
    dbPassword: process.env.CUSTOMER_DB_PASSWORD || '',
    dbEncrypt: process.env.CUSTOMER_DB_ENCRYPT === 'true',
    dbTrustCertificate: process.env.CUSTOMER_DB_TRUST_CERTIFICATE === 'true',
    mockMode: process.env.CUSTOMER_DB_MOCK_MODE === 'true',
    connectionTimeout: parseInt(process.env.CUSTOMER_DB_CONNECTION_TIMEOUT || '5000', 10),
    requestTimeout: parseInt(process.env.CUSTOMER_DB_REQUEST_TIMEOUT || '10000', 10),
    maxRetries: parseInt(process.env.CUSTOMER_DB_MAX_RETRIES || '1', 10),
    retryDelayMs: parseInt(process.env.CUSTOMER_DB_RETRY_DELAY_MS || '1000', 10),
    anprSecret: process.env.ANPR_INTEGRATION_SECRET || '',
  };
}
