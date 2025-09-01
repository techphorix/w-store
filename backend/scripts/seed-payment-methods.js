const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectDB, executeQuery, closeDB } = require('../config/database');

(async () => {
  try {
    await connectDB();
    const [{ count: pmCount }] = await executeQuery('SELECT COUNT(*) AS count FROM payment_methods');
    const [{ count: wmCount }] = await executeQuery('SELECT COUNT(*) AS count FROM withdrawal_methods');

    if (pmCount === 0) {
      await executeQuery(`
        INSERT INTO payment_methods (id, name, type, description, icon, processing_time, min_amount, max_amount, fees_percentage, fees_fixed) VALUES
        (UUID(), 'Bank Account', 'both', 'Direct bank transfer for deposits and withdrawals', 'fa-university', '1-3 business days', 10.00, 50000.00, 0.00, 0.00),
        (UUID(), 'PayPal', 'both', 'PayPal integration for instant transfers', 'fa-paypal', 'Instant', 10.00, 10000.00, 2.90, 0.30),
        (UUID(), 'Stripe', 'both', 'Stripe payment processing', 'fa-credit-card', 'Instant', 10.00, 50000.00, 2.90, 0.30)
      `);
      console.log('[seed-payment-methods] Inserted default payment methods');
    } else {
      console.log('[seed-payment-methods] Payment methods already present');
    }

    if (wmCount === 0) {
      await executeQuery(`
        INSERT INTO withdrawal_methods (id, name, type, description, icon, processing_time, min_amount, max_amount, fees_percentage, fees_fixed) VALUES
        (UUID(), 'Bank Transfer', 'bank_transfer', 'Direct bank transfer to your account', 'fa-university', '1-3 business days', 50.00, 50000.00, 0.00, 0.00),
        (UUID(), 'PayPal', 'paypal', 'Withdraw to your PayPal account', 'fa-paypal', 'Instant', 50.00, 10000.00, 2.90, 0.30),
        (UUID(), 'Stripe', 'stripe', 'Withdraw to your Stripe account', 'fa-credit-card', '1-2 business days', 50.00, 50000.00, 0.00, 0.00)
      `);
      console.log('[seed-payment-methods] Inserted default withdrawal methods');
    } else {
      console.log('[seed-payment-methods] Withdrawal methods already present');
    }
  } catch (err) {
    console.error('[seed-payment-methods] Failed:', err);
    process.exitCode = 1;
  } finally {
    try { await closeDB(); } catch (_) {}
  }
})();

