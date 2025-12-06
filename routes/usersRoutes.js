// routes/usersRoutes.js
const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.Controller'); // Asegúrate que el nombre coincida con tu archivo
const { verifyToken, verifyAdmin } = require('../middleware/jwt.middleware');

// Rutas protegidas (Solo admin)
router.get('/', verifyToken, verifyAdmin, usersController.getUsers);
router.get('/:id', verifyToken, verifyAdmin, usersController.getUserById);
router.put('/:id', verifyToken, verifyAdmin, usersController.updateUser);
router.delete('/:id', verifyToken, verifyAdmin, usersController.deleteUser);

module.exports = router;
