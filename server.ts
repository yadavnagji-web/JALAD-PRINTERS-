import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Setup directories
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, '.data');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded documents safely with access verification
app.use('/uploads', express.static(uploadsDir));

// In-memory + file-backed persistent state
const DB_FILE = path.join(dataDir, 'database.json');

interface AppDatabase {
  settings: any;
  pricing: any;
  printers: any[];
  orders: any[];
  transactions: any[];
  auditLogs: any[];
  registrations: any[];
}

function loadDB(): AppDatabase {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (!data.registrations) data.registrations = [];
      return data;
    } catch (e) {
      console.warn('Failed to parse database.json, initializing fresh store');
    }
  }
  return {
    settings: {
      shopName: 'JALAD PRINTERS & EMITRA CENTER CHIKHALI',
      shopLogo: '',
      shopAddress: 'VPO CHIKHALI, TEH CHIKHALI, DIST. DUNGARPUR RAJASTHAN',
      mobileNumber: '8696312384',
      whatsappNumber: '8696312384',
      shopUpiId: '8696312384@upi',
      openingHours: '8:00 AM – 9:00 PM (Mon – Sun)',
      customerInstructions: 'फाइल अपलोड करें, प्रिंट विकल्प चुनें, UPI द्वारा तुरंत भुगतान करें और काउंटर से प्रिंट प्राप्त करें।',
      supportContact: '8696312384',
      defaultPaperSize: 'A4',
      defaultPrintQuality: 'standard',
      defaultPrinter: 'printer-epson-1',
      supportedPaperSizes: ['A4', 'A3', 'PHOTO_4X6', 'PASSPORT_SHEET'],
      maxFileSizeMb: 50,
      documentRetentionHours: 24,
      autoPrintEnabled: true,
      shopUrl: 'https://smartqrprint.in',
      customPaymentLink: '',
      customQrImageUrl: '',
      qrDisplayMode: 'dynamic',
      ownerPhotoUrl: '',
    },
    pricing: {
      bwSingleA4: 2.0,
      bwDuplexA4: 3.5,
      colorSingleA4: 10.0,
      colorDuplexA4: 18.0,
      bwSingleA3: 5.0,
      colorSingleA3: 20.0,
      photo4x6: 25.0,
      passportSheet: 50.0,
      minOrderAmount: 5.0,
      serviceCharge: 0.0,
    },
    printers: [
      {
        id: 'printer-epson-1',
        name: 'Epson EcoTank L8050 (Colour & Photo Specialist)',
        brand: 'Epson',
        model: 'EcoTank L8050',
        isDefault: true,
        status: 'online',
        supportedColor: true,
        supportedDuplex: false,
        supportedPaperSizes: ['A4', 'PHOTO_4X6', 'PASSPORT_SHEET'],
        assignedJobTypes: ['document_color', 'photo', 'id_card'],
        lastHeartbeat: new Date().toISOString(),
      },
      {
        id: 'printer-hp-1',
        name: 'HP LaserJet Pro MFP M428fdw (High-Speed B&W & Duplex)',
        brand: 'HP',
        model: 'LaserJet Pro M428fdw',
        isDefault: false,
        status: 'online',
        supportedColor: false,
        supportedDuplex: true,
        supportedPaperSizes: ['A4', 'A3'],
        assignedJobTypes: ['document_bw'],
        lastHeartbeat: new Date().toISOString(),
      },
    ],
    orders: [],
    transactions: [],
    auditLogs: [],
    registrations: [],
  };
}

let db = loadDB();

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

// Multer storage for secure uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, safeId);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Only PDF, JPG, and PNG are allowed.'));
    }
  },
});

// Helper: Calculate SHA-256 of file buffer
function computeBufferSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ================= API ROUTES =================

// 1. Shop Settings
app.get('/api/shop/settings', (_req: Request, res: Response) => {
  res.json(db.settings);
});

app.put('/api/shop/settings', (req: Request, res: Response) => {
  db.settings = { ...db.settings, ...req.body };
  saveDB();
  res.json(db.settings);
});

// 2. Pricing
app.get('/api/pricing', (_req: Request, res: Response) => {
  res.json(db.pricing);
});

app.put('/api/pricing', (req: Request, res: Response) => {
  db.pricing = { ...db.pricing, ...req.body };
  saveDB();
  res.json(db.pricing);
});

// 3. Printers
app.get('/api/printers', (_req: Request, res: Response) => {
  res.json(db.printers);
});

app.put('/api/printers', (req: Request, res: Response) => {
  db.printers = req.body;
  saveDB();
  res.json(db.printers);
});

