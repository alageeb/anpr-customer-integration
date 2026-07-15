import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'anpr_queue.db');

let db: sqlite3.Database | null = null;

function getDb(): sqlite3.Database {
  if (db) return db;
  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Failed to open queue database:', err.message);
    }
  });
  return db;
}

export interface QueueTicket {
  id: string;
  ticketNumber: string;
  customerName: string;
  plateNumber: string;
  lane: string;
  status: 'waiting' | 'serving' | 'completed';
  createdAt: string;
  calledAt: string | null;
  branchId: string;
}

export function initializeQueueTable(): Promise<void> {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.run(
      `CREATE TABLE IF NOT EXISTS queue_tickets (
        id TEXT PRIMARY KEY,
        ticket_number TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        plate_number TEXT NOT NULL,
        lane TEXT NOT NULL DEFAULT 'A',
        status TEXT NOT NULL DEFAULT 'waiting',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        called_at TEXT,
        branch_id TEXT NOT NULL DEFAULT 'branch-01'
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

export function getAllTickets(branchId: string = 'branch-01'): Promise<QueueTicket[]> {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.all(
      `SELECT * FROM queue_tickets WHERE branch_id = ? ORDER BY created_at ASC`,
      [branchId],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve((rows as any[]).map(row => ({
            id: row.id,
            ticketNumber: row.ticket_number,
            customerName: row.customer_name,
            plateNumber: row.plate_number,
            lane: row.lane,
            status: row.status,
            createdAt: row.created_at,
            calledAt: row.called_at,
            branchId: row.branch_id
          })));
        }
      }
    );
  });
}

export function addTicket(ticket: QueueTicket): Promise<void> {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.run(
      `INSERT INTO queue_tickets (id, ticket_number, customer_name, plate_number, lane, status, created_at, called_at, branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ticket.id, ticket.ticketNumber, ticket.customerName, ticket.plateNumber, ticket.lane, ticket.status, ticket.createdAt, ticket.calledAt, ticket.branchId],
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

export function updateTicketStatus(id: string, status: string, calledAt?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const database = getDb();
    const query = calledAt
      ? `UPDATE queue_tickets SET status = ?, called_at = ? WHERE id = ?`
      : `UPDATE queue_tickets SET status = ? WHERE id = ?`;
    const params = calledAt ? [status, calledAt, id] : [status, id];

    database.run(query, params, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function deleteAllTickets(branchId: string = 'branch-01'): Promise<void> {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.run(
      `DELETE FROM queue_tickets WHERE branch_id = ?`,
      [branchId],
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

export function getTicketById(id: string): Promise<QueueTicket | null> {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.get(
      `SELECT * FROM queue_tickets WHERE id = ?`,
      [id],
      (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          const r = row as any;
          resolve({
            id: r.id,
            ticketNumber: r.ticket_number,
            customerName: r.customer_name,
            plateNumber: r.plate_number,
            lane: r.lane,
            status: r.status,
            createdAt: r.created_at,
            calledAt: r.called_at,
            branchId: r.branch_id
          });
        } else {
          resolve(null);
        }
      }
    );
  });
}

export function closeQueueDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
