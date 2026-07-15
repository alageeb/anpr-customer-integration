import { loadMapping, setMapping, resetMapping } from '../../src/integration/config/customer-db-mapping';

describe('Database Mapping Configuration', () => {
  afterEach(() => {
    resetMapping();
  });

  it('should return default mapping', () => {
    const mapping = loadMapping();
    expect(mapping.customersTable).toBe('customers');
    expect(mapping.vehiclesTable).toBe('vehicles');
    expect(mapping.customerIdColumn).toBe('id');
    expect(mapping.plateNumberColumn).toBe('plate_number');
  });

  it('should allow custom table names', () => {
    setMapping({
      customersTable: 'tbl_customers',
      vehiclesTable: 'tbl_vehicles',
    });

    const mapping = loadMapping();
    expect(mapping.customersTable).toBe('tbl_customers');
    expect(mapping.vehiclesTable).toBe('tbl_vehicles');
    // Defaults should still be preserved
    expect(mapping.customerIdColumn).toBe('id');
  });

  it('should allow custom column names', () => {
    setMapping({
      customerNameColumn: 'full_name',
      vehicleModelColumn: 'car_model',
    });

    const mapping = loadMapping();
    expect(mapping.customerNameColumn).toBe('full_name');
    expect(mapping.vehicleModelColumn).toBe('car_model');
    // Defaults should still be preserved
    expect(mapping.customersTable).toBe('customers');
  });

  it('should reset to defaults', () => {
    setMapping({ customersTable: 'custom' });
    resetMapping();

    const mapping = loadMapping();
    expect(mapping.customersTable).toBe('customers');
  });
});
