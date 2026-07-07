import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { initializeDatabase } from './database';
import apiRoutes from './routes/api';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const startTime = Date.now();

// ─── Security Headers (Helmet) ─────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'blob:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS Configuration ────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Always allow localhost/127.0.0.1/local IP
    if (
      origin.startsWith('http://localhost:') || 
      origin.startsWith('http://127.0.0.1:') || 
      origin.startsWith('http://192.168.')
    ) {
      return callback(null, true);
    }
    
    // Always allow Render subdomains
    if (origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`[CORS] Warning: Origin ${origin} not explicitly configured in ALLOWED_ORIGINS. Allowing connection.`);
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ─────────────────────────────────────────────────────────
// Global limiter: 200 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Auth-specific limiter: 15 attempts per 15 minutes (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
});

app.use(globalLimiter);

// ─── Body Parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Request Logger ────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// ─── 500 Response Logger Middleware ────────────────────────────────────────
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode === 500) {
      console.error(`[500 ERROR on ${req.method} ${req.path}]:`, body);
    }
    return originalJson.call(this, body);
  };
  next();
});

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

const startServer = async () => {
  // ─── Initialize Database ─────────────────────────────────────────────────
  try {
    await initializeDatabase();
  } catch (dbErr) {
    console.error('[DB] Failed to initialize database:', dbErr);
  }

  // ─── Health Check Endpoint ────────────────────────────────────────────────
  app.get('/api/health', async (_req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    res.json({
      status: 'ok',
      environment: NODE_ENV,
      uptime: `${uptimeSeconds}s`,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // ─── Auth Routes (rate-limited) ───────────────────────────────────────────
  app.use('/api/auth', authLimiter, authRoutes);

  // ─── API Routes (protected by auth middleware inside router) ──────────────
  app.use('/api', apiRoutes);

  // ─── Static Uploads (local fallback) ─────────────────────────────────────
  app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

  // ─── Serve React SPA ──────────────────────────────────────────────────────
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    const indexFile = path.resolve(clientDist, 'index.html');
    res.sendFile(indexFile, (err) => {
      if (err) {
        res.status(404).send('Frontend not built. Run: cd client && npm run build');
      }
    });
  });

  // ─── Global Error Handler ─────────────────────────────────────────────────
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Error]', err.message);
    res.status(err.status || 500).json({
      error: NODE_ENV === 'production' ? 'An internal error occurred.' : err.message,
    });
  });

  // ─── Start Listening ──────────────────────────────────────────────────────
  const server = app.listen(Number(PORT), '0.0.0.0', () => {
    const ip = getLocalIpAddress();
    console.log(`\n===============================================`);
    console.log(` VENKE Finance Dashboard — ${NODE_ENV.toUpperCase()} `);
    console.log(`===============================================`);
    console.log(` Local:     http://localhost:${PORT}`);
    console.log(` Network:   http://${ip}:${PORT}`);
    console.log(` Health:    http://localhost:${PORT}/api/health`);
    console.log(`===============================================\n`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Error] Port ${PORT} is already in use. Run 'taskkill /F /IM node.exe' to free it.`);
      process.exit(1);
    } else {
      console.error('[Error] Server failed to start:', err.message);
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[Server] Shutting down gracefully...');
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer().catch((err) => {
  console.error('[Fatal] Server startup failed:', err);
  process.exit(1);
});
