import { Router, Request, Response } from 'express';
import { CustomerLookupService } from '../integration/services/customer-lookup-service';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

// SSE Clients
interface DisplayClient {
  id: string;
  branchId: string;
  screenId: string;
  response: Response;
  lastHeartbeat: Date;
}

// WebSocket Clients
interface WSClient {
  id: string;
  branchId: string;
  screenId: string;
  ws: WebSocket;
  lastHeartbeat: Date;
}

const sseClients = new Map<string, DisplayClient>();
const wsClients = new Map<string, WSClient>();

// Export broadcast function for other modules
export function broadcastToDisplays(branchId: string, eventType: string, data: any) {
  const event = {
    type: eventType,
    ...data,
    timestamp: new Date().toISOString(),
  };

  let sentCount = 0;

  // Broadcast to SSE clients
  sseClients.forEach((client) => {
    if (client.branchId === branchId) {
      try {
        client.response.write(`data: ${JSON.stringify(event)}\n\n`);
        sentCount++;
      } catch {
        sseClients.delete(client.id);
      }
    }
  });

  // Broadcast to WebSocket clients
  wsClients.forEach((client) => {
    if (client.branchId === branchId && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(event));
        sentCount++;
      } catch {
        wsClients.delete(client.id);
      }
    }
  });

  return sentCount;
}

// Setup WebSocket server on existing HTTP server
export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws/display' });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || '';
    const branchId = url.searchParams.get('branchId') || '';
    const screenId = url.searchParams.get('screenId') || '';

    if (!token || !branchId || !screenId) {
      ws.close(1008, 'Missing required parameters');
      return;
    }

    const clientId = `${branchId}-${screenId}-ws-${Date.now()}`;
    const client: WSClient = {
      id: clientId,
      branchId,
      screenId,
      ws,
      lastHeartbeat: new Date(),
    };

    wsClients.set(clientId, client);
    console.log(`WebSocket client connected: ${clientId}`);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString()
    }));

    // Handle messages
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'heartbeat') {
          client.lastHeartbeat = new Date();
          ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: new Date().toISOString() }));
        }
      } catch {
        // Ignore invalid messages
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      wsClients.delete(clientId);
      console.log(`WebSocket client disconnected: ${clientId}`);
    });

    ws.on('error', () => {
      wsClients.delete(clientId);
    });

    // Ping interval for keep-alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
        wsClients.delete(clientId);
      }
    }, 30000);
  });

  console.log('WebSocket server initialized on /ws/display');
}

