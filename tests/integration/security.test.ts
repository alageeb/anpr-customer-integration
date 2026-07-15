import { parsePlate, normalizePlate } from '../../src/integration/utils/plate-normalizer';
import { MockAdapter } from '../../src/integration/adapters/mock-adapter';
import { CustomerLookupService } from '../../src/integration/services/customer-lookup-service';
import { CustomerSystemConfig } from '../../src/integration/interfaces/config';
import { CustomerDatabaseAdapter } from '../../src/integration/interfaces/adapter';
import { CustomerRecord, VehicleRecord } from '../../src/integration/interfaces/types';

function createMockConfig(): CustomerSystemConfig {
  return {
    dbType: 'mock',
    dbHost: '',
    dbPort: 0,
    dbName: '',
    dbUser: '',
    dbPassword: '',
    dbEncrypt: false,
    dbTrustCertificate: false,
    mockMode: true,
    connectionTimeout: 5000,
    requestTimeout: 10000,
    maxRetries: 0,
    retryDelayMs: 0,
    anprSecret: 'test-secret',
  };
}

class TimeoutAdapter implements CustomerDatabaseAdapter {
  async testConnection() {
    return { success: true, message: 'ok', responseTimeMs: 10 };
  }
  async findCustomerByPlate(_normalizedPlate: string): Promise<{ customer: CustomerRecord | null; vehicle: VehicleRecord | null }> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    throw new Error('Connection timeout');
  }
  async getCustomerVehicles(_customerId: string): Promise<VehicleRecord[]> {
    throw new Error('Connection timeout');
  }
  async getCustomerStatus(_customerId: string): Promise<{ status: string } | null> {
    throw new Error('Connection timeout');
  }
  async close() {}
}

describe('SQL Injection Prevention', () => {
  it('should reject plate with SQL injection attempt', () => {
    const malicious = "'; DROP TABLE customers; --";
    const result = parsePlate(malicious);
    expect(result).toBeNull();
  });

  it('should reject UNION-based injection', () => {
    const malicious = "1' UNION SELECT * FROM users --";
    const result = parsePlate(malicious);
    expect(result).toBeNull();
  });

  it('should handle injection through lookup service safely', async () => {
    const adapter = new MockAdapter();
    const service = new CustomerLookupService(adapter, createMockConfig());

    const result = await service.lookup(
      "'; DROP TABLE vehicles; --",
      'gate-1',
      '2026-07-14T17:30:00'
    );

    // Should safely return invalid format (not crash or execute injection)
    expect(result.found).toBe(false);
    expect(result.accessDecision.reason).toBe('Invalid plate format');

    await service.close();
  });

  it('should reject complex injection attempts', () => {
    const malicious = "1; EXEC xp_cmdshell('format c:')";
    const result = parsePlate(malicious);
    expect(result).toBeNull();
  });
});

describe('Timeout Handling', () => {
  it('should handle adapter timeout gracefully', async () => {
    const adapter = new TimeoutAdapter();
    const service = new CustomerLookupService(adapter, createMockConfig());

    const result = await service.lookup('25-64831', 'gate-1', '2026-07-14T17:30:00');

    expect(result.found).toBe(false);
    expect(result.systemAvailable).toBe(false);
    expect(result.accessDecision.reason).toBe('Customer system unavailable');

    await service.close();
  });
});
