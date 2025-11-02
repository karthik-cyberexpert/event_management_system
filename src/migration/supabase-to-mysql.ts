import { Client } from 'pg';
import mysql from 'mysql2/promise';
import { exec } from 'child_process';
import util from 'util';

// Promisify the exec function to use it with async/await
const execPromise = util.promisify(exec);

// --- Configuration ---
// IMPORTANT: Replace these with your actual database credentials.
// It's highly recommended to use environment variables for this in a real application.

const supabaseConfig = {
  connectionString: process.env.SUPABASE_DB_URL || 'postgresql://postgres:your-supabase-db-password@db.sjsfhzrhxlsdmiadwwfu.supabase.co:5432/postgres',
};

const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'your-mysql-host',
  user: process.env.MYSQL_USER || 'your-mysql-user',
  password: process.env.MYSQL_PASSWORD || 'your-mysql-password',
  database: process.env.MYSQL_DATABASE || 'your-mysql-database',
};

/**
 * Translates PostgreSQL data types to their MySQL equivalents.
 * This is a simplified mapping and may need to be expanded based on your schema.
 * @param pgType The PostgreSQL data type (e.g., 'uuid', 'text', 'timestamp with time zone').
 * @returns The corresponding MySQL data type.
 */
function translateDataType(pgType: string): string {
  const mapping: { [key: string]: string } = {
    'uuid': 'CHAR(36)',
    'text': 'TEXT',
    'timestamp with time zone': 'DATETIME',
    'boolean': 'BOOLEAN',
    'integer': 'INT',
    'numeric': 'DECIMAL(10, 2)', // Adjust precision as needed
    'jsonb': 'JSON',
    'ARRAY': 'JSON', // A common way to handle arrays
    'USER-DEFINED': 'VARCHAR(255)', // ENUMs need special handling
  };

  // Find a direct match or a partial match (for cases like character varying(255))
  const matchedKey = Object.keys(mapping).find(key => pgType.includes(key));
  return matchedKey ? mapping[matchedKey] : 'VARCHAR(255)'; // Default fallback
}

/**
 * Main migration function.
 */
async function migrate() {
  let pgClient: Client | null = null;
  let mysqlConn: mysql.Connection | null = null;

  try {
    console.log('Starting Supabase to MySQL migration...');

    // 1. Connect to both databases
    pgClient = new Client(supabaseConfig);
    await pgClient.connect();
    console.log('Connected to Supabase (PostgreSQL) successfully.');

    mysqlConn = await mysql.createConnection(mysqlConfig);
    console.log('Connected to MySQL successfully.');

    // 2. Get all user-defined tables from the 'public' schema in Supabase
    const tablesRes = await pgClient.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `);
    const tables = tablesRes.rows.map(row => row.tablename);
    console.log(`Found ${tables.length} tables to migrate: ${tables.join(', ')}`);

    // 3. Process each table
    for (const tableName of tables) {
      console.log(`\n--- Processing table: ${tableName} ---`);

      // Get column definitions from Supabase
      const columnsRes = await pgClient.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = '${tableName}';
      `);
      const columns = columnsRes.rows;

      // Construct the CREATE TABLE statement for MySQL
      const columnDefs = columns.map(col => {
        const mysqlType = translateDataType(col.data_type);
        const nullConstraint = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        return `\`${col.column_name}\` ${mysqlType} ${nullConstraint}`;
      }).join(',\n  ');
      
      // Note: This simplified script doesn't handle primary keys, foreign keys, or indexes.
      // A more robust solution would query pg_constraint and pg_indexes.
      const createTableSql = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (\n  ${columnDefs}\n);`;

      console.log(`Generating CREATE TABLE statement for MySQL...`);
      // console.log(createTableSql); // Uncomment to debug the generated SQL

      // Execute the CREATE TABLE statement in MySQL
      await mysqlConn.execute(`DROP TABLE IF EXISTS \`${tableName}\`;`);
      await mysqlConn.execute(createTableSql);
      console.log(`Table \`${tableName}\` created in MySQL.`);

      // 4. Migrate data for the current table
      console.log(`Migrating data for \`${tableName}\`...`);
      const { rows: dataToMigrate } = await pgClient.query(`SELECT * FROM public."${tableName}";`);

      if (dataToMigrate.length > 0) {
        const columnNames = Object.keys(dataToMigrate[0]);
        const placeholders = columnNames.map(() => '?').join(', ');
        const insertSql = `INSERT INTO \`${tableName}\` (\`${columnNames.join('`, `')}\`) VALUES (${placeholders});`;

        for (const row of dataToMigrate) {
          // Convert array/object values to JSON strings for MySQL JSON columns
          const values = columnNames.map(colName => {
            const value = row[colName];
            if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
              return JSON.stringify(value);
            }
            return value;
          });
          await mysqlConn.execute(insertSql, values);
        }
        console.log(`Migrated ${dataToMigrate.length} rows to \`${tableName}\`.`);
      } else {
        console.log(`No data to migrate for \`${tableName}\`.`);
      }
    }

    console.log('\n--- Migration Warnings ---');
    console.log('IMPORTANT: This script does not migrate the following automatically:');
    console.log('- Functions (PL/pgSQL must be manually translated to MySQL stored procedures).');
    console.log('- Triggers and Row Level Security (RLS) policies.');
    console.log('- Primary Keys, Foreign Keys, Indexes, and other constraints.');
    console.log('- ENUM types (they were mapped to VARCHAR, manual creation in MySQL is needed).');
    console.log('These must be reviewed and migrated manually.');

    console.log('\nMigration script finished successfully!');

  } catch (error) {
    console.error('An error occurred during migration:', error);
  } finally {
    // 5. Close connections
    if (pgClient) await pgClient.end();
    if (mysqlConn) await mysqlConn.end();
    console.log('Database connections closed.');
  }
}

// To run this script, you would typically execute `ts-node src/migration/supabase-to-mysql.ts`
// from your terminal, after setting up your environment variables.
// Do not run this from the browser.
migrate();