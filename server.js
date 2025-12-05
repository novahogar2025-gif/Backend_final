require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS para Railway
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json());

// ✅ HEALTH CHECK REQUERIDO PARA RAILWAY
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

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
    console.log("📍 Health: https://backend-final-o904.onrender.com/health");
});
