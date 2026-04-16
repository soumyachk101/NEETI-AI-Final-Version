"""
Database initialization script.
Creates initial database schema and applies migrations.

NOTE: User management is handled by Supabase Auth.
No seed users are created — admins are provisioned via Supabase dashboard.
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
    """Apply SQL migration files in order."""
    migrations_dir = Path(__file__).parent / "migrations"
    if not migrations_dir.exists():
        return

    migration_files = sorted(migrations_dir.glob("*.sql"))
    if not migration_files:
        return

    async with engine.begin() as conn:
        for migration_file in migration_files:
            logger.info(f"Applying migration: {migration_file.name}")
            try:
                sql = migration_file.read_text()
                for statement in sql.split(";"):
                    statement = statement.strip()
                    if statement and not statement.startswith("--"):
                        await conn.execute(text(statement))
                logger.info(f"Migration applied: {migration_file.name}")
            except Exception as e:
                logger.warning(f"Migration {migration_file.name} skipped (may already be applied): {e}")

async def main():
    """Initialize database and apply migrations."""
    logger.info("Initializing database...")
    
    await init_db()
    await apply_migrations()
    
    logger.info("Database initialization complete!")
    logger.info("NOTE: User accounts are managed via Supabase Auth dashboard.")

if __name__ == "__main__":
    asyncio.run(main())
