// routes/productsRoutes.js (Archivo completo corregido)
const express = require('express');
const router = express.Router();
const { 
    getImagenesPorProducto, 
    getProductosSalas, 
    getProductosDormi, 
    getProductosCome, 
    getProduct, 
    getAllProducts,
    getProductsByCategory, // ✅ Agregado
    searchProducts         // ✅ Agregado
} = require("../controllers/products.controller");

router.get("/salas", getProductosSalas);
router.get("/dormitorios", getProductosDormi);
router.get("/comedores", getProductosCome);
router.get('/all', getAllProducts);
router.get("/producto/:prod", getProduct);
router.get("/:id/images", getImagenesPorProducto);

// 👇 Rutas nuevas agregadas
router.get("/categoria/:categoria", getProductsByCategory);
router.get("/buscar/:termino", searchProducts);

module.exports = router;