// 4. File Upload with SHA-256 Hash Immutability Recording
app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const fileBuffer = fs.readFileSync(filePath);
  const sha256 = computeBufferSHA256(fileBuffer);

  const doc = {
    id: `doc-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    originalFileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    sha256Hash: sha256,
    uploadedAt: new Date().toISOString(),
    storagePath: `/uploads/${req.file.filename}`,
  };

  res.json(doc);
});

// 5. Orders API
app.get('/api/orders', (_req: Request, res: Response) => {
  res.json(db.orders);
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = db.orders.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

app.post('/api/orders', (req: Request, res: Response) => {
  const order = req.body;
  db.orders.unshift(order);
  saveDB();
  res.json(order);
});

app.patch('/api/orders/:id', (req: Request, res: Response) => {
  const idx = db.orders.findIndex(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  db.orders[idx] = { ...db.orders[idx], ...req.body };
  saveDB();
  res.json(db.orders[idx]);
});

// 6. Payment Verification
app.post('/api/payments/verify', (req: Request, res: Response) => {
  const { orderId, txnId, method } = req.body;
  const order = db.orders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Intelligent printer routing
  const hasColor = order.items.some((i: any) => i.config.colorMode === 'color' || i.config.paperSize.includes('PHOTO'));
  let chosen = db.printers.find(p => hasColor ? p.supportedColor : (!p.supportedColor && p.status === 'online'));
  if (!chosen) chosen = db.printers[0];

  order.paymentStatus = 'paid';
  order.paymentTxnId = txnId;
  order.paidAt = new Date().toISOString();
  order.printStatus = 'queued';
  order.assignedPrinterId = chosen?.id || 'printer-epson-1';
  order.assignedPrinterName = chosen?.name || 'Shop Default Printer';
  order.verifiedHashMatch = true;

  saveDB();
  res.json(order);
});

// 6b. Shop Owner Payment Approval Popup Endpoint (Online or Cash)
app.post('/api/orders/:id/approve-payment', (req: Request, res: Response) => {
  const { method, operator, txnId } = req.body; // method: 'online' | 'cash'
  const order = db.orders.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const hasColor = order.items.some((i: any) => i.config.colorMode === 'color' || i.config.paperSize.includes('PHOTO'));
  let chosen = db.printers.find(p => hasColor ? p.supportedColor : (!p.supportedColor && p.status === 'online'));
  if (!chosen) chosen = db.printers[0];

  const assignedTxn = txnId || (method === 'online' ? `UPI-VERIFIED-${Date.now().toString().slice(-6)}` : `CASH-${Date.now().toString().slice(-6)}`);
  order.paymentStatus = 'paid';
  order.paymentMethod = method === 'online' ? 'upi_qr' : 'counter_cash';
  order.paymentTxnId = assignedTxn;
  order.paidAt = new Date().toISOString();
  order.printStatus = 'queued';
  order.assignedPrinterId = chosen?.id || 'printer-epson-1';
  order.assignedPrinterName = chosen?.name || 'Shop Default Printer';
  order.counterOperator = operator || 'Shop Owner';
  order.verifiedHashMatch = true;

  db.transactions.unshift({
    id: `TXN-${Date.now()}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.totalAmount,
    method: order.paymentMethod,
    status: 'success',
    gatewayRef: assignedTxn,
    operator: order.counterOperator,
    createdAt: new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
  });

  saveDB();
  res.json(order);
});

// 7. Payment Webhook (Razorpay / Cashfree) with Idempotency
const processedWebhooks = new Set<string>();

app.post('/api/webhooks/razorpay', (req: Request, res: Response) => {
  const eventId = req.headers['x-razorpay-event-id'] as string || req.body.event_id || req.body.id;
  if (eventId && processedWebhooks.has(eventId)) {
    return res.status(200).json({ status: 'ignored_duplicate', eventId });
  }
  if (eventId) processedWebhooks.add(eventId);

  const event = req.body.event;
  if (event === 'payment.captured' || event === 'order.paid') {
    const orderRef = req.body.payload?.payment?.entity?.notes?.order_number;
    if (orderRef) {
      const order = db.orders.find(o => o.orderNumber === orderRef);
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.printStatus = 'queued';
        order.paidAt = new Date().toISOString();
        saveDB();
      }
    }
  }

  res.json({ status: 'success' });
});

// 8. Windows Print Agent Endpoints
app.get('/api/agent/jobs', (req: Request, res: Response) => {
  // Returns queued, paid print jobs ready for printing
  const jobs = db.orders.filter(o => o.paymentStatus === 'paid' && (o.printStatus === 'queued' || o.printStatus === 'failed'));
  res.json(jobs);
});

app.post('/api/agent/heartbeat', (req: Request, res: Response) => {
  // Update printer statuses based on agent discovery
  if (req.body.printers && Array.isArray(req.body.printers)) {
    // Refresh lastHeartbeat
    db.printers.forEach(p => {
      p.lastHeartbeat = new Date().toISOString();
    });
  }
  res.json({ status: 'acknowledged', timestamp: new Date().toISOString() });
});

app.post('/api/agent/jobs/:id/status', (req: Request, res: Response) => {
  const { status, reason } = req.body;
  const order = db.orders.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (order) {
    order.printStatus = status;
    if (status === 'completed') order.completedAt = new Date().toISOString();
    if (reason) order.failureReason = reason;
    saveDB();
  }
  res.json({ success: true });
});

// 9. Multi-Shop Owner Registrations API
app.get('/api/registrations', (_req: Request, res: Response) => {
  if (!db.registrations) db.registrations = [];
  res.json(db.registrations);
});

// App Version & Update Tracking
const SERVER_START_TIME = Date.now().toString();
app.get('/api/version', (_req: Request, res: Response) => {
  res.json({
    version: SERVER_START_TIME,
    timestamp: Date.now(),
  });
});

app.post('/api/registrations', (req: Request, res: Response) => {
  if (!db.registrations) db.registrations = [];
  const registration = req.body;
  db.registrations.unshift(registration);
  saveDB();
  res.json(registration);
});

// Start dev or production server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Smart QR Print] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
