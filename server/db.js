import pg from 'pg'
import dotenv from 'dotenv'
import path from 'node:path'
const defaultEnvPath = process.cwd().endsWith(`${path.sep}server`)
  ? path.resolve(process.cwd(), '..', '.env')
  : path.resolve(process.cwd(), '.env')
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || defaultEnvPath })

const { Pool } = pg

function isPlaceholder(value) {
  if (!value) return true
  const v = String(value)
  return v.includes('******') || v.toLowerCase().includes('placeholder')
}

let pool

const hasFullDbConfig = (!isPlaceholder(process.env.DATABASE_URL) && process.env.DATABASE_URL) || (process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE)

console.log('DB config check:', {
  DATABASE_URL: process.env.DATABASE_URL ? '[set]' : '[unset]',
  isPlaceholder: isPlaceholder(process.env.DATABASE_URL),
  PGUSER: process.env.PGUSER ? '[set]' : '[unset]',
  PGPASSWORD: process.env.PGPASSWORD ? '[set]' : '[unset]',
  PGDATABASE: process.env.PGDATABASE ? '[set]' : '[unset]',
  hasFullDbConfig: Boolean((!isPlaceholder(process.env.DATABASE_URL) && process.env.DATABASE_URL) || (process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE))
})

// If DATABASE_URL looks like the placeholder in the example .env and no PG* env vars are set,
// avoid creating a real pg Pool with invalid credentials. Instead export a stub that throws a
// clear, actionable error when used. This prevents confusing 'password authentication failed'
// errors in CI and local environments that haven't been configured yet.
if (!hasFullDbConfig) {
  console.warn('⚠️ PostgreSQL not configured: DATABASE_URL or PG* environment variables are missing or contain placeholders. Database queries will fail until configured.')
  pool = {
    query: async () => {
      throw new Error('PostgreSQL not configured. Set DATABASE_URL (including username/password) or PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT in the environment.')
    },
    on: () => {}
  }
} else {
  // Prefer a full connection string if provided, otherwise use individual PG_* env vars.
  const config = process.env.DATABASE_URL && !isPlaceholder(process.env.DATABASE_URL)
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE
      }

  pool = new Pool(config)

  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err.message)
  })

}

export default pool
