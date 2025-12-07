const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuración de CORS ---
// Define quién puede consultar tu API
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://jetzan.github.io'
  'http://127.0.0.1:5500', // <- Añadir esto
  'http://localhost:5500'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (como Postman) o de orígenes permitidos
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// --- Middlewares Globales ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Health Check (Vital para despliegue) ---
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// --- Rutas de la API ---
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

// --- Manejo de 404 (Ruta no encontrada) ---
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// --- Iniciar Servidor ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

