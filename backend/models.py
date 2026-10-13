"""DB 테이블 정의. 컬럼 규칙은 API-SPEC.md의 Task 객체를 따른다."""

from datetime import date

from sqlalchemy import CheckConstraint, Date, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class TaskRow(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint("status IN ('TODO', 'IN_PROGRESS', 'DONE')", name="ck_tasks_status"),
        CheckConstraint("priority IN ('LOW', 'MEDIUM', 'HIGH')", name="ck_tasks_priority"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    # AUTO_INCREMENT: 삭제된 id를 다시 쓰지 않는다.
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=False, default="", server_default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="TODO", server_default="TODO")
    priority: Mapped[str] = mapped_column(String(10), nullable=False, default="MEDIUM", server_default="MEDIUM")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
