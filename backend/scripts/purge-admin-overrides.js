#!/usr/bin/env node

/**
 * Purge Admin Overrides Data
 *
 * Safely remove data from the admin_overrides table.
 *
 * Usage examples:
 *   node scripts/purge-admin-overrides.js --all -y
 *   node scripts/purge-admin-overrides.js --seller <SELLER_ID> -y
 *   node scripts/purge-admin-overrides.js --before 2025-08-31 -y
 *   node scripts/purge-admin-overrides.js --metric orders_sold -y
 *   node scripts/purge-admin-overrides.js --seller <SELLER_ID> --metric visitors -y
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'w_store',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  multipleStatements: false,
};

function parseArgs(argv) {
  const args = { yes: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-y' || a === '--yes') args.yes = true;
    else if (a === '--all') args.all = true;
    else if (a === '--seller') args.seller = argv[++i];
    else if (a === '--before') args.before = argv[++i];
    else if (a === '--metric') args.metric = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.all && !args.seller && !args.before && !args.metric) {
    console.log('Specify a scope to purge. Examples:');
    console.log('  --all                 Purge all overrides');
    console.log('  --seller <ID>         Purge overrides for a specific seller');
    console.log('  --before <YYYY-MM-DD> Purge overrides created before a date');
    console.log('  --metric <name>       Purge overrides for a specific metric');
    console.log('  Combine flags to narrow down (e.g., --seller <ID> --metric visitors)');
    process.exit(1);
  }

  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected.');

    // Build WHERE clause
    const where = [];
    const params = [];
    if (args.seller) {
      where.push('seller_id = ?');
      params.push(args.seller);
    }
    if (args.before) {
      // Basic validation for date format YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(args.before)) {
        throw new Error('Invalid --before date. Expected YYYY-MM-DD');
      }
      where.push('created_at < ?');
      params.push(args.before + ' 00:00:00');
    }
    if (args.metric) {
      where.push('metric_name = ?');
      params.push(args.metric);
    }

    let countQuery = 'SELECT COUNT(*) AS cnt FROM admin_overrides';
    let deleteQuery = 'DELETE FROM admin_overrides';

    if (args.all && where.length === 0) {
      // Full purge
      const [rows] = await connection.execute(countQuery);
      const total = rows[0].cnt;
      if (total === 0) {
        console.log('Table admin_overrides is already empty.');
        return;
      }
      console.log(`About to remove ALL (${total}) records from admin_overrides.`);
      await confirmOrExit(args);
      const [result] = await connection.execute('TRUNCATE TABLE admin_overrides');
      console.log('All records removed with TRUNCATE.');
      return;
    }

    // Partial purge
    if (where.length > 0) {
      countQuery += ' WHERE ' + where.join(' AND ');
      deleteQuery += ' WHERE ' + where.join(' AND ');
    }

    const [rows] = await connection.execute(countQuery, params);
    const total = rows[0].cnt;
    if (total === 0) {
      console.log('Nothing to delete for the specified scope.');
      return;
    }

    console.log(`About to delete ${total} record(s) from admin_overrides with conditions:`);
    if (args.seller) console.log(`  seller_id = ${args.seller}`);
    if (args.before) console.log(`  created_at < ${args.before}`);
    if (args.metric) console.log(`  metric_name = ${args.metric}`);

    await confirmOrExit(args);

    const [result] = await connection.execute(deleteQuery, params);
    console.log(`Deleted ${result.affectedRows} record(s).`);
  } catch (err) {
    console.error('Purge failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
      console.log('DB connection closed.');
    }
  }
}

async function confirmOrExit(args) {
  if (args.yes) return;
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(resolve => rl.question('Proceed? (y/N): ', resolve));
  rl.close();
  if (String(answer).toLowerCase() !== 'y') {
    console.log('Cancelled.');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

