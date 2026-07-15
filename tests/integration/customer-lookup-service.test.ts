import { MockAdapter } from '../../src/integration/adapters/mock-adapter';
import { CustomerLookupService } from '../../src/integration/services/customer-lookup-service';
import { CustomerSystemConfig } from '../../src/integration/interfaces/config';

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
    maxRetries: 1,
    retryDelayMs: 100,
    anprSecret: 'test-secret',
  };
}

describe('CustomerLookupService', () => {
  let adapter: MockAdapter;
  let service: CustomerLookupService;

  beforeEach(() => {
    adapter = new MockAdapter();
    service = new CustomerLookupService(adapter, createMockConfig());
  });

  afterEach(async () => {
    await service.close();
  });

  describe('lookup - found plate', () => {
    it('should return customer and vehicle data for existing plate', async () => {
      const result = await service.lookup('25-64831', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(true);
      expect(result.plateNumber).toBe('25-64831');
      expect(result.platePrefix).toBe('25');
      expect(result.plateSerial).toBe('64831');
      expect(result.normalizedPlate).toBe('2564831');
      expect(result.customer).not.toBeNull();
      expect(result.customer?.name).toBe('Ahmed Youssef');
      expect(result.vehicle).not.toBeNull();
      expect(result.vehicle?.model).toBe('Toyota Camry');
      expect(result.accessDecision.allowed).toBe(true);
      expect(result.accessDecision.reason).toBe('Active customer and registered vehicle');
    });

    it('should handle plate with leading zeros in serial', async () => {
      const result = await service.lookup('40-00000', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(true);
      expect(result.plateNumber).toBe('40-00000');
      expect(result.platePrefix).toBe('40');
      expect(result.plateSerial).toBe('00000');
      expect(result.normalizedPlate).toBe('4000000');
      expect(result.customer?.name).toBe('Mohammed Ali');
    });

    it('should handle single digit prefix', async () => {
      const result = await service.lookup('4-66759', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(true);
      expect(result.plateNumber).toBe('4-66759');
      expect(result.platePrefix).toBe('4');
      expect(result.plateSerial).toBe('66759');
      expect(result.normalizedPlate).toBe('466759');
    });
  });

  describe('lookup - not found plate', () => {
    it('should return not found for non-existing plate', async () => {
      const result = await service.lookup('99-99999', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(false);
      expect(result.plateNumber).toBe('99-99999');
      expect(result.platePrefix).toBe('99');
      expect(result.plateSerial).toBe('99999');
      expect(result.normalizedPlate).toBe('9999999');
      expect(result.customer).toBeNull();
      expect(result.vehicle).toBeNull();
      expect(result.accessDecision.allowed).toBe(false);
      expect(result.accessDecision.reason).toBe('Vehicle not found in customer system');
    });
  });

  describe('lookup - inactive customer', () => {
    it('should deny access for inactive customer', async () => {
      const result = await service.lookup('4-66759', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(true);
      expect(result.accessDecision.allowed).toBe(false);
      expect(result.accessDecision.reason).toBe('Customer account is inactive');
    });
  });

  describe('lookup - normalize plate input', () => {
    it('should normalize Arabic plate input', async () => {
      const result = await service.lookup('٢٥-٦٤٨٣١', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(true);
      expect(result.plateNumber).toBe('25-64831');
      expect(result.normalizedPlate).toBe('2564831');
    });

    it('should normalize space-separated input', async () => {
      const result = await service.lookup('25 64831', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(true);
      expect(result.plateNumber).toBe('25-64831');
    });

    it('should normalize slash-separated input', async () => {
      const result = await service.lookup('25 / 64831', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(true);
      expect(result.plateNumber).toBe('25-64831');
    });

    it('should normalize no-separator input (ANPR multi-line read)', async () => {
      const result = await service.lookup('2564831', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(true);
      expect(result.plateNumber).toBe('25-64831');
      expect(result.platePrefix).toBe('25');
      expect(result.plateSerial).toBe('64831');
      expect(result.normalizedPlate).toBe('2564831');
    });

    it('should normalize no-separator single digit prefix', async () => {
      const result = await service.lookup('466759', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(true);
      expect(result.plateNumber).toBe('4-66759');
      expect(result.platePrefix).toBe('4');
      expect(result.plateSerial).toBe('66759');
    });
  });

  describe('lookup - invalid plate format', () => {
    it('should reject plate with letters', async () => {
      const result = await service.lookup('AB-12345', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(false);
      expect(result.accessDecision.reason).toBe('Invalid plate format');
    });

    it('should handle empty plate', async () => {
      const result = await service.lookup('', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(false);
      expect(result.accessDecision.reason).toBe('Invalid plate format');
    });

    it('should reject plate without separator and wrong digit count', async () => {
      const result = await service.lookup('40000', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(false);
      expect(result.accessDecision.reason).toBe('Invalid plate format');
    });

    it('should reject plate with serial less than 3 digits', async () => {
      const result = await service.lookup('40-12', 'gate-1', '2026-07-14T17:30:00');

      expect(result.found).toBe(false);
      expect(result.accessDecision.reason).toBe('Invalid plate format');
    });
  });
});
