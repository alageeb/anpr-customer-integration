import { Router, Request, Response } from 'express';
import { CustomerLookupService } from '../integration/services/customer-lookup-service';
import { MOCK_CUSTOMERS, MOCK_VEHICLES } from '../integration/adapters/mock-adapter';

export function createDemoRouter(lookupService: CustomerLookupService): Router {
  const router = Router();

  // API endpoint for plate lookup (no auth required for demo)
  router.post('/api/lookup', async (req: Request, res: Response) => {
    try {
      const { plateNumber, cameraId } = req.body;
      if (!plateNumber) {
        res.status(400).json({ error: 'plateNumber is required' });
        return;
      }
      const result = await lookupService.lookup(
        plateNumber.trim(),
        cameraId || 'demo-gate',
        new Date().toISOString()
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({
        found: false,
        plateNumber: '',
        platePrefix: '',
        plateSerial: '',
        normalizedPlate: '',
        customer: null,
        vehicle: null,
        accessDecision: { allowed: false, reason: 'System error' },
        systemAvailable: false,
      });
    }
  });

  // API: get all mock plates for the random picker
  router.get('/api/plates', (_req: Request, res: Response) => {
    const plates = MOCK_VEHICLES.map((v) => ({
      plateNumber: v.plateNumber,
      model: v.model,
      color: v.color,
    }));
    res.json(plates);
  });

  // Serve the demo HTML page
  router.get('/', (_req: Request, res: Response) => {
    res.type('html').send(DEMO_HTML);
  });

  // API to broadcast check-in to displays
  router.post('/api/broadcast', async (req: Request, res: Response) => {
    try {
      const { customerName, plateNumber, lane, ticketNumber } = req.body;
      const { broadcastToDisplays } = require('../api/display-realtime-routes');
      const sentCount = broadcastToDisplays('branch-01', 'checkin', {
        customerName: customerName || 'عميل',
        plateNumber: plateNumber || '40-00000',
        lane: lane || 'A',
        ticketNumber: ticketNumber || `T-${Date.now()}`
      });
      res.json({ success: true, sentTo: sentCount });
    } catch (error) {
      res.status(500).json({ error: 'Failed to broadcast' });
    }
  });

  return router;
}

const DEMO_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ANPR Demo - Kuwait</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
.header{background:linear-gradient(135deg,#1e293b,#0f172a);border-bottom:1px solid #334155;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:20px;font-weight:600;color:#38bdf8}
.badge{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
.badge-mock{background:#7c3aed20;color:#a78bfa;border:1px solid #7c3aed50}
.container{max-width:1200px;margin:0 auto;padding:20px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
@media(max-width:768px){.grid{grid-template-columns:1fr}}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px}
.card-title{font-size:14px;color:#94a3b8;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.card-title span{font-size:16px}
.input-group{display:flex;gap:8px;margin-bottom:12px}
.input-group input,.input-group select{flex:1;padding:10px 14px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:16px;font-family:inherit}
.input-group input:focus,.input-group select:focus{outline:none;border-color:#38bdf8}
.btn{padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}
.btn-primary{background:#38bdf8;color:#0f172a}
.btn-primary:hover{background:#7dd3fc}
.btn-secondary{background:#334155;color:#e2e8f0}
.btn-secondary:hover{background:#475569}
.btn-danger{background:#ef4444;color:white}
.btn-danger:hover{background:#f87171}
.btn-sm{padding:6px 12px;font-size:12px}
.plate-display{text-align:center;padding:20px;background:#0f172a;border-radius:8px;margin-bottom:12px}
.plate-display .plate-number{font-size:36px;font-weight:800;letter-spacing:4px;color:#38bdf8;font-family:'Courier New',monospace}
.plate-display .plate-sub{font-size:13px;color:#64748b;margin-top:4px}
.result-section{margin-top:16px}
.info-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1e293b}
.info-row:last-child{border:none}
.info-label{color:#94a3b8;font-size:13px}
.info-value{color:#e2e8f0;font-size:13px;font-weight:500}
.access-badge{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:16px;font-weight:700;width:100%;justify-content:center;margin-top:8px}
.access-allowed{background:#05966920;color:#34d399;border:2px solid #059669}
.access-denied{background:#dc262620;color:#f87171;border:2px solid #dc2629}
.access-unavailable{background:#d9770620;color:#fbbf24;border:2px solid #d97706}
.snapshot{width:100%;height:120px;background:#0f172a;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#475569;font-size:14px;border:1px dashed #334155}
.table-container{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{text-align:right;padding:10px 12px;background:#0f172a;color:#94a3b8;font-size:12px;font-weight:600;border-bottom:1px solid #334155}
td{padding:10px 12px;font-size:13px;border-bottom:1px solid #1e293b}
.status-active{color:#34d399}
.status-inactive{color:#fbbf24}
.status-blocked{color:#f87171}
.status-expired{color:#fb923c}
.scenario-buttons{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.loading{opacity:.5;pointer-events:none}
.hidden{display:none}
.response-time{font-size:12px;color:#64748b;margin-top:4px}
</style>
</head>
<body>
<div class="header">
  <h1>ANPR Customer Lookup Demo</h1>
  <div style="display:flex;align-items:center;gap:12px">
    <span id="sseStatus" style="color:#64748b;font-size:12px">● Offline</span>
    <span class="badge badge-mock">MOCK MODE</span>
    <span style="color:#64748b;font-size:13px">Kuwait License Plate System</span>
  </div>
</div>
<div class="container">
  <!-- Input Section -->
  <div class="card" style="margin-bottom:20px">
    <div class="card-title"><span>&#128270;</span> Plate Lookup</div>
    <div class="input-group">
      <input type="text" id="plateInput" placeholder="Enter plate number (e.g. 40-00000)" dir="ltr" style="text-align:left;font-weight:600">
      <select id="cameraSelect">
        <option value="main-gate">Main Gate</option>
        <option value="exit-gate">Exit Gate</option>
        <option value="visitor-gate">Visitor Gate</option>
      </select>
      <button class="btn btn-primary" onclick="lookupPlate()">Scan Plate</button>
      <button class="btn btn-secondary" onclick="randomPlate()">Random</button>
      <button class="btn btn-danger btn-sm" onclick="clearResult()">Clear</button>
    </div>
    <div class="scenario-buttons">
      <button class="btn btn-secondary btn-sm" onclick="runScenario('2564831')">Authorized Vehicle</button>
      <button class="btn btn-secondary btn-sm" onclick="runScenario('466759')">Inactive Customer</button>
      <button class="btn btn-secondary btn-sm" onclick="runScenario('988888')">Expired Permit</button>
      <button class="btn btn-secondary btn-sm" onclick="runScenario('3345678')">Blocked Vehicle</button>
      <button class="btn btn-secondary btn-sm" onclick="runScenario('9999999')">Unknown Plate</button>
      <button class="btn btn-secondary btn-sm" onclick="runScenario('554321')">Single Digit Prefix</button>
      <button class="btn btn-primary btn-sm" onclick="sendToDisplay()" style="background:#34d399">Send to Display</button>
      <a href="/api/queue" target="_blank" class="btn btn-secondary btn-sm">Queue Dashboard</a>
    </div>
  </div>

  <div class="grid" id="resultArea" style="display:none">
    <!-- Live Event -->
    <div class="card">
      <div class="card-title"><span>&#9889;</span> Live Event</div>
      <div class="plate-display">
        <div class="plate-number" id="dispPlate">--</div>
        <div class="plate-sub" id="dispPlateSub">Prefix: -- | Serial: --</div>
      </div>
      <div class="info-row"><span class="info-label">Detected Plate</span><span class="info-value" id="infoDetected">--</span></div>
      <div class="info-row"><span class="info-label">Event Time</span><span class="info-value" id="infoTime">--</span></div>
      <div class="info-row"><span class="info-label">Camera</span><span class="info-value" id="infoCamera">--</span></div>
      <div class="info-row"><span class="info-label">System Mode</span><span class="info-value" style="color:#a78bfa">Mock (Demo)</span></div>
      <div class="info-row"><span class="info-label">Response Time</span><span class="info-value" id="infoRespTime">--</span></div>
    </div>

    <!-- Access Decision -->
    <div class="card">
      <div class="card-title"><span>&#128737;</span> Access Decision</div>
      <div id="accessBadge" class="access-badge access-denied">--</div>
      <div style="margin-top:12px">
        <div class="info-row"><span class="info-label">Decision</span><span class="info-value" id="decAllowed">--</span></div>
        <div class="info-row"><span class="info-label">Reason</span><span class="info-value" id="decReason">--</span></div>
      </div>
      <div class="snapshot" id="snapshotArea">
        <div style="text-align:center">
          <div style="font-size:32px;margin-bottom:4px">&#128663;</div>
          <div>Vehicle Snapshot</div>
          <div style="font-size:11px;color:#334155;margin-top:4px">Demo placeholder</div>
        </div>
      </div>
    </div>

    <!-- Customer Info -->
    <div class="card">
      <div class="card-title"><span>&#128100;</span> Customer Info</div>
      <div id="customerInfo">
        <div class="info-row"><span class="info-label">Name</span><span class="info-value" id="custName">--</span></div>
        <div class="info-row"><span class="info-label">Phone</span><span class="info-value" id="custPhone">--</span></div>
        <div class="info-row"><span class="info-label">Customer ID</span><span class="info-value" id="custId">--</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value" id="custStatus">--</span></div>
      </div>
    </div>

    <!-- Vehicle Info -->
    <div class="card">
      <div class="card-title"><span>&#128661;</span> Vehicle Info</div>
      <div id="vehicleInfo">
        <div class="info-row"><span class="info-label">Plate Number</span><span class="info-value" id="vehPlate">--</span></div>
        <div class="info-row"><span class="info-label">Model</span><span class="info-value" id="vehModel">--</span></div>
        <div class="info-row"><span class="info-label">Color</span><span class="info-value" id="vehColor">--</span></div>
        <div class="info-row"><span class="info-label">Vehicle Status</span><span class="info-value" id="vehStatus">--</span></div>
        <div class="info-row"><span class="info-label">Permit Expiry</span><span class="info-value" id="vehPermit">--</span></div>
      </div>
    </div>
  </div>

  <!-- History Table -->
  <div class="card">
    <div class="card-title"><span>&#128203;</span> Recent Plate Activity</div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Plate</th>
            <th>Camera</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Decision</th>
            <th>Resp (ms)</th>
          </tr>
        </thead>
        <tbody id="historyBody">
          <tr><td colspan="7" style="text-align:center;color:#475569;padding:20px">No records yet. Scan a plate to begin.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<script>
const history = [];

async function lookupPlate() {
  const plate = document.getElementById('plateInput').value.trim();
  const camera = document.getElementById('cameraSelect').value;
  if (!plate) { alert('Please enter a plate number'); return; }

  const btn = document.querySelector('.btn-primary');
  btn.textContent = 'Scanning...';
  btn.classList.add('loading');

  const start = Date.now();
  try {
    const resp = await fetch('/demo/anpr/api/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plateNumber: plate, cameraId: camera, eventTime: new Date().toISOString() })
    });
    const result = await resp.json();
    const elapsed = Date.now() - start;
    displayResult(result, plate, camera, elapsed);
    addHistory(result, plate, camera, elapsed);
  } catch (e) {
    displayError(e.message);
  } finally {
    btn.textContent = 'Scan Plate';
    btn.classList.remove('loading');
  }
}

function displayResult(r, rawPlate, camera, elapsed) {
  document.getElementById('resultArea').style.display = 'grid';

  // Plate display
  document.getElementById('dispPlate').textContent = r.plateNumber || rawPlate;
  document.getElementById('dispPlateSub').textContent = 'Prefix: ' + (r.platePrefix || '--') + ' | Serial: ' + (r.plateSerial || '--');

  // Live event
  document.getElementById('infoDetected').textContent = rawPlate;
  document.getElementById('infoTime').textContent = new Date().toLocaleTimeString();
  document.getElementById('infoCamera').textContent = camera;
  document.getElementById('infoRespTime').textContent = elapsed + 'ms';

  // Access decision
  const badge = document.getElementById('accessBadge');
  if (r.systemAvailable === false) {
    badge.className = 'access-badge access-unavailable';
    badge.textContent = 'SYSTEM UNAVAILABLE';
  } else if (r.accessDecision.allowed) {
    badge.className = 'access-badge access-allowed';
    badge.textContent = 'ACCESS GRANTED';
  } else {
    badge.className = 'access-badge access-denied';
    badge.textContent = 'ACCESS DENIED';
  }
  document.getElementById('decAllowed').textContent = r.accessDecision.allowed ? 'Allowed' : 'Denied';
  document.getElementById('decReason').textContent = r.accessDecision.reason;

  // Customer
  if (r.customer) {
    document.getElementById('custName').textContent = r.customer.name;
    document.getElementById('custPhone').textContent = r.customer.phone;
    document.getElementById('custId').textContent = r.customer.externalCustomerId;
    const cs = r.customer.status;
    document.getElementById('custStatus').innerHTML = '<span class="status-' + cs + '">' + cs.toUpperCase() + '</span>';
  } else {
    document.getElementById('custName').textContent = '--';
    document.getElementById('custPhone').textContent = '--';
    document.getElementById('custId').textContent = '--';
    document.getElementById('custStatus').textContent = '--';
  }

  // Vehicle
  if (r.vehicle) {
    document.getElementById('vehPlate').textContent = r.vehicle.plateNumber;
    document.getElementById('vehModel').textContent = r.vehicle.model;
    document.getElementById('vehColor').textContent = r.vehicle.color;
    const vs = r.vehicle.status;
    document.getElementById('vehStatus').innerHTML = '<span class="status-' + vs + '">' + vs.toUpperCase() + '</span>';
    document.getElementById('vehPermit').textContent = r.vehicle.permitExpiry || '--';
  } else {
    document.getElementById('vehPlate').textContent = '--';
    document.getElementById('vehModel').textContent = '--';
    document.getElementById('vehColor').textContent = '--';
    document.getElementById('vehStatus').textContent = '--';
    document.getElementById('vehPermit').textContent = '--';
  }
}

function displayError(msg) {
  document.getElementById('resultArea').style.display = 'grid';
  document.getElementById('dispPlate').textContent = 'ERROR';
  document.getElementById('dispPlateSub').textContent = msg;
}

function addHistory(r, plate, camera, elapsed) {
  const row = {
    time: new Date().toLocaleTimeString(),
    plate: r.plateNumber || plate,
    camera: camera,
    customer: r.customer ? r.customer.name : '--',
    status: r.customer ? r.customer.status : '--',
    decision: r.accessDecision.allowed ? 'GRANTED' : 'DENIED',
    elapsed: elapsed
  };
  history.unshift(row);
  if (history.length > 20) history.pop();
  renderHistory();
}

function renderHistory() {
  const tbody = document.getElementById('historyBody');
  if (history.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#475569;padding:20px">No records yet.</td></tr>';
    return;
  }
  tbody.innerHTML = history.map(h => {
    const sc = h.status === 'active' ? 'active' : h.status === 'blocked' ? 'blocked' : h.status === 'expired' ? 'expired' : 'inactive';
    const dc = h.decision === 'GRANTED' ? 'active' : 'blocked';
    return '<tr>'
      + '<td>' + h.time + '</td>'
      + '<td style="font-family:monospace;font-weight:600">' + h.plate + '</td>'
      + '<td>' + h.camera + '</td>'
      + '<td>' + h.customer + '</td>'
      + '<td><span class="status-' + sc + '">' + h.status.toUpperCase() + '</span></td>'
      + '<td><span class="status-' + dc + '">' + h.decision + '</span></td>'
      + '<td>' + h.elapsed + '</td>'
      + '</tr>';
  }).join('');
}

function randomPlate() {
  const plates = ['40-00000','25-64831','4-66759','18-12345','7-00987','33-45678','12-11111','5-54321','27-00045','9-88888'];
  document.getElementById('plateInput').value = plates[Math.floor(Math.random() * plates.length)];
  lookupPlate();
}

function runScenario(norm) {
  document.getElementById('plateInput').value = norm;
  lookupPlate();
}

function clearResult() {
  document.getElementById('resultArea').style.display = 'none';
  document.getElementById('plateInput').value = '';
}

// SSE Connection
let eventSource = null;
function connectSSE() {
  eventSource = new EventSource('/api/display/events?token=demo&branchId=branch-01&screenId=demo-page');
  const el = document.getElementById('sseStatus');
  eventSource.onopen = () => { el.innerHTML = '<span style="color:#34d399">● Connected</span>'; };
  eventSource.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type !== 'heartbeat') {
      console.log('SSE Event:', data);
    }
  };
  eventSource.onerror = () => {
    el.innerHTML = '<span style="color:#f87171">● Offline</span>';
    setTimeout(connectSSE, 3000);
  };
}
connectSSE();

// Send to Display
async function sendToDisplay() {
  const plate = document.getElementById('plateInput').value.trim() || '40-00000';
  const names = ['Ahmed','Fatima','Khalid','Nora','Mohammed','Sara','Ali','Lama'];
  const name = names[Math.floor(Math.random() * names.length)];
  const lanes = ['A','B','C','VIP'];
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  try {
    const r = await fetch('/demo/anpr/api/broadcast', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        customerName: name,
        plateNumber: plate,
        lane: lane,
        ticketNumber: 'T-' + Math.floor(Math.random()*9000+1000)
      })
    });
    const data = await r.json();
    alert('Sent to ' + data.sentTo + ' display(s)!');
  } catch(e) { alert('Error: ' + e.message); }
}
</script>
</body>
</html>`;
