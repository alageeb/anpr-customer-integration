export interface DatabaseMapping {
  customersTable: string;
  vehiclesTable: string;
  customerIdColumn: string;
  customerNameColumn: string;
  customerPhoneColumn: string;
  customerStatusColumn: string;
  vehicleIdColumn: string;
  plateNumberColumn: string;
  vehicleModelColumn: string;
  vehicleColorColumn: string;
  vehicleStatusColumn: string;
  vehicleCustomerIdColumn: string;
}

export const DEFAULT_MAPPING: DatabaseMapping = {
  customersTable: 'customers',
  vehiclesTable: 'vehicles',
  customerIdColumn: 'id',
  customerNameColumn: 'name',
  customerPhoneColumn: 'phone',
  customerStatusColumn: 'status',
  vehicleIdColumn: 'id',
  plateNumberColumn: 'plate_number',
  vehicleModelColumn: 'model',
  vehicleColorColumn: 'color',
  vehicleStatusColumn: 'status',
  vehicleCustomerIdColumn: 'customer_id',
};
