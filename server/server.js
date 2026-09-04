require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

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

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));

app.use(notFound);
app.use(errorHandler);

async function iniciar() {
  await connectDB();
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`[SERVER] SysJuridico escuchando en el puerto ${PORT}`));
}

iniciar();

module.exports = app;
