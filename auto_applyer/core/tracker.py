from __future__ import annotations

import datetime as dt
from pathlib import Path
from typing import Optional

from sqlalchemy import Column, Date, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True)
    job_id = Column(String, unique=True)
    title = Column(String)
    company = Column(String)
    provider = Column(String)
    date_applied = Column(Date)
    status = Column(String, default="submitted")
    follow_up_dt = Column(Date, nullable=True)
    notes = Column(String, nullable=True)


def init_db(db_url: str):
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


class Tracker:
    def __init__(self, db_url: str):
        self.session_factory = init_db(db_url)

    def log_application(self, job_id: str, title: str, company: str, provider: str):
        session = self.session_factory()
        app = Application(
            job_id=job_id,
            title=title,
            company=company,
            provider=provider,
            date_applied=dt.date.today(),
        )
        session.add(app)
        session.commit()
        session.close()
