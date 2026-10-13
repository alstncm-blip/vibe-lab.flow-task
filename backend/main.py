"""Task Flow API 서버. 명세는 API-SPEC.md를 따른다."""

import re
from datetime import date
from typing import Annotated, Literal

from fastapi import FastAPI, status
from pydantic import BaseModel, BeforeValidator, StringConstraints

app = FastAPI(title="Task Flow API")

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


class Task(BaseModel):
    id: int
    title: str
    description: str
    status: Status
    priority: Priority
    due_date: date | None


# T06: 메모리 저장소. 서버를 다시 시작하면 사라진다(T11에서 DB로 교체).
tasks: list[Task] = []
next_id = 1


@app.get("/api/health")
def health() -> dict[str, str]:
    """서버가 요청을 받을 수 있는지 확인한다."""
    return {"status": "ok"}


@app.get("/api/tasks")
def list_tasks() -> list[Task]:
    """할 일 목록을 등록 순서로 돌려준다."""
    return tasks


@app.post("/api/tasks", status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate) -> Task:
    """할 일을 등록한다. id는 서버가 부여한다."""
    global next_id
    task = Task(id=next_id, **payload.model_dump())
    next_id += 1
    tasks.append(task)
    return task
