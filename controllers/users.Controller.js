const UserModel = require('../models/UserModel'); 

// GET /api/users
const getUsers = async (req, res) => {
    try {
        const users = await UserModel.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ mensaje: 'Error al obtener usuarios' });
    }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await UserModel.getUserById(id);

        if (!user)
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        res.json(user);
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ mensaje: 'Error al obtener usuario' });
    }
};

// PUT /api/users/:id - Actualizar detalles de usuario
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Asumiendo que el body trae 'nombre', 'correo', 'pais' para actualizar
        const { nombre, correo, pais } = req.body;

        // **ASUNCIÓN:** Este método debe existir en tu UserModel.js
        const filas = await UserModel.updateUserDetails(id, nombre, correo, pais);

        if (filas === 0)
            return res.status(404).json({ mensaje: 'Usuario no encontrado o no hubo cambios' });

        res.json({ mensaje: 'Usuario actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ mensaje: 'Error al actualizar usuario' });
    }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const filas = await UserModel.deleteUser(id);

        if (filas === 0)
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        res.json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ mensaje: 'Error al eliminar usuario' });
    }
};

// Exportaciones
module.exports = {
    getUsers,
    getUserById,
    updateUser,
    deleteUser
};