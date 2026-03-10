/**
 * Sequelize database configuration
 * - Reads connection settings from environment variables
 * - Exports a configured Sequelize instance
 */
const path = require('path');
const dotenv = require('dotenv');
const { Sequelize } = require('sequelize');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_PORT = 5432,
  NODE_ENV = 'development',
} = process.env;

// Initialize Sequelize for PostgreSQL
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: 'postgres',
  logging: NODE_ENV === 'development' ? console.log : false, // Enable SQL logging only in development
  dialectOptions: {
    // Add SSL options here if you deploy to managed Postgres providers
    // ssl: { require: true, rejectUnauthorized: false },
  },
  define: {
    // Global model definitions
    underscored: false,
    freezeTableName: true, // Prevent Sequelize from pluralizing table names
  },
});

module.exports = sequelize;

