import { Router, Request, Response } from 'express';
import { getLookupLogs } from '../integration/logs/lookup-logs';

export function createHistoryRouter(): Router {
  const router = Router();

  // History page
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const logs = await getLookupLogs(100);
      res.type('html').send(renderHistoryPage(logs));
    } catch (error) {
      res.type('html').send(renderHistoryPage([]));
    }
  });

  // API: get logs as JSON
  router.get('/api/logs', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await getLookupLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  return router;
}

function renderHistoryPage(logs: any[]): string {
  const rows = logs.map(log => `
    <tr>
      <td>${log.createdAt || '--'}</td>
      <td style="font-family:monospace;font-weight:600">${log.detectedPlate}</td>
      <td style="font-family:monospace">${log.normalizedPlate}</td>
      <td>${log.cameraId}</td>
      <td>${log.externalCustomerId || '--'}</td>
      <td><span class="status-${log.accessAllowed ? 'active' : 'blocked'}">${log.accessAllowed ? 'ALLOWED' : 'DENIED'}</span></td>
      <td>${log.accessReason}</td>
      <td>${log.lookupDurationMs}ms</td>
      <td>${log.errorMessage || '--'}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>Lookup History</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
.header{background:linear-gradient(135deg,#1e293b,#0f172a);border-bottom:1px solid #334155;padding:12px 24px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:20px;font-weight:600;color:#38bdf8}
.header a{color:#38bdf8;text-decoration:none;font-size:14px}
.container{max-width:1400px;margin:0 auto;padding:16px}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px}
.table-container{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{text-align:right;padding:10px 12px;background:#0f172a;color:#94a3b8;font-size:12px;font-weight:600;border-bottom:1px solid #334155;position:sticky;top:0}
td{padding:10px 12px;font-size:13px;border-bottom:1px solid #1e293b}
tr:hover{background:#1e293b}
.status-active{color:#34d399;font-weight:600}
.status-blocked{color:#f87171;font-weight:600}
.stats{display:flex;gap:16px;margin-bottom:16px}
.stat{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px 20px;text-align:center}
.stat-val{font-size:24px;font-weight:700;color:#38bdf8}
.stat-lbl{font-size:11px;color:#94a3b8;margin-top:4px}
</style>
</head>
<body>
<div class="header">
  <h1>Lookup History</h1>
  <div style="display:flex;gap:16px;align-items:center">
    <a href="/api/queue">Queue Dashboard</a>
    <a href="/demo/anpr">ANPR Demo</a>
  </div>
</div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-val">${logs.length}</div><div class="stat-lbl">Total Lookups</div></div>
    <div class="stat"><div class="stat-val">${logs.filter(l => l.accessAllowed).length}</div><div class="stat-lbl">Allowed</div></div>
    <div class="stat"><div class="stat-val">${logs.filter(l => !l.accessAllowed).length}</div><div class="stat-lbl">Denied</div></div>
    <div class="stat"><div class="stat-val">${logs.filter(l => l.errorMessage).length}</div><div class="stat-lbl">Errors</div></div>
  </div>
  <div class="card">
    <div class="table-container" style="max-height:70vh;overflow-y:auto">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Detected Plate</th>
            <th>Normalized</th>
            <th>Camera</th>
            <th>Customer ID</th>
            <th>Decision</th>
            <th>Reason</th>
            <th>Duration</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="9" style="text-align:center;padding:40px;color:#64748b">No history records yet</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>
</div>
</body>
</html>`;
}
