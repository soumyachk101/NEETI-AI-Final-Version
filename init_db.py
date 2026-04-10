"""
Database initialization script.
Creates initial database schema and applies migrations.

NOTE: User management is handled by Supabase Auth.
No seed users are created — admins are provisioned via Supabase dashboard.

CRIT-6 FIX: Migrations now track applied state and fail loudly instead
of silently swallowing errors.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import init_db, engine
from app.core.config import settings
from app.core.logging import logger
from sqlalchemy import text


async def apply_migrations():
    """Apply SQL migration files in order.
    
    CRIT-6 FIX: Uses a migrations table to track which migrations have been
    applied, preventing double-application and catching real errors instead
    of silently swallowing them.
    """
    migrations_dir = Path(__file__).parent / "migrations"
    if not migrations_dir.exists():
        logger.info("No migrations directory found, skipping migrations")
        return

    migration_files = sorted(migrations_dir.glob("*.sql"))
    if not migration_files:
        logger.info("No migration files found")
        return

    async with engine.begin() as conn:
        # Create migration tracking table if it doesn't exist
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS _migration_history (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))

        # Get list of already-applied migrations
        result = await conn.execute(text("SELECT filename FROM _migration_history"))
        applied = {row[0] for row in result.fetchall()}

        applied_count = 0
        skipped_count = 0

        for migration_file in migration_files:
            if migration_file.name in applied:
                logger.debug(f"Migration already applied, skipping: {migration_file.name}")
                skipped_count += 1
                continue

            logger.info(f"Applying migration: {migration_file.name}")
            try:
                sql = migration_file.read_text()
                for statement in sql.split(";"):
                    statement = statement.strip()
                    if statement and not statement.startswith("--"):
                        await conn.execute(text(statement))

                # Record that this migration was applied
                await conn.execute(
                    text("INSERT INTO _migration_history (filename) VALUES (:filename)"),
                    {"filename": migration_file.name}
                )
                logger.info(f"Migration applied: {migration_file.name}")
                applied_count += 1

            except Exception as e:
                # CRIT-6 FIX: Fail loudly — don't silently skip broken migrations
                logger.error(f"Migration FAILED: {migration_file.name} — {e}")
                raise RuntimeError(
                    f"Migration {migration_file.name} failed: {e}. "
                    f"Fix the migration and retry. Previously applied migrations: {applied}"
                ) from e

        logger.info(
            f"Migrations complete: {applied_count} applied, {skipped_count} skipped"
        )


async def main():
    """Initialize database and apply migrations."""
    logger.info("Initializing database...")
    
    await init_db()
    await apply_migrations()
    
    logger.info("Database initialization complete!")
    logger.info("NOTE: User accounts are managed via Supabase Auth dashboard.")

if __name__ == "__main__":
    asyncio.run(main())

# Synced for GitHub timestamp

 
