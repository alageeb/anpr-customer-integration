import { CustomerRecord, VehicleRecord } from './types';

export interface CustomerDatabaseAdapter {
  testConnection(): Promise<{ success: boolean; message: string; responseTimeMs: number }>;
  findCustomerByPlate(normalizedPlate: string): Promise<{ customer: CustomerRecord | null; vehicle: VehicleRecord | null }>;
  getCustomerVehicles(customerId: string): Promise<VehicleRecord[]>;
  getCustomerStatus(customerId: string): Promise<{ status: string } | null>;
  close(): Promise<void>;
}
