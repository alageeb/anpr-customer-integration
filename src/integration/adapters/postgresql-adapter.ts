import { Pool } from 'pg';
import { CustomerDatabaseAdapter } from '../interfaces/adapter';
import { CustomerRecord, VehicleRecord } from '../interfaces/types';
import { CustomerSystemConfig } from '../interfaces/config';
import { loadMapping } from '../config/customer-db-mapping';

export class PostgreSQLAdapter implements CustomerDatabaseAdapter {
  private pool: Pool | null = null;
  private config: CustomerSystemConfig;

  constructor(config: CustomerSystemConfig) {
    this.config = config;
  }

  private async getPool(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    this.pool = new Pool({
      host: this.config.dbHost,
      port: this.config.dbPort,
      database: this.config.dbName,
      user: this.config.dbUser,
      password: this.config.dbPassword,
      connectionTimeoutMillis: this.config.connectionTimeout,
      query_timeout: this.config.requestTimeout,
      max: 5,
    });

    return this.pool;
  }

  async testConnection(): Promise<{ success: boolean; message: string; responseTimeMs: number }> {
    const start = Date.now();
    try {
      const pool = await this.getPool();
      const client = await pool.connect();
      await client.query('SELECT 1 AS health_check');
      client.release();
      return {
        success: true,
        message: 'Connected successfully',
        responseTimeMs: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Connection failed: ${message}`,
        responseTimeMs: Date.now() - start,
      };
    }
  }

  async findCustomerByPlate(
    normalizedPlate: string
  ): Promise<{ customer: CustomerRecord | null; vehicle: VehicleRecord | null }> {
    const mapping = loadMapping();
    const pool = await this.getPool();

    const result = await pool.query(
      `SELECT
        v.${mapping.vehicleIdColumn} AS "vehicleId",
        v.${mapping.plateNumberColumn} AS "plateNumber",
        v.${mapping.vehicleModelColumn} AS "model",
        v.${mapping.vehicleColorColumn} AS "color",
        v.${mapping.vehicleStatusColumn} AS "vehicleStatus",
        v.${mapping.vehicleCustomerIdColumn} AS "customerId",
        c.${mapping.customerIdColumn} AS "externalCustomerId",
        c.${mapping.customerNameColumn} AS "name",
        c.${mapping.customerPhoneColumn} AS "phone",
        c.${mapping.customerStatusColumn} AS "customerStatus"
      FROM ${mapping.vehiclesTable} v
      INNER JOIN ${mapping.customersTable} c ON v.${mapping.vehicleCustomerIdColumn} = c.${mapping.customerIdColumn}
      WHERE v.${mapping.plateNumberColumn} = $1
      LIMIT 1`,
      [normalizedPlate]
    );

    if (result.rows.length === 0) {
      return { customer: null, vehicle: null };
    }

    const row = result.rows[0];
    const customer: CustomerRecord = {
      externalCustomerId: String(row.externalCustomerId),
      name: row.name,
      phone: row.phone,
      status: row.customerStatus,
    };

    const vehicle: VehicleRecord = {
      externalVehicleId: String(row.vehicleId),
      plateNumber: row.plateNumber,
      platePrefix: '',
      plateSerial: '',
      normalizedPlate,
      model: row.model,
      color: row.color,
      status: row.vehicleStatus,
      customerId: String(row.customerId),
    };

    return { customer, vehicle };
  }

  async getCustomerVehicles(customerId: string): Promise<VehicleRecord[]> {
    const mapping = loadMapping();
    const pool = await this.getPool();

    const result = await pool.query(
      `SELECT
        ${mapping.vehicleIdColumn} AS "vehicleId",
        ${mapping.plateNumberColumn} AS "plateNumber",
        ${mapping.vehicleModelColumn} AS "model",
        ${mapping.vehicleColorColumn} AS "color",
        ${mapping.vehicleStatusColumn} AS "vehicleStatus",
        ${mapping.vehicleCustomerIdColumn} AS "customerId"
      FROM ${mapping.vehiclesTable}
      WHERE ${mapping.vehicleCustomerIdColumn} = $1`,
      [customerId]
    );

    return result.rows.map((row) => ({
      externalVehicleId: String(row.vehicleId),
      plateNumber: row.plateNumber,
      platePrefix: '',
      plateSerial: '',
      normalizedPlate: '',
      model: row.model,
      color: row.color,
      status: row.vehicleStatus,
      customerId: String(row.customerId),
    }));
  }

  async getCustomerStatus(customerId: string): Promise<{ status: string } | null> {
    const mapping = loadMapping();
    const pool = await this.getPool();

    const result = await pool.query(
      `SELECT ${mapping.customerStatusColumn} AS "status"
      FROM ${mapping.customersTable}
      WHERE ${mapping.customerIdColumn} = $1
      LIMIT 1`,
      [customerId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return { status: result.rows[0].status };
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
