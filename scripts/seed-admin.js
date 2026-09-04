require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../server/config/db');
const Usuario = require('../server/models/Usuario');

async function seedAdmin() {
  await connectDB();

  const email = (process.env.ADMIN_SEED_EMAIL || '').toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    console.error('[SEED] Defina ADMIN_SEED_EMAIL y ADMIN_SEED_PASSWORD en el .env.');
    process.exit(1);
  }

  const existente = await Usuario.findOne({ email });
  if (existente) {
    console.log(`[SEED] Ya existe un usuario con el email ${email}. No se creó ninguno nuevo.`);
  } else {
    await Usuario.create({ nombre: 'Administrador', email, password, rol: 'admin' });
    console.log(`[SEED] Usuario admin creado: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('[SEED] Error:', err);
  process.exit(1);
});
