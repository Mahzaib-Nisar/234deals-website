/**
 * Entry point for the Express server
 * - Loads environment variables
 * - Configures middleware (CORS, body-parser, morgan)
 * - Connects to PostgreSQL via Sequelize
 * - Registers routes and centralized error handling
 */
const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// CORS configuration (support comma-separated list of allowed origins)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // allow non-browser or same-origin
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// Logging middleware
app.use(morgan('dev'));

// Body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check route
app.get('/', (req, res) => {
  return res.send('Authentication Server Running');
});

// Database
const sequelize = require('./config/database');

// Register models BEFORE syncing
require('./models/userModel');
require('./models/Deal');
require('./models/Category');
require('./models/Store');
require('./models/Favorite');

// Routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const dealRoutes = require('./routes/dealRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const storeRoutes = require('./routes/storeRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const searchRoutes = require('./routes/searchRoutes');
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/search', searchRoutes);

// Error handling middleware (registered after routes)
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start server only after DB is ready and schemas are in place
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await sequelize.authenticate();
    // eslint-disable-next-line no-console
    console.log('Database connection established');

    // Ensure models are in sync without altering existing schema
    await sequelize.sync();
    // eslint-disable-next-line no-console
    console.log('Database synchronized');

    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