export function createDisplayRealtimeRouter(
  lookupService: CustomerLookupService
): Router {
  const router = Router();

  // SSE endpoint for display clients
  router.get('/events', (req: Request, res: Response) => {
    const token = req.query.token as string;
    const branchId = req.query.branchId as string;
    const screenId = req.query.screenId as string;

    if (!token || !branchId || !screenId) {
      res.status(400).json({ error: 'token, branchId, and screenId are required' });
      return;
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    const clientId = `${branchId}-${screenId}-${Date.now()}`;
    const client: DisplayClient = {
      id: clientId,
      branchId,
      screenId,
      response: res,
      lastHeartbeat: new Date(),
    };

    sseClients.set(clientId, client);
    console.log(`SSE client connected: ${clientId}`);

    // Heartbeat interval
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
        client.lastHeartbeat = new Date();
      } catch {
        clearInterval(heartbeatInterval);
        sseClients.delete(clientId);
      }
    }, 30000);

    // Cleanup on disconnect
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      sseClients.delete(clientId);
      console.log(`SSE client disconnected: ${clientId}`);
    });
  });

  // HTTP endpoint to broadcast check-in events to display clients
  router.post('/broadcast/checkin', (req: Request, res: Response) => {
    const { branchId, customerName, plateNumber, lane, ticketNumber } = req.body;

    if (!branchId || !customerName || !plateNumber) {
      res.status(400).json({ error: 'branchId, customerName, and plateNumber are required' });
      return;
    }

    const sentCount = broadcastToDisplays(branchId, 'checkin', {
      customerName,
      plateNumber,
      lane: lane || 'A',
      ticketNumber: ticketNumber || `T-${Date.now()}`
    });

    res.json({ success: true, sentTo: sentCount });
  });

  // HTTP endpoint to broadcast queue updates
  router.post('/broadcast/queue', (req: Request, res: Response) => {
    const { branchId, nowServing, waiting } = req.body;

    if (!branchId) {
      res.status(400).json({ error: 'branchId is required' });
      return;
    }

    const sentCount = broadcastToDisplays(branchId, 'queue', {
      nowServing: nowServing || [],
      waiting: waiting || []
    });

    res.json({ success: true, sentTo: sentCount });
  });

  // HTTP endpoint to broadcast call ticket
  router.post('/broadcast/call', (req: Request, res: Response) => {
    const { branchId, ticketNumber, customerName, lane } = req.body;

    if (!branchId || !ticketNumber) {
      res.status(400).json({ error: 'branchId and ticketNumber are required' });
      return;
    }

    const sentCount = broadcastToDisplays(branchId, 'call', {
      ticketNumber,
      customerName: customerName || '',
      lane: lane || 'A'
    });

    res.json({ success: true, sentTo: sentCount });
  });

  // Status endpoint
  router.get('/status', (_req: Request, res: Response) => {
    const sseList = Array.from(sseClients.values()).map((c) => ({
      id: c.id,
      type: 'SSE',
      branchId: c.branchId,
      screenId: c.screenId,
      lastHeartbeat: c.lastHeartbeat,
    }));

    const wsList = Array.from(wsClients.values()).map((c) => ({
      id: c.id,
      type: 'WebSocket',
      branchId: c.branchId,
      screenId: c.screenId,
      lastHeartbeat: c.lastHeartbeat,
    }));

    res.json({
      totalClients: sseClients.size + wsClients.size,
      sseClients: sseClients.size,
      wsClients: wsClients.size,
      clients: [...sseList, ...wsList],
    });
  });

  // Test page for browser
  router.get('/test', (_req: Request, res: Response) => {
    res.type('html').send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>Display API Test</title>
<style>
body{font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:20px;max-width:800px;margin:0 auto}
h1{color:#38bdf8;margin-bottom:20px}
.btn{padding:12px 24px;border:none;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;margin:4px}
.btn-primary{background:#38bdf8;color:#0f172a}
.btn-green{background:#34d399;color:#0f172a}
.btn-yellow{background:#fbbf24;color:#0f172a}
.btn-red{background:#f87171;color:#fff}
.result{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin-top:16px;white-space:pre-wrap}
.field{margin:8px 0}
.field label{display:block;color:#94a3b8;margin-bottom:4px}
.field input{width:100%;padding:8px;border:1px solid #334155;border-radius:4px;background:#0f172a;color:#e2e8f0;font-size:14px}
.sse{background:#1e293b;border:1px solid #34d399;border-radius:8px;padding:16px;margin-top:16px;max-height:300px;overflow-y:auto}
.sse-event{border-bottom:1px solid #334155;padding:8px 0;font-size:13px}
.connected{color:#34d399;font-weight:bold}
h3{color:#94a3b8;margin-top:16px}
</style>
</head>
<body>
<h1>Display API Test Panel</h1>

<div class="field">
<label>Backend URL</label>
<input type="text" id="baseUrl" value="http://localhost:3000">
</div>
<div class="field">
<label>Branch ID</label>
<input type="text" id="branchId" value="branch-01">
</div>

<h3>1. SSE Connection</h3>
<button class="btn btn-green" onclick="connectSSE()">Connect SSE</button>
<button class="btn btn-red" onclick="disconnectSSE()">Disconnect</button>
<div class="sse" id="sseLog">Waiting for connection...</div>

<h3>2. Broadcast Events</h3>
<button class="btn btn-primary" onclick="broadcastCheckin()">Check-in</button>
<button class="btn btn-yellow" onclick="broadcastQueue()">Queue Update</button>
<button class="btn btn-primary" onclick="broadcastCall()">Call Ticket</button>

<h3>3. API Status</h3>
<button class="btn btn-green" onclick="getStatus()">Get Status</button>
<div class="result" id="statusResult">Click to check...</div>

<script>
let eventSource = null;

function connectSSE() {
  const base = document.getElementById('baseUrl').value;
  const branch = document.getElementById('branchId').value;
  const url = base + '/api/display/events?token=test&branchId=' + branch + '&screenId=test-screen';
  
  eventSource = new EventSource(url);
  const log = document.getElementById('sseLog');
  log.innerHTML = '<div class="connected">Connecting to: ' + url + '</div>';
  
  eventSource.onmessage = function(e) {
    const data = JSON.parse(e.data);
    log.innerHTML = '<div class="sse-event"><b>' + data.type + '</b> - ' + JSON.stringify(data) + '</div>' + log.innerHTML;
  };
  
  eventSource.onerror = function() {
    log.innerHTML = '<div style="color:#f87171">Connection error</div>' + log.innerHTML;
  };
}

function disconnectSSE() {
  if (eventSource) { eventSource.close(); eventSource = null; }
  document.getElementById('sseLog').innerHTML += '<div style="color:#f87171">Disconnected</div>';
}

async function broadcastCheckin() {
  const base = document.getElementById('baseUrl').value;
  const branch = document.getElementById('branchId').value;
  const resp = await fetch(base + '/api/display/broadcast/checkin', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      branchId: branch,
      customerName: 'Ahmed',
      plateNumber: '40-00000',
      lane: 'A',
      ticketNumber: 'T-' + Math.floor(Math.random()*9000+1000)
    })
  });
  const data = await resp.json();
  document.getElementById('statusResult').textContent = JSON.stringify(data, null, 2);
}

async function broadcastQueue() {
  const base = document.getElementById('baseUrl').value;
  const branch = document.getElementById('branchId').value;
  const resp = await fetch(base + '/api/display/broadcast/queue', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      branchId: branch,
      nowServing: [{ticketNumber:'T-1001',customerName:'Ahmed',plateNumber:'40-00000',lane:'A'}],
      waiting: [{ticketNumber:'T-1002',customerName:'Fatima',plateNumber:'25-64831',lane:'B'}]
    })
  });
  const data = await resp.json();
  document.getElementById('statusResult').textContent = JSON.stringify(data, null, 2);
}

async function broadcastCall() {
  const base = document.getElementById('baseUrl').value;
  const branch = document.getElementById('branchId').value;
  const resp = await fetch(base + '/api/display/broadcast/call', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      branchId: branch,
      ticketNumber: 'T-' + Math.floor(Math.random()*9000+1000),
      customerName: 'Khalid',
      lane: 'C'
    })
  });
  const data = await resp.json();
  document.getElementById('statusResult').textContent = JSON.stringify(data, null, 2);
}

async function getStatus() {
  const base = document.getElementById('baseUrl').value;
  const resp = await fetch(base + '/api/display/status');
  const data = await resp.json();
  document.getElementById('statusResult').textContent = JSON.stringify(data, null, 2);
}
</script>
</body>
</html>`);
  });

  return router;
}
