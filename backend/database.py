"""MariaDB 연결 설정. 접속 정보는 프로젝트 루트의 .env에서 읽는다(.env.example 참고)."""

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# 이미 설정된 환경변수(예: systemd)가 있으면 .env보다 우선한다.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"환경변수 {name}가 없습니다. .env.example을 참고해 .env를 만드세요.")
    return value


# URL.create는 비밀번호의 특수문자를 알아서 처리한다.
DATABASE_URL = URL.create(
    "mysql+pymysql",
    username=require_env("DB_USER"),
    password=require_env("DB_PASSWORD"),
    host=require_env("DB_HOST"),
    port=int(os.getenv("DB_PORT", "3306")),
    database=require_env("DB_NAME"),
    query={"charset": "utf8mb4"},
)

# pool_pre_ping: 오래 쉬어 끊긴 연결을 쓰기 전에 확인하고 다시 연결한다.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass
