import sqlite3 from 'sqlite3';
import { LookupLogEntry } from '../interfaces/types';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'anpr_lookup_logs.db');

let db: sqlite3.Database | null = null;

function getDb(): sqlite3.Database {
  if (db) return db;

  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Failed to open lookup logs database:', err.message);
    }
  });

  return db;
}

export function initializeLogsTable(): Promise<void> {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.run(
      `CREATE TABLE IF NOT EXISTS anpr_lookup_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        detected_plate TEXT NOT NULL,
        normalized_plate TEXT NOT NULL,
        camera_id TEXT NOT NULL,
        event_time TEXT NOT NULL,
        customer_found INTEGER NOT NULL DEFAULT 0,
        external_customer_id TEXT,
        external_vehicle_id TEXT,
        access_allowed INTEGER NOT NULL DEFAULT 0,
        access_reason TEXT NOT NULL,
        lookup_duration_ms INTEGER NOT NULL,
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

export function logLookup(entry: LookupLogEntry): Promise<void> {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.run(
      `INSERT INTO anpr_lookup_logs
        (detected_plate, normalized_plate, camera_id, event_time,
         customer_found, external_customer_id, external_vehicle_id,
         access_allowed, access_reason, lookup_duration_ms, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.detectedPlate,
        entry.normalizedPlate,
        entry.cameraId,
        entry.eventTime,
        entry.customerFound ? 1 : 0,
        entry.externalCustomerId,
        entry.externalVehicleId,
        entry.accessAllowed ? 1 : 0,
        entry.accessReason,
        entry.lookupDurationMs,
        entry.errorMessage,
      ],
      (err) => {
        if (err) {
          console.error('Failed to log lookup:', err.message);
          resolve(); // Don't fail the request because of logging
        } else {
          resolve();
        }
      }
    );
  });
}

export function getLookupLogs(limit: number = 100): Promise<LookupLogEntry[]> {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.all(
      `SELECT * FROM anpr_lookup_logs ORDER BY id DESC LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(
            (rows as any[]).map((row) => ({
              id: row.id,
              detectedPlate: row.detected_plate,
              normalizedPlate: row.normalized_plate,
              cameraId: row.camera_id,
              eventTime: row.event_time,
              customerFound: row.customer_found === 1,
              externalCustomerId: row.external_customer_id,
              externalVehicleId: row.external_vehicle_id,
              accessAllowed: row.access_allowed === 1,
              accessReason: row.access_reason,
              lookupDurationMs: row.lookup_duration_ms,
              errorMessage: row.error_message,
              createdAt: row.created_at,
            }))
          );
        }
      }
    );
  });
}

export function closeLogsDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
