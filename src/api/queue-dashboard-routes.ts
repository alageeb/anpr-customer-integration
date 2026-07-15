import { Router, Request, Response, NextFunction } from 'express';
import { broadcastToDisplays } from './display-realtime-routes';
import {
  initializeQueueTable,
  getAllTickets,
  addTicket,
  updateTicketStatus,
  deleteAllTickets,
  getTicketById,
  QueueTicket
} from '../integration/logs/queue-db';

// Input sanitization
function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
    .slice(0, 200);
}

// Validate plate number (Kuwait format)
function isValidPlate(plate: string): boolean {
  return /^\d{1,3}[- ]?\d{5}$/.test(plate) || /^\d{6,8}$/.test(plate);
}

const VALID_LANES = ['A', 'B', 'C', 'VIP'];

// Dashboard PIN protection
const DASHBOARD_PIN = process.env.QUEUE_DASHBOARD_PIN || '1234';

function requirePin(req: Request, res: Response, next: NextFunction): void {
  // Allow GET requests without PIN (read-only)
  if (req.method === 'GET') {
    next();
    return;
  }

  const pin = req.headers['x-dashboard-pin'] as string;
  if (!pin || pin !== DASHBOARD_PIN) {
    res.status(401).json({ error: 'Unauthorized: Invalid PIN' });
    return;
  }
  next();
}

let ticketCounter = 1000;

async function getNextCounter(): Promise<number> {
  const tickets = await getAllTickets();
  if (tickets.length === 0) return 1000;
  const maxNum = tickets.reduce((max, t) => {
    const num = parseInt(t.ticketNumber.replace('T-', ''), 10);
    return num > max ? num : max;
  }, 0);
  return maxNum + 1;
}

