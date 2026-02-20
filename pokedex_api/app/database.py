from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

class Database:
    def __init__(self, database_url: str) -> None:
        self.engine: Engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.Base = declarative_base()

    def get_session(self) -> Session:
        return self.SessionLocal()

# Example connection URL for PostgreSQL
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres"

database = Database(SQLALCHEMY_DATABASE_URL)

# Usage example:
# with database.get_session() as session:
#     # perform database operations here