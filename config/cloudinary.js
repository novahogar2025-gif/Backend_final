// cloudinary.js (MODIFICADO - MEJORA EN LÓGICA DE PUBLIC_ID)
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper para extraer public_id de la URL completa.
function extractPublicId(url) {
    if (!url || typeof url !== 'string') return null;
    try {
        const urlParts = url.split('/');
        // Buscar el índice donde comienza el path relevante (después de '/upload/vXXXX/')
        const uploadIndex = urlParts.indexOf('upload');
        if (uploadIndex === -1 || urlParts.length <= uploadIndex + 2) return null;

        // El public_id comienza después del número de versión.
        const pathAfterVersion = urlParts.slice(uploadIndex + 2).join('/');
        
        // Quitar la extensión del archivo al final
        return pathAfterVersion.substring(0, pathAfterVersion.lastIndexOf('.'));

    } catch (error) {
        console.error('Error extrayendo public_id:', error);
        return null;
    }
}

// Eliminar imagen de Cloudinary
async function deleteImage(publicId) {
    if (!publicId) return { result: 'not_found' };
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error eliminando imagen de Cloudinary:', error);
        throw error;
    }
}

module.exports = { cloudinary, extractPublicId, deleteImage };