const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Configuración
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'gessa-boletos-mvp-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h'; // Token expira en 24 horas

/**
 * Hash de contraseña usando bcrypt
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} Hash de la contraseña
 */
async function hashPassword(password) {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    console.error('Error al hashear contraseña:', error);
    throw new Error('Error al procesar contraseña');
  }
}

/**
 * Comparar contraseña con hash
 * @param {string} password - Contraseña en texto plano
 * @param {string} hash - Hash almacenado en BD
 * @returns {Promise<boolean>} True si coinciden
 */
async function comparePassword(password, hash) {
  try {
    const match = await bcrypt.compare(password, hash);
    return match;
  } catch (error) {
    console.error('Error al comparar contraseña:', error);
    throw new Error('Error al verificar contraseña');
  }
}

/**
 * Generar token JWT
 * @param {object} payload - Datos a incluir en el token
 * @returns {string} Token JWT
 */
function generateToken(payload) {
  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });
    return token;
  } catch (error) {
    console.error('Error al generar token:', error);
    throw new Error('Error al generar token');
  }
}

/**
 * Verificar y decodificar token JWT
 * @param {string} token - Token JWT
 * @returns {object|null} Payload decodificado o null si inválido
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('Token expirado');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Token inválido');
    }
    return null;
  }
}

/**
 * Extraer token del header Authorization
 * @param {string} authHeader - Header Authorization
 * @returns {string|null} Token extraído o null
 */
function extractToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remover "Bearer "
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  extractToken,
  JWT_SECRET
};
