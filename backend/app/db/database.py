import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from app.core.config import settings

@contextmanager
def get_db():
    """Get database connection with context manager"""
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()

def get_db_cursor(conn):
    """Get database cursor with RealDictCursor"""
    return conn.cursor(cursor_factory=RealDictCursor)