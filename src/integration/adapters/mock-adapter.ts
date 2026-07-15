import { CustomerDatabaseAdapter } from '../interfaces/adapter';
import { CustomerRecord, VehicleRecord } from '../interfaces/types';

const MOCK_CUSTOMERS: CustomerRecord[] = [
  { externalCustomerId: '1001', name: 'Ahmed Youssef', phone: '551234567', status: 'active' },
  { externalCustomerId: '1002', name: 'Mohammed Ali', phone: '559876543', status: 'active' },
  { externalCustomerId: '1003', name: 'Sara Hassan', phone: '554321876', status: 'inactive' },
  { externalCustomerId: '1004', name: 'Khalid Al-Sabah', phone: '551112223', status: 'active' },
  { externalCustomerId: '1005', name: 'Fatima Al-Rashid', phone: '559998877', status: 'active' },
  { externalCustomerId: '1006', name: 'Omar Al-Qattan', phone: '556665544', status: 'blocked' },
  { externalCustomerId: '1007', name: 'Noor Al-Saeed', phone: '553332211', status: 'active' },
];

const MOCK_VEHICLES: VehicleRecord[] = [
  {
    externalVehicleId: '5001', plateNumber: '25-64831', platePrefix: '25', plateSerial: '64831',
    normalizedPlate: '2564831', model: 'Toyota Camry', color: 'White', status: 'active',
    customerId: '1001', permitExpiry: '2027-12-31',
  },
  {
    externalVehicleId: '5002', plateNumber: '40-00000', platePrefix: '40', plateSerial: '00000',
    normalizedPlate: '4000000', model: 'Honda Accord', color: 'Black', status: 'active',
    customerId: '1002', permitExpiry: '2026-06-30',
  },
  {
    externalVehicleId: '5003', plateNumber: '4-66759', platePrefix: '4', plateSerial: '66759',
    normalizedPlate: '466759', model: 'Ford Focus', color: 'Red', status: 'inactive',
    customerId: '1003', permitExpiry: '2025-01-15',
  },
  {
    externalVehicleId: '5004', plateNumber: '18-12345', platePrefix: '18', plateSerial: '12345',
    normalizedPlate: '1812345', model: 'Nissan Altima', color: 'Silver', status: 'active',
    customerId: '1004', permitExpiry: '2027-03-20',
  },
  {
    externalVehicleId: '5005', plateNumber: '7-00987', platePrefix: '7', plateSerial: '00987',
    normalizedPlate: '700987', model: 'Hyundai Sonata', color: 'Blue', status: 'active',
    customerId: '1005', permitExpiry: '2026-09-10',
  },
  {
    externalVehicleId: '5006', plateNumber: '33-45678', platePrefix: '33', plateSerial: '45678',
    normalizedPlate: '3345678', model: 'Kia Optima', color: 'Gray', status: 'blocked',
    customerId: '1006', permitExpiry: '2026-12-31',
  },
  {
    externalVehicleId: '5007', plateNumber: '12-11111', platePrefix: '12', plateSerial: '11111',
    normalizedPlate: '1211111', model: 'Toyota Land Cruiser', color: 'White', status: 'active',
    customerId: '1007', permitExpiry: '2027-08-15',
  },
  {
    externalVehicleId: '5008', plateNumber: '5-54321', platePrefix: '5', plateSerial: '54321',
    normalizedPlate: '554321', model: 'BMW X5', color: 'Black', status: 'active',
    customerId: '1001', permitExpiry: '2026-11-30',
  },
  {
    externalVehicleId: '5009', plateNumber: '27-00045', platePrefix: '27', plateSerial: '00045',
    normalizedPlate: '2700045', model: 'Mercedes C-Class', color: 'Silver', status: 'active',
    customerId: '1004', permitExpiry: '2027-05-01',
  },
  {
    externalVehicleId: '5010', plateNumber: '9-88888', platePrefix: '9', plateSerial: '88888',
    normalizedPlate: '988888', model: 'Chevrolet Malibu', color: 'Red', status: 'expired',
    customerId: '1005', permitExpiry: '2025-06-01',
  },
];

export { MOCK_CUSTOMERS, MOCK_VEHICLES };

export class MockAdapter implements CustomerDatabaseAdapter {
  async testConnection(): Promise<{ success: boolean; message: string; responseTimeMs: number }> {
    const start = Date.now();
    await this.simulateDelay(50);
    return {
      success: true,
      message: 'Mock connection successful (Demo Mode)',
      responseTimeMs: Date.now() - start,
    };
  }

  async findCustomerByPlate(
    normalizedPlate: string
  ): Promise<{ customer: CustomerRecord | null; vehicle: VehicleRecord | null }> {
    await this.simulateDelay(30);

    const vehicle = MOCK_VEHICLES.find((v) => v.normalizedPlate === normalizedPlate);
    if (!vehicle) {
      return { customer: null, vehicle: null };
    }

    const customer = MOCK_CUSTOMERS.find((c) => c.externalCustomerId === vehicle.customerId) || null;
    return { customer, vehicle };
  }

  async getCustomerVehicles(customerId: string): Promise<VehicleRecord[]> {
    await this.simulateDelay(20);
    return MOCK_VEHICLES.filter((v) => v.customerId === customerId);
  }

  async getCustomerStatus(customerId: string): Promise<{ status: string } | null> {
    await this.simulateDelay(20);
    const customer = MOCK_CUSTOMERS.find((c) => c.externalCustomerId === customerId);
    return customer ? { status: customer.status } : null;
  }

  async close(): Promise<void> {}

  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
