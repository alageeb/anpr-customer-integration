import { CustomerDatabaseAdapter } from '../../src/integration/interfaces/adapter';
import { CustomerRecord, VehicleRecord } from '../../src/integration/interfaces/types';
import { CustomerLookupService } from '../../src/integration/services/customer-lookup-service';
import { CustomerSystemConfig } from '../../src/integration/interfaces/config';

class FailAdapter implements CustomerDatabaseAdapter {
  async testConnection() {
    return { success: false, message: 'Connection refused', responseTimeMs: 100 };
  }
  async findCustomerByPlate(_normalizedPlate: string): Promise<{ customer: CustomerRecord | null; vehicle: VehicleRecord | null }> {
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

class AuthFailAdapter implements CustomerDatabaseAdapter {
  async testConnection() {
    return { success: false, message: 'Authentication failed', responseTimeMs: 50 };
  }
  async findCustomerByPlate(_normalizedPlate: string): Promise<{ customer: CustomerRecord | null; vehicle: VehicleRecord | null }> {
    throw new Error('Authentication failed: invalid credentials');
  }
  async getCustomerVehicles(_customerId: string): Promise<VehicleRecord[]> {
    throw new Error('Authentication failed');
  }
  async getCustomerStatus(_customerId: string): Promise<{ status: string } | null> {
    throw new Error('Authentication failed');
  }
  async close() {}
}

function createMockConfig(overrides: Partial<CustomerSystemConfig> = {}): CustomerSystemConfig {
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
    maxRetries: 1,
    retryDelayMs: 100,
    anprSecret: 'test-secret',
    ...overrides,
  };
}

describe('CustomerLookupService - Error Handling', () => {
  describe('database unavailable', () => {
    it('should return systemAvailable false when connection fails', async () => {
      const adapter = new FailAdapter();
      const service = new CustomerLookupService(adapter, createMockConfig());

      const result = await service.lookup('25-64831', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(false);
      expect(result.systemAvailable).toBe(false);
      expect(result.accessDecision.allowed).toBe(false);
      expect(result.accessDecision.reason).toBe('Customer system unavailable');

      await service.close();
    });

    it('should not retry on authentication errors', async () => {
      const adapter = new AuthFailAdapter();
      const service = new CustomerLookupService(adapter, createMockConfig({ maxRetries: 3 }));

      const result = await service.lookup('25-64831', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(false);
      expect(result.systemAvailable).toBe(false);

      await service.close();
    });
  });
});
