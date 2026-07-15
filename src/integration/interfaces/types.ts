export interface CustomerRecord {
  externalCustomerId: string;
  name: string;
  phone: string;
  status: string;
}

export interface VehicleRecord {
  externalVehicleId: string;
  plateNumber: string;
  platePrefix: string;
  plateSerial: string;
  normalizedPlate: string;
  model: string;
  color: string;
  status: string;
  customerId: string;
  permitExpiry?: string;
}

export interface CustomerLookupResult {
  found: boolean;
  plateNumber: string;
  platePrefix: string;
  plateSerial: string;
  normalizedPlate: string;
  customer: CustomerRecord | null;
  vehicle: VehicleRecord | null;
  accessDecision: {
    allowed: boolean;
    reason: string;
  };
  systemAvailable?: boolean;
}

export interface ANPRRequest {
  plateNumber: string;
  cameraId: string;
  eventTime: string;
}

export interface LookupLogEntry {
  id?: number;
  detectedPlate: string;
  normalizedPlate: string;
  cameraId: string;
  eventTime: string;
  customerFound: boolean;
  externalCustomerId: string | null;
  externalVehicleId: string | null;
  accessAllowed: boolean;
  accessReason: string;
  lookupDurationMs: number;
  errorMessage: string | null;
  createdAt?: Date;
}

import { DatabaseMapping } from './mapping';

export interface DiagnosticInfo {
  dbType: string;
  connectionStatus: 'Connected' | 'Disconnected';
  lastTestTime: string;
  responseTimeMs: number;
  mapping: DatabaseMapping;
}
