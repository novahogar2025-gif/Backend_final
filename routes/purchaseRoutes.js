const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/compra.controller');
const { verifyToken } = require('../middleware/jwt.middleware');

// Procesar compra
router.post('/process', verifyToken, purchaseController.processPurchase);

// Finalizar compra (enviar PDF)
router.post('/finalize', verifyToken, purchaseController.finalizePurchase);

// Obtener órdenes del usuario
router.get('/orders', verifyToken, purchaseController.getUserOrders);

// Obtener detalles de una orden específica
router.get('/orders/:id', verifyToken, purchaseController.getOrderDetails);

// Reenviar factura por email
router.post('/send-invoice/:id', verifyToken, purchaseController.resendInvoice);

module.exports = router;
