"""Task Flow API 서버. 명세는 API-SPEC.md를 따른다."""

import logging
import re
from collections.abc import Iterator
from datetime import date
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, BeforeValidator, ConfigDict, StringConstraints
from sqlalchemy import or_, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models import TaskRow

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Task Flow API")

# 개발 중에는 화면(5500)과 API(8000)의 포트가 달라 CORS 허용이 필요하다.
# 5장에서 Nginx로 같은 주소에서 제공하면 필요 없다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500"],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)

Status = Literal["TODO", "IN_PROGRESS", "DONE"]
Priority = Literal["LOW", "MEDIUM", "HIGH"]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]
DATE_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}")


def require_date_string(value: object) -> object:
    """마감일은 "YYYY-MM-DD" 문자열 또는 null만 받는다(숫자 타임스탬프 등은 거절)."""
    if value is None:
        return value
    if not isinstance(value, str) or not DATE_PATTERN.fullmatch(value):
        raise ValueError("due_date must be a YYYY-MM-DD string or null")
    return value


DueDate = Annotated[date | None, BeforeValidator(require_date_string)]


class TaskCreate(BaseModel):
    """POST /api/tasks 요청 본문. 정의되지 않은 필드(id 등)는 무시한다."""

    title: Title
    description: Description = ""
    status: Status = "TODO"
    priority: Priority = "MEDIUM"
    due_date: DueDate = None


class TaskUpdate(BaseModel):
    """PATCH /api/tasks/{id} 요청 본문. 보낸 필드만 바꾼다.

    기본값 None은 "보내지 않음"을 뜻한다. due_date만 null을 보내 지울 수 있고,
    나머지 필드에 null을 보내면 타입 검증에서 422가 된다.
    """

    title: Title = None
    description: Description = None
    status: Status = None
    priority: Priority = None
    due_date: DueDate = None


class Task(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    status: Status
    priority: Priority
    due_date: date | None


def get_db() -> Iterator[Session]:
    """요청마다 DB 세션을 열고 끝나면 닫는다."""
    with SessionLocal() as db:
        yield db


DB = Annotated[Session, Depends(get_db)]


@app.exception_handler(OperationalError)
def database_unavailable(request: Request, exc: OperationalError) -> JSONResponse:
    """DB에 접속할 수 없으면 500 대신 503으로 알린다. 접속 정보는 응답에 넣지 않는다."""
    logger.error("DB 접속 오류: %s", exc.orig)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "Database unavailable"},
    )


@app.get("/api/health")
def health() -> dict[str, str]:
    """서버가 요청을 받을 수 있는지 확인한다."""
    return {"status": "ok"}


def find_task(db: Session, task_id: int) -> TaskRow:
    row = db.get(TaskRow, task_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return row


@app.get("/api/tasks")
def list_tasks(
    db: DB,
    status: Status | None = None,
    priority: Priority | None = None,
    q: str | None = None,
) -> list[Task]:
    """할 일 목록을 등록 순서로 돌려준다. 조건을 함께 주면 모두 만족하는 항목만 돌려준다."""
    query = select(TaskRow).order_by(TaskRow.id)
    if status is not None:
        query = query.where(TaskRow.status == status)
    if priority is not None:
        query = query.where(TaskRow.priority == priority)
    keyword = (q or "").strip()
    if keyword != "":
        # autoescape: 검색어의 %, _ 를 글자 그대로 찾는다. 대소문자 구분은 DB 콜레이션(_ci)이 없앤다.
        query = query.where(
            or_(TaskRow.title.contains(keyword, autoescape=True), TaskRow.description.contains(keyword, autoescape=True))
        )
    return db.scalars(query).all()


@app.post("/api/tasks", status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: DB) -> Task:
    """할 일을 등록한다. id는 DB(AUTO_INCREMENT)가 부여한다."""
    row = TaskRow(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.patch("/api/tasks/{task_id}")
def update_task(task_id: int, payload: TaskUpdate, db: DB) -> Task:
    """보낸 필드만 수정하고 보내지 않은 필드는 그대로 둔다."""
    row = find_task(db, task_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: DB) -> Response:
    """할 일을 삭제한다. 본문 없이 204를 돌려준다."""
    row = find_task(db, task_id)
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
