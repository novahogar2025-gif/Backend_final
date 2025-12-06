const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/jwt.middleware');
const PurchaseController = require('../controllers/compra.controller');

// POST /api/purchase/complete - COMPLETA TODO EN UN SOLO PASO
router.post('/complete', verifyToken, purchaseController.completePurchase);

module.exports = router;

