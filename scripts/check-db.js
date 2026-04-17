// Database state checker script
// Uses the pg library to query current tables, extensions, RLS policies, and storage buckets

import pg from "pg";
const { Client } = pg;

// Connection string - exact as provided by user
const CONNECTION_STRING =
  "postgresql://postgres:H%ioCWiXp8Y&71N0@db.qxuxvhzgmrwpngvmsume.supabase.co:5432/postgres";

async function main() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✅ Connected to Supabase database!\n");

    // 1. List all public tables
    console.log("=== PUBLIC TABLES ===");
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    tablesResult.rows.forEach((row) => console.log(`  - ${row.table_name}`));
    console.log();

    // 2. List all columns for each table
    console.log("=== TABLE COLUMNS ===");
    const columnsResult = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);
    let currentTable = "";
    columnsResult.rows.forEach((row) => {
      if (row.table_name !== currentTable) {
        currentTable = row.table_name;
        console.log(`\n  📋 ${currentTable}:`);
      }
      const nullable = row.is_nullable === "YES" ? "NULL" : "NOT NULL";
      const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : "";
      console.log(`    - ${row.column_name} ${row.data_type} ${nullable}${defaultVal}`);
    });
    console.log();

    // 3. Check RLS status
    console.log("=== ROW LEVEL SECURITY STATUS ===");
    const rlsResult = await client.query(`
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    rlsResult.rows.forEach((row) => {
      const status = row.rowsecurity ? "✅ ENABLED" : "❌ DISABLED";
      console.log(`  - ${row.tablename}: ${status}`);
    });
    console.log();

    // 4. List RLS policies
    console.log("=== RLS POLICIES ===");
    const policiesResult = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    let currentPolicyTable = "";
    policiesResult.rows.forEach((row) => {
      if (row.tablename !== currentPolicyTable) {
        currentPolicyTable = row.tablename;
        console.log(`\n  📋 ${currentPolicyTable}:`);
      }
      console.log(`    - ${row.policyname} (${row.cmd}) → ${row.permissive} to ${row.roles}`);
    });
    console.log();

    // 5. List storage buckets
    console.log("=== STORAGE BUCKETS ===");
    const bucketsResult = await client.query(`
      SELECT id, name, public, file_size_limit, allowed_mime_types
      FROM storage.buckets
      ORDER BY name;
    `);
    bucketsResult.rows.forEach((row) => {
      const pub = row.public ? "🌐 Public" : "🔒 Private";
      console.log(`  - ${row.name} (${row.id}): ${pub}`);
    });
    console.log();

    // 6. List storage policies
    console.log("=== STORAGE POLICIES ===");
    const storagePoliciesResult = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd
      FROM pg_policies 
      WHERE schemaname = 'storage'
      ORDER BY tablename, policyname;
    `);
    storagePoliciesResult.rows.forEach((row) => {
      console.log(`  - ${row.policyname} (${row.cmd}) → ${row.permissive} to ${row.roles}`);
    });
    console.log();

    // 7. List installed extensions
    console.log("=== INSTALLED EXTENSIONS ===");
    const extensionsResult = await client.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      ORDER BY extname;
    `);
    extensionsResult.rows.forEach((row) => {
      console.log(`  - ${row.extname} (v${row.extversion})`);
    });
    console.log();

    // 8. List triggers
    console.log("=== TRIGGERS ===");
    const triggersResult = await client.query(`
      SELECT event_object_table, trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `);
    if (triggersResult.rows.length === 0) {
      console.log("  (no triggers found)");
    } else {
      triggersResult.rows.forEach((row) => {
        console.log(`  - ${row.event_object_table}.${row.trigger_name} ON ${row.event_manipulation}`);
      });
    }
    console.log();

    // 9. List functions
    console.log("=== CUSTOM FUNCTIONS ===");
    const functionsResult = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      ORDER BY routine_name;
    `);
    if (functionsResult.rows.length === 0) {
      console.log("  (no custom functions found)");
    } else {
      functionsResult.rows.forEach((row) => {
        console.log(`  - ${row.routine_name} (${row.routine_type})`);
      });
    }

  } catch (err) {
    console.error("❌ Database error:", err.message);
    console.error(err);
  } finally {
    await client.end();
    console.log("\n🔌 Connection closed.");
  }
}

main();
