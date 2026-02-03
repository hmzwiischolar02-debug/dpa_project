import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from app.core.config import settings

def get_db_connection():
    """Get a database connection"""
    return psycopg2.connect(settings.DATABASE_URL)

@contextmanager
def get_db():
    """Context manager for database connections with auto commit/rollback"""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_db_cursor(conn):
    """Get a cursor that returns dictionaries instead of tuples"""
    return conn.cursor(cursor_factory=RealDictCursor)