export function createQueueDashboardRouter(): Router {
  const router = Router();

  // Initialize DB on first use
  let dbInitialized = false;
  router.use(async (_req, _res, next) => {
    if (!dbInitialized) {
      await initializeQueueTable();
      ticketCounter = await getNextCounter();
      dbInitialized = true;
    }
    next();
  });

  // Apply PIN protection to write operations
  router.use(requirePin);

  // Get branch ID from request (header or query)
  function getBranchId(req: Request): string {
    return (req.headers['x-branch-id'] as string) || (req.query.branchId as string) || 'branch-01';
  }

  // Get all tickets for a branch
  router.get('/tickets', async (req: Request, res: Response) => {
    try {
      const branchId = getBranchId(req);
      const allTickets = await getAllTickets(branchId);
      const nowServing = allTickets.filter(t => t.status === 'serving');
      const waiting = allTickets.filter(t => t.status === 'waiting');
      const completed = allTickets.filter(t => t.status === 'completed').slice(-10);
      res.json({ nowServing, waiting, completed, total: allTickets.length, branchId });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  });

  // Add new ticket to a branch
  router.post('/tickets', async (req: Request, res: Response) => {
    try {
      const branchId = getBranchId(req);
      const { customerName, plateNumber, lane } = req.body;
      if (!customerName || !plateNumber) {
        res.status(400).json({ error: 'customerName and plateNumber are required' });
        return;
      }

      const sanitizedName = sanitize(customerName);
      const sanitizedPlate = sanitize(plateNumber);

      if (sanitizedName.length < 2) {
        res.status(400).json({ error: 'Name too short' });
        return;
      }

      if (!isValidPlate(sanitizedPlate)) {
        res.status(400).json({ error: 'Invalid plate format. Use: 40-00000 or 4000000' });
        return;
      }

      const validLane = VALID_LANES.includes(lane) ? lane : 'A';

      ticketCounter++;
      const ticket: QueueTicket = {
        id: `t-${ticketCounter}`,
        ticketNumber: `T-${ticketCounter}`,
        customerName: sanitizedName,
        plateNumber: sanitizedPlate,
        lane: validLane,
        status: 'waiting',
        createdAt: new Date().toISOString(),
        calledAt: null,
        branchId
      };

      await addTicket(ticket);

      // Broadcast check-in to displays
      broadcastToDisplays(branchId, 'checkin', {
        customerName: ticket.customerName,
        plateNumber: ticket.plateNumber,
        lane: ticket.lane,
        ticketNumber: ticket.ticketNumber
      });

      res.json(ticket);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add ticket' });
    }
  });

  // Call next ticket
  router.post('/tickets/call-next', async (req: Request, res: Response) => {
    try {
      const branchId = getBranchId(req);
      const allTickets = await getAllTickets(branchId);
      const next = allTickets.find(t => t.status === 'waiting');
      if (!next) {
        res.status(404).json({ error: 'No waiting tickets' });
        return;
      }

      const calledAt = new Date().toISOString();
      await updateTicketStatus(next.id, 'serving', calledAt);

      broadcastToDisplays(branchId, 'call', {
        ticketNumber: next.ticketNumber,
        customerName: next.customerName,
        lane: next.lane
      });

      // Broadcast updated queue
      const updatedTickets = await getAllTickets(branchId);
      const nowServing = updatedTickets.filter(t => t.status === 'serving').map(t => ({
        ticketNumber: t.ticketNumber, customerName: t.customerName, plateNumber: t.plateNumber, lane: t.lane
      }));
      const waiting = updatedTickets.filter(t => t.status === 'waiting').map(t => ({
        ticketNumber: t.ticketNumber, customerName: t.customerName, plateNumber: t.plateNumber, lane: t.lane,
        waitTimeMinutes: Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000)
      }));
      broadcastToDisplays(branchId, 'queue', { nowServing, waiting });

      res.json({ ...next, status: 'serving', calledAt });
    } catch (error) {
      res.status(500).json({ error: 'Failed to call next ticket' });
    }
  });

  // Call specific ticket
  router.post('/tickets/:id/call', async (req: Request, res: Response) => {
    try {
      const branchId = getBranchId(req);
      const ticket = await getTicketById(req.params.id as string);
      if (!ticket || ticket.status !== 'waiting') {
        res.status(404).json({ error: 'Ticket not found or not waiting' });
        return;
      }

      const calledAt = new Date().toISOString();
      await updateTicketStatus(ticket.id, 'serving', calledAt);

      broadcastToDisplays(branchId, 'call', {
        ticketNumber: ticket.ticketNumber,
        customerName: ticket.customerName,
        lane: ticket.lane
      });

      // Broadcast updated queue
      const updatedTickets = await getAllTickets(branchId);
      const nowServing = updatedTickets.filter(t => t.status === 'serving').map(t => ({
        ticketNumber: t.ticketNumber, customerName: t.customerName, plateNumber: t.plateNumber, lane: t.lane
      }));
      const waiting = updatedTickets.filter(t => t.status === 'waiting').map(t => ({
        ticketNumber: t.ticketNumber, customerName: t.customerName, plateNumber: t.plateNumber, lane: t.lane,
        waitTimeMinutes: Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000)
      }));
      broadcastToDisplays(branchId, 'queue', { nowServing, waiting });

      res.json({ ...ticket, status: 'serving', calledAt });
    } catch (error) {
      res.status(500).json({ error: 'Failed to call ticket' });
    }
  });

  // Complete ticket
  router.post('/tickets/:id/complete', async (req: Request, res: Response) => {
    try {
      const branchId = getBranchId(req);
      const ticket = await getTicketById(req.params.id as string);
      if (!ticket || ticket.status !== 'serving') {
        res.status(404).json({ error: 'Ticket not found or not serving' });
        return;
      }

      await updateTicketStatus(ticket.id, 'completed');

      // Broadcast updated queue
      const updatedTickets = await getAllTickets(branchId);
      const nowServing = updatedTickets.filter(t => t.status === 'serving').map(t => ({
        ticketNumber: t.ticketNumber, customerName: t.customerName, plateNumber: t.plateNumber, lane: t.lane
      }));
      const waiting = updatedTickets.filter(t => t.status === 'waiting').map(t => ({
        ticketNumber: t.ticketNumber, customerName: t.customerName, plateNumber: t.plateNumber, lane: t.lane,
        waitTimeMinutes: Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000)
      }));
      broadcastToDisplays(branchId, 'queue', { nowServing, waiting });

      res.json({ ...ticket, status: 'completed' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to complete ticket' });
    }
  });

  // Reset queue
  router.post('/tickets/reset', async (req: Request, res: Response) => {
    try {
      const branchId = getBranchId(req);
      await deleteAllTickets(branchId);
      ticketCounter = 1000;

      broadcastToDisplays(branchId, 'queue', { nowServing: [], waiting: [] });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reset queue' });
    }
  });

  // Dashboard page
  router.get('/', (_req: Request, res: Response) => {
    res.type('html').send(DASHBOARD_HTML);
  });

  return router;
}

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Queue Management Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
.header{background:linear-gradient(135deg,#1e293b,#0f172a);border-bottom:1px solid #334155;padding:12px 24px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:20px;font-weight:600;color:#38bdf8}
.header-right{display:flex;align-items:center;gap:16px}
.badge{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
.badge-db{background:#05966920;color:#34d399;border:1px solid #05966950}
.status-dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-left:6px}
.status-connected{background:#34d399}
.status-disconnected{background:#f87171}
.container{max-width:1400px;margin:0 auto;padding:16px}
.grid{display:grid;grid-template-columns:1fr 1fr 320px;gap:16px;margin-bottom:16px}
@media(max-width:1200px){.grid{grid-template-columns:1fr 1fr}}
@media(max-width:768px){.grid{grid-template-columns:1fr}}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px}
.card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.card-title{font-size:14px;color:#94a3b8;display:flex;align-items:center;gap:8px}
.card-title span{font-size:16px}
.count-badge{background:#334155;color:#e2e8f0;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600}
.ticket-list{max-height:400px;overflow-y:auto}
.ticket-item{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:12px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;transition:all .2s}
.ticket-item:hover{border-color:#38bdf8}
.ticket-item.serving{border-color:#34d399;background:#05966910}
.ticket-item.waiting{border-color:#334155}
.ticket-info{flex:1}
.ticket-number{font-size:18px;font-weight:700;color:#38bdf8;font-family:'Courier New',monospace}
.ticket-name{font-size:14px;color:#e2e8f0;margin-top:2px}
.ticket-meta{font-size:12px;color:#64748b;margin-top:2px;display:flex;gap:12px}
.ticket-actions{display:flex;gap:6px}
.btn{padding:8px 16px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}
.btn-call{background:#34d399;color:#0f172a}
.btn-call:hover{background:#6ee7b7}
.btn-complete{background:#fbbf24;color:#0f172a}
.btn-complete:hover{background:#fde68a}
.btn-delete{background:#ef4444;color:white}
.btn-delete:hover{background:#f87171}
.btn-primary{background:#38bdf8;color:#0f172a}
.btn-primary:hover{background:#7dd3fc}
.btn-secondary{background:#334155;color:#e2e8f0}
.btn-secondary:hover{background:#475569}
.btn-sm{padding:6px 12px;font-size:12px}
.add-form{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.add-form input,.add-form select{padding:8px 12px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#e2e8f0;font-size:14px;font-family:inherit}
.add-form input:focus,.add-form select:focus{outline:none;border-color:#38bdf8}
.add-form input::placeholder{color:#64748b}
.displays-list{max-height:200px;overflow-y:auto}
.display-item{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:10px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between}
.display-name{font-size:13px;font-weight:600}
.display-status{font-size:11px;color:#64748b}
.empty-state{text-align:center;padding:32px;color:#64748b}
.empty-state span{font-size:32px;display:block;margin-bottom:8px}
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.stat-card{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px;text-align:center}
.stat-value{font-size:28px;font-weight:700;color:#38bdf8}
.stat-label{font-size:12px;color:#94a3b8;margin-top:4px}
.stat-waiting .stat-value{color:#fbbf24}
.stat-serving .stat-value{color:#34d399}
.stat-completed .stat-value{color:#a78bfa}
.lane-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#38bdf820;color:#38bdf8}
.lane-VIP{background:#fbbf2420;color:#fbbf24}
.time-badge{font-size:11px;color:#64748b}
</style>
</head>
<body>
<div class="header">
  <h1>Queue Management Dashboard</h1>
  <div class="header-right">
    <span class="badge badge-db">SQLite Persistent</span>
    <span style="color:#64748b;font-size:13px" id="clockDisplay">--:--:--</span>
  </div>
</div>

<div class="container">
  <div class="stats-row">
    <div class="stat-card stat-waiting"><div class="stat-value" id="statWaiting">0</div><div class="stat-label">بانتظار</div></div>
    <div class="stat-card stat-serving"><div class="stat-value" id="statServing">0</div><div class="stat-label">يُقدم الآن</div></div>
    <div class="stat-card stat-completed"><div class="stat-value" id="statCompleted">0</div><div class="stat-label">مكتمل</div></div>
    <div class="stat-card"><div class="stat-value" id="statTotal">0</div><div class="stat-label">الإجمالي</div></div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-header">
        <div class="card-title"><span>&#9989;</span> الآن في الخدمة</div>
        <span class="count-badge" id="servingCount">0</span>
      </div>
      <div class="ticket-list" id="servingList">
        <div class="empty-state"><span>&#128663;</span>لا يوجد عملاء في الخدمة</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title"><span>&#9203;</span> قائمة الانتظار</div>
      </div>
      <div class="add-form">
        <input type="text" id="quickName" placeholder="اسم العميل">
        <input type="text" id="quickPlate" placeholder="رقم اللوحة" dir="ltr" style="text-align:left">
        <select id="quickLane"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="VIP">VIP</option></select>
        <button class="btn btn-primary btn-sm" onclick="quickAdd()">إضافة</button>
        <button class="btn btn-secondary btn-sm" onclick="callNext()">استدعاء التالي</button>
      </div>
      <div class="ticket-list" id="waitingList">
        <div class="empty-state"><span>&#128203;</span>قائمة الانتظار فارغة</div>
      </div>
    </div>

    <div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <div class="card-title"><span>&#128274;</span> PIN</div>
        </div>
        <div style="margin-bottom:8px">
          <input type="password" id="dashboardPin" placeholder="PIN Code" value="1234" style="width:100%;padding:8px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#e2e8f0;font-size:14px">
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-primary" onclick="callNext()" style="width:100%">استدعاء التذكرة التالية</button>
          <button class="btn btn-secondary" onclick="resetQueue()" style="width:100%">إعادة تعيين القائمة</button>
          <button class="btn btn-secondary" onclick="refreshData()" style="width:100%">تحديث البيانات</button>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <div class="card-title"><span>&#128203;</span> آخر التذاكر المكتملة</div>
    </div>
    <div class="ticket-list" id="completedList" style="max-height:150px">
      <div class="empty-state" style="padding:16px"><span>&#128203;</span>لا توجد تذاكر مكتملة</div>
    </div>
  </div>
</div>

<script>
const API = '';
setInterval(() => {
  document.getElementById('clockDisplay').textContent = new Date().toLocaleTimeString('ar-KW');
}, 1000);

function getPin() {
  return document.getElementById('dashboardPin')?.value || '1234';
}

async function fetchTickets() {
  const r = await fetch(API + '/api/queue/tickets');
  return r.json();
}

async function addTicket(name, plate, lane) {
  const r = await fetch(API + '/api/queue/tickets', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Dashboard-PIN': getPin()},
    body: JSON.stringify({ customerName: name, plateNumber: plate, lane: lane })
  });
  return r.json();
}

async function callTicket(id) {
  const r = await fetch(API + '/api/queue/tickets/' + id + '/call', {
    method: 'POST',
    headers: {'X-Dashboard-PIN': getPin()}
  });
  return r.json();
}

async function completeTicket(id) {
  const r = await fetch(API + '/api/queue/tickets/' + id + '/complete', {
    method: 'POST',
    headers: {'X-Dashboard-PIN': getPin()}
  });
  return r.json();
}

async function callNextTicket() {
  const r = await fetch(API + '/api/queue/tickets/call-next', {
    method: 'POST',
    headers: {'X-Dashboard-PIN': getPin()}
  });
  return r.json();
}

async function resetAll() {
  await fetch(API + '/api/queue/tickets/reset', {
    method: 'POST',
    headers: {'X-Dashboard-PIN': getPin()}
  });
}

async function refreshData() {
  try {
    const tickets = await fetchTickets();
    updateStats(tickets);
    renderServing(tickets.nowServing);
    renderWaiting(tickets.waiting);
    renderCompleted(tickets.completed);
  } catch(e) { console.error(e); }
}

function updateStats(data) {
  document.getElementById('statWaiting').textContent = data.waiting.length;
  document.getElementById('statServing').textContent = data.nowServing.length;
  document.getElementById('statCompleted').textContent = data.completed ? data.completed.length : 0;
  document.getElementById('statTotal').textContent = data.total;
  document.getElementById('servingCount').textContent = data.nowServing.length;
}

function renderServing(items) {
  const el = document.getElementById('servingList');
  if (!items.length) { el.innerHTML = '<div class="empty-state"><span>&#9989;</span>لا يوجد عملاء في الخدمة</div>'; return; }
  el.innerHTML = items.map(t => '<div class="ticket-item serving">' +
    '<div class="ticket-info">' +
      '<div class="ticket-number">' + t.ticketNumber + '</div>' +
      '<div class="ticket-name">' + t.customerName + '</div>' +
      '<div class="ticket-meta">' +
        '<span class="lane-badge' + (t.lane === 'VIP' ? ' lane-VIP' : '') + '">' + t.lane + '</span>' +
        '<span>' + t.plateNumber + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="ticket-actions">' +
      '<button class="btn btn-complete btn-sm" onclick="complete(\'' + t.id + '\')">\\u2713 إنهاء</button>' +
    '</div>' +
  '</div>').join('');
}

function renderWaiting(items) {
  const el = document.getElementById('waitingList');
  if (!items.length) { el.innerHTML = '<div class="empty-state"><span>&#128203;</span>قائمة الانتظار فارغة</div>'; return; }
  el.innerHTML = items.map(t => {
    const wait = t.waitTimeMinutes || Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000);
    return '<div class="ticket-item waiting">' +
    '<div class="ticket-info">' +
      '<div class="ticket-number">' + t.ticketNumber + '</div>' +
      '<div class="ticket-name">' + t.customerName + '</div>' +
      '<div class="ticket-meta">' +
        '<span class="lane-badge' + (t.lane === 'VIP' ? ' lane-VIP' : '') + '">' + t.lane + '</span>' +
        '<span>' + t.plateNumber + '</span>' +
        '<span class="time-badge">' + wait + ' دقيقة</span>' +
      '</div>' +
    '</div>' +
    '<div class="ticket-actions">' +
      '<button class="btn btn-call btn-sm" onclick="call(\'' + t.id + '\')">استدعاء</button>' +
    '</div>' +
  '</div>';
  }).join('');
}

function renderCompleted(items) {
  const el = document.getElementById('completedList');
  if (!items || !items.length) { el.innerHTML = '<div class="empty-state" style="padding:16px"><span>&#128203;</span>لا توجد تذاكر مكتملة</div>'; return; }
  el.innerHTML = items.map(t => '<div class="ticket-item" style="opacity:0.6">' +
    '<div class="ticket-info"><div class="ticket-number">' + t.ticketNumber + '</div><div class="ticket-name">' + t.customerName + ' - ' + t.plateNumber + '</div></div>' +
  '</div>').join('');
}

async function quickAdd() {
  const name = document.getElementById('quickName').value.trim();
  const plate = document.getElementById('quickPlate').value.trim();
  const lane = document.getElementById('quickLane').value;
  if (!name || !plate) { alert('أدخل الاسم ورقم اللوحة'); return; }
  await addTicket(name, plate, lane);
  document.getElementById('quickName').value = '';
  document.getElementById('quickPlate').value = '';
  refreshData();
}

async function callNext() { await callNextTicket(); refreshData(); }
async function call(id) { await callTicket(id); refreshData(); }
async function complete(id) { await completeTicket(id); refreshData(); }
async function resetQueue() { if (confirm('إعادة تعيين القائمة؟')) { await resetAll(); refreshData(); } }

refreshData();
setInterval(refreshData, 5000);
</script>
</body>
</html>`;
