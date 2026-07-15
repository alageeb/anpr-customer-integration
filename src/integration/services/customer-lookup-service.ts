import { CustomerDatabaseAdapter } from '../interfaces/adapter';
import { CustomerLookupResult } from '../interfaces/types';
import { CustomerSystemConfig } from '../interfaces/config';
import { parsePlate, KuwaitPlate } from '../utils/plate-normalizer';
import { logLookup } from '../logs/lookup-logs';

export class CustomerLookupService {
  private adapter: CustomerDatabaseAdapter;
  private config: CustomerSystemConfig;

  constructor(adapter: CustomerDatabaseAdapter, config: CustomerSystemConfig) {
    this.adapter = adapter;
    this.config = config;
  }

  async lookup(
    plateNumber: string,
    cameraId: string,
    eventTime: string
  ): Promise<CustomerLookupResult> {
    const startTime = Date.now();
    const parsed = parsePlate(plateNumber);

    if (!parsed) {
      const result: CustomerLookupResult = {
        found: false,
        plateNumber: '',
        platePrefix: '',
        plateSerial: '',
        normalizedPlate: '',
        customer: null,
        vehicle: null,
        accessDecision: {
          allowed: false,
          reason: 'Invalid plate format',
        },
      };
      await this.logResult(result, plateNumber, cameraId, eventTime, startTime, null);
      return result;
    }

    try {
      const result = await this.executeWithRetry(parsed);
      await this.logResult(result, plateNumber, cameraId, eventTime, startTime, null);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result: CustomerLookupResult = {
        found: false,
        plateNumber: parsed.plateNumber,
        platePrefix: parsed.platePrefix,
        plateSerial: parsed.plateSerial,
        normalizedPlate: parsed.normalizedPlate,
        customer: null,
        vehicle: null,
        accessDecision: {
          allowed: false,
          reason: 'Customer system unavailable',
        },
        systemAvailable: false,
      };
      await this.logResult(result, plateNumber, cameraId, eventTime, startTime, errorMessage);
      return result;
    }
  }

  private async executeWithRetry(parsed: KuwaitPlate): Promise<CustomerLookupResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await this.performLookup(parsed);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on authentication errors or non-transient errors
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }

        // Only retry if we have retries left
        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelayMs);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private async performLookup(parsed: KuwaitPlate): Promise<CustomerLookupResult> {
    const { customer, vehicle } = await this.adapter.findCustomerByPlate(parsed.normalizedPlate);

    if (!vehicle) {
      return {
        found: false,
        plateNumber: parsed.plateNumber,
        platePrefix: parsed.platePrefix,
        plateSerial: parsed.plateSerial,
        normalizedPlate: parsed.normalizedPlate,
        customer: null,
        vehicle: null,
        accessDecision: {
          allowed: false,
          reason: 'Vehicle not found in customer system',
        },
      };
    }

    const accessAllowed = this.determineAccess(customer, vehicle);
    const reason = this.getAccessReason(customer, vehicle, accessAllowed);

    return {
      found: true,
      plateNumber: parsed.plateNumber,
      platePrefix: parsed.platePrefix,
      plateSerial: parsed.plateSerial,
      normalizedPlate: parsed.normalizedPlate,
      customer,
      vehicle,
      accessDecision: {
        allowed: accessAllowed,
        reason,
      },
    };
  }

  private determineAccess(
    customer: { status: string } | null,
    vehicle: { status: string }
  ): boolean {
    if (!customer) {
      return false;
    }
    return customer.status === 'active' && vehicle.status === 'active';
  }

  private getAccessReason(
    customer: { status: string } | null,
    vehicle: { status: string },
    allowed: boolean
  ): string {
    if (!customer) {
      return 'Customer not found in system';
    }
    if (customer.status !== 'active') {
      return 'Customer account is inactive';
    }
    if (vehicle.status !== 'active') {
      return 'Vehicle is inactive';
    }
    return 'Active customer and registered vehicle';
  }

  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('authentication') ||
      message.includes('login') ||
      message.includes('permission') ||
      message.includes('access denied') ||
      message.includes('invalid credentials')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async logResult(
    result: CustomerLookupResult,
    detectedPlate: string,
    cameraId: string,
    eventTime: string,
    startTime: number,
    errorMessage: string | null
  ): Promise<void> {
    try {
      await logLookup({
        detectedPlate,
        normalizedPlate: result.normalizedPlate,
        cameraId,
        eventTime,
        customerFound: result.found,
        externalCustomerId: result.customer?.externalCustomerId || null,
        externalVehicleId: result.vehicle?.externalVehicleId || null,
        accessAllowed: result.accessDecision.allowed,
        accessReason: result.accessDecision.reason,
        lookupDurationMs: Date.now() - startTime,
        errorMessage,
      });
    } catch {
      // Silently fail - logging should not break the flow
    }
  }

  async close(): Promise<void> {
    await this.adapter.close();
  }
}
