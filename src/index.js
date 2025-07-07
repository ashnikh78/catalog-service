// User Service Entrypoint
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const fs = require('fs');
const userRoutes = require('./routes/userRoutes');

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
if (fs.existsSync(envFile)) {
  require('dotenv').config({ path: envFile });
} else {
  require('dotenv').config();
}

// Load Docker/K8s secrets if present
function loadSecret(secretPath) {
  try {
    return fs.readFileSync(secretPath, 'utf8').trim();
  } catch {
    return undefined;
  }
}
process.env.JWT_SECRET = loadSecret('/run/secrets/jwt_secret') || process.env.JWT_SECRET;

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(morgan('combined'));
app.use(bodyParser.json());

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});


// Prometheus metrics endpoint
const metrics = require('./metrics');
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metrics.register.contentType);
  res.end(await metrics.register.metrics());
});

app.use('/auth', userRoutes.authRoutes);
app.use('/profile', userRoutes.profileRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

const PORT = process.env.PORT || 3011;
const server = app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('User Service terminated');
    process.exit(0);
  });
});
process.on('SIGINT', () => {
  server.close(() => {
    console.log('User Service interrupted');
    process.exit(0);
  });
});
