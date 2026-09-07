require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const clientesRoutes = require('./routes/clientes.routes');
const expedientesRoutes = require('./routes/expedientes.routes');
const movimientosRoutes = require('./routes/movimientos.routes');
const agendaRoutes = require('./routes/agenda.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const lexpyRoutes = require('./routes/lexpy.routes');
const liquidacionRoutes = require('./routes/liquidacion.routes');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/expedientes', expedientesRoutes);
app.use('/api/movimientos', movimientosRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/lexpy', lexpyRoutes);
app.use('/api/liquidaciones', liquidacionRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

// Estado de la conexión a MongoDB: readyState 1 = conectado (mongoose.STATES)
app.get('/api/health', (req, res) => {
  const estados = ['desconectado', 'conectado', 'conectando', 'desconectando'];
  const readyState = mongoose.connection.readyState;
  res.json({
    success: true,
    status: 'ok',
    baseDeDatos: {
      conectado: readyState === 1,
      estado: estados[readyState] || 'desconocido',
      nombreDB: mongoose.connection.name || null,
    },
  });
});

app.use(notFound);
app.use(errorHandler);

// Seed admin inicial: crea al usuario si ADMIN_SEED_EMAIL/PASSWORD están definidos.
async function seedAdminSiConfigurado() {
  const email = (process.env.ADMIN_SEED_EMAIL || '').toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    console.log('[SEED] ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD no definidos: se omite la creación del admin.');
    return;
  }

  const Usuario = require('./models/Usuario');
  const existente = await Usuario.findOne({ email });
  if (existente) {
    console.log(`[SEED] Ya existe un usuario admin con el email ${email}.`);
    return;
  }

  await Usuario.create({ nombre: 'Administrador', email, password, rol: 'admin' });
  console.log(`[SEED] Usuario administrador creado: ${email}`);
}

async function iniciar() {
  await connectDB();
  await seedAdminSiConfigurado();

  const PORT = Number(process.env.PORT || 4000);
  // 0.0.0.0: accesible desde Traefik/Dokploy (no 127.0.0.1)
  const HOST = process.env.HOST || '0.0.0.0';

  app.listen(PORT, HOST, () => console.log(`[SERVER] SysJuridico escuchando en http://${HOST}:${PORT}`));
}

iniciar().catch((err) => {
  console.error('[SERVER] Error fatal al iniciar:', err.message);
  process.exit(1);
});

module.exports = app;
