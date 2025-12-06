const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Aviso/validación ligera de variables de entorno críticas
const requiredEnv = [
  'JWT_SECRET',
  'DB_HOST', 'DB_USER', 'DB_NAME'
];
const missing = requiredEnv.filter(k => !process.env[k]);
if (missing.length) {
  console.warn(`⚠️ Atención: faltan variables de entorno recomendadas: ${missing.join(', ')}. Añádelas en Render si es necesario.`);
}

// Lista de orígenes permitidos
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://jetzan.github.io'
];

// Configuración de CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HEALTH CHECK
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'NovaHogar API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'NovaHogar API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart'
    }
  });
});

// Rutas
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productsRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/purchase', require('./routes/purchaseRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/subscription', require('./routes/subscriptionRoutes'));
app.use('/api/admin/stats', require('./routes/adminStatsRoutes'));
app.use('/api/coupons', require('./routes/couponsRoutes'));
app.use('/api/users', require('./routes/usersRoutes'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  console.log(`📍 Health: ${process.env.HEALTH_URL || `http://localhost:${PORT}/health`}`);
});
