import { Router, Request, Response } from 'express';

export function createDocsRouter(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.type('html').send(DOCS_HTML);
  });

  return router;
}

const DOCS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ANPR API Documentation</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.6}
.header{background:linear-gradient(135deg,#1e293b,#0f172a);border-bottom:1px solid #334155;padding:20px 40px}
.header h1{font-size:24px;color:#38bdf8}
.header p{color:#94a3b8;font-size:14px}
.container{max-width:1000px;margin:0 auto;padding:30px 40px}
.section{margin-bottom:40px}
.section h2{color:#38bdf8;font-size:20px;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #334155}
.endpoint{background:#1e293b;border:1px solid #334155;border-radius:8px;margin-bottom:16px;overflow:hidden}
.endpoint-header{padding:12px 16px;display:flex;align-items:center;gap:12px;cursor:pointer}
.endpoint-header:hover{background:#0f172a}
.method{padding:4px 10px;border-radius:4px;font-size:12px;font-weight:700;font-family:monospace}
.method-get{background:#34d39920;color:#34d399}
.method-post{background:#38bdf820;color:#38bdf8}
.method-ws{background:#fbbf2420;color:#fbbf24}
.path{font-family:monospace;font-size:14px;color:#e2e8f0}
.desc{color:#94a3b8;font-size:13px;flex:1}
.endpoint-body{padding:16px;border-top:1px solid #334155;display:none}
.endpoint-body.show{display:block}
.param-table{width:100%;border-collapse:collapse;margin:12px 0}
.param-table th{text-align:left;padding:8px;color:#94a3b8;font-size:12px;border-bottom:1px solid #334155}
.param-table td{padding:8px;font-size:13px;border-bottom:1px solid #1e293b}
.param-name{font-family:monospace;color:#38bdf8}
.param-required{color:#f87171;font-size:11px}
.param-optional{color:#64748b;font-size:11px}
pre{background:#0f172a;border:1px solid #334155;border-radius:6px;padding:12px;overflow-x:auto;font-size:13px;color:#94a3b8;margin:8px 0}
code{font-family:'Courier New',monospace}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;margin-left:8px}
.badge-auth{background:#fbbf2420;color:#fbbf24}
.badge-public{background:#34d39920;color:#34d399}
.nav{position:fixed;top:80px;right:20px;width:200px}
.nav a{display:block;padding:6px 12px;color:#94a3b8;text-decoration:none;font-size:13px;border-radius:4px}
.nav a:hover{background:#1e293b;color:#38bdf8}
</style>
</head>
<body>
<div class="header">
  <h1>ANPR Integration API Documentation</h1>
  <p>REST API for Automatic Number Plate Recognition system with queue management and real-time display</p>
</div>
<div class="container">

<div class="section">
  <h2>ANPR Endpoints</h2>

  <div class="endpoint">
    <div class="endpoint-header" onclick="this.nextElementSibling.classList.toggle('show')">
      <span class="method method-post">POST</span>
      <span class="path">/api/anpr/customer-lookup</span>
      <span class="desc">Look up customer by plate number</span>
      <span class="badge badge-auth">Auth Required</span>
    </div>
    <div class="endpoint-body">
      <p>Auth: <code>X-ANPR-Secret</code> header</p>
      <table class="param-table">
        <tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr>
        <tr><td class="param-name">plateNumber</td><td>string</td><td><span class="param-required">required</span></td><td>Kuwait plate number (e.g. "40-00000")</td></tr>
        <tr><td class="param-name">cameraId</td><td>string</td><td><span class="param-required">required</span></td><td>Camera identifier</td></tr>
        <tr><td class="param-name">eventTime</td><td>string</td><td><span class="param-required">required</span></td><td>ISO 8601 timestamp</td></tr>
      </table>
      <pre><code>{
  "found": true,
  "plateNumber": "40-00000",
  "customer": { "name": "Ahmed", "status": "active" },
  "vehicle": { "model": "Toyota Camry", "color": "White" },
  "accessDecision": { "allowed": true, "reason": "Active customer" }
}</code></pre>
    </div>
  </div>
</div>

<div class="section">
  <h2>Queue Management</h2>

  <div class="endpoint">
    <div class="endpoint-header" onclick="this.nextElementSibling.classList.toggle('show')">
      <span class="method method-get">GET</span>
      <span class="path">/api/queue/tickets</span>
      <span class="desc">Get all tickets for a branch</span>
      <span class="badge badge-public">Public</span>
    </div>
    <div class="endpoint-body">
      <table class="param-table">
        <tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr>
        <tr><td class="param-name">branchId</td><td>string</td><td><span class="param-optional">optional</span></td><td>Branch ID (default: "branch-01")</td></tr>
      </table>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header" onclick="this.nextElementSibling.classList.toggle('show')">
      <span class="method method-post">POST</span>
      <span class="path">/api/queue/tickets</span>
      <span class="desc">Add a new ticket</span>
      <span class="badge badge-auth">PIN Required</span>
    </div>
    <div class="endpoint-body">
      <p>Auth: <code>X-Dashboard-PIN</code> header</p>
      <table class="param-table">
        <tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr>
        <tr><td class="param-name">customerName</td><td>string</td><td><span class="param-required">required</span></td><td>Customer name</td></tr>
        <tr><td class="param-name">plateNumber</td><td>string</td><td><span class="param-required">required</span></td><td>License plate</td></tr>
        <tr><td class="param-name">lane</td><td>string</td><td><span class="param-optional">optional</span></td><td>Lane (A/B/C/VIP)</td></tr>
      </table>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header" onclick="this.nextElementSibling.classList.toggle('show')">
      <span class="method method-post">POST</span>
      <span class="path">/api/queue/tickets/call-next</span>
      <span class="desc">Call next waiting ticket</span>
      <span class="badge badge-auth">PIN Required</span>
    </div>
    <div class="endpoint-body"><p>No parameters needed. Calls the next ticket in FIFO order.</p></div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header" onclick="this.nextElementSibling.classList.toggle('show')">
      <span class="method method-post">POST</span>
      <span class="path">/api/queue/tickets/:id/call</span>
      <span class="desc">Call a specific ticket</span>
      <span class="badge badge-auth">PIN Required</span>
    </div>
    <div class="endpoint-body"><p>Path param: <code>id</code> - Ticket ID (e.g. "t-1001")</p></div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header" onclick="this.nextElementSibling.classList.toggle('show')">
      <span class="method method-post">POST</span>
      <span class="path">/api/queue/tickets/:id/complete</span>
      <span class="desc">Mark ticket as completed</span>
      <span class="badge badge-auth">PIN Required</span>
    </div>
    <div class="endpoint-body"><p>Path param: <code>id</code> - Ticket ID</p></div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header" onclick="this.nextElementSibling.classList.toggle('show')">
      <span class="method method-post">POST</span>
      <span class="path">/api/queue/tickets/reset</span>
      <span class="desc">Reset all tickets for a branch</span>
      <span class="badge badge-auth">PIN Required</span>
    </div>
    <div class="endpoint-body"><p>Deletes all tickets for the specified branch.</p></div>
  </div>
</div>

<div class="section">
  <h2>Real-time Display</h2>

  <div class="endpoint">
    <div class="endpoint-header" onclick="this.nextElementSibling.classList.toggle('show')">
      <span class="method method-get">GET</span>
      <span class="path">/api/display/events</span>
      <span class="desc">SSE event stream for displays</span>
    </div>
    <div class="endpoint-body">
      <table class="param-table">
        <tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr>
        <tr><td class="param-name">token</td><td>string</td><td><span class="param-required">required</span></td><td>Display token</td></tr>
        <tr><td class="param-name">branchId</td><td>string</td><td><span class="param-required">required</span></td><td>Branch ID</td></tr>
        <tr><td class="param-name">screenId</td><td>string</td><td><span class="param-required">required</span></td><td>Screen identifier</td></tr>
      </table>
      <p>Events: <code>checkin</code>, <code>queue</code>, <code>call</code>, <code>heartbeat</code></p>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header" onclick="this.nextElementSibling.classList.toggle('show')">
      <span class="method method-ws">WS</span>
      <span class="path">/ws/display</span>
      <span class="desc">WebSocket for displays</span>
    </div>
    <div class="endpoint-body">
      <p>Connect: <code>ws://host:3000/ws/display?token=xxx&branchId=branch-01&screenId=screen-01</code></p>
      <p>Same event types as SSE. Send <code>{"type":"heartbeat"}</code> to keep alive.</p>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header" onclick="this.nextElementSibling.classList.toggle('show')">
      <span class="method method-post">POST</span>
      <span class="path">/api/display/broadcast/checkin</span>
      <span class="desc">Broadcast check-in to displays</span>
    </div>
    <div class="endpoint-body">
      <table class="param-table">
        <tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr>
        <tr><td class="param-name">branchId</td><td>string</td><td><span class="param-required">required</span></td><td>Target branch</td></tr>
        <tr><td class="param-name">customerName</td><td>string</td><td><span class="param-required">required</span></td><td>Customer name</td></tr>
        <tr><td class="param-name">plateNumber</td><td>string</td><td><span class="param-required">required</span></td><td>License plate</td></tr>
        <tr><td class="param-name">lane</td><td>string</td><td><span class="param-optional">optional</span></td><td>Lane (default: "A")</td></tr>
        <tr><td class="param-name">ticketNumber</td><td>string</td><td><span class="param-optional">optional</span></td><td>Ticket number</td></tr>
      </table>
    </div>
  </div>
</div>

<div class="section">
  <h2>Diagnostics</h2>

  <div class="endpoint">
    <div class="endpoint-header" onclick="this.nextElementSibling.classList.toggle('show')">
      <span class="method method-get">GET</span>
      <span class="path">/api/diagnostic/status</span>
      <span class="desc">Database connection status</span>
    </div>
    <div class="endpoint-body"><p>Returns DB type, connection status, response time, and mapping config.</p></div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header" onclick="this.nextElementSibling.classList.toggle('show')">
      <span class="method method-get">GET</span>
      <span class="path">/health</span>
      <span class="desc">Health check</span>
    </div>
    <div class="endpoint-body"><p>Returns <code>{"status":"ok","timestamp":"..."}</code></p></div>
  </div>
</div>

</div>
</body>
</html>`;
