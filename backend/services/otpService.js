const pool = require('../config/pg');

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      otp VARCHAR(6) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id)`);
}

async function upsertOtp(userId, otp, minutes = 10) {
  await ensureTable();
  await pool.query(`DELETE FROM password_resets WHERE user_id = $1`, [userId]);
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  await pool.query(
    `INSERT INTO password_resets (user_id, otp, expires_at) VALUES ($1, $2, $3)`,
    [userId, otp, expiresAt]
  );
  return { otp, expiresAt };
}

async function verifyOtp(userId, otp) {
  await ensureTable();
  const { rows } = await pool.query(
    `SELECT id FROM password_resets WHERE user_id = $1 AND otp = $2 AND expires_at > NOW() LIMIT 1`,
    [userId, otp]
  );
  return rows.length > 0;
}

async function clearOtp(userId) {
  await ensureTable();
  await pool.query(`DELETE FROM password_resets WHERE user_id = $1`, [userId]);
}

module.exports = { generateOtp, upsertOtp, verifyOtp, clearOtp };
