const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectDB, closeDB } = require('../config/database');

(async () => {
  try {
    await connectDB();
    console.log('[run-connect] Database connected and tables ensured.');
  } catch (err) {
    console.error('[run-connect] Failed:', err);
    process.exitCode = 1;
  } finally {
    try { await closeDB(); } catch (_) {}
  }
})();

