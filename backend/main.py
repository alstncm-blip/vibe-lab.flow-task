"""Task Flow API 서버. 명세는 API-SPEC.md를 따른다."""

import re
from datetime import date
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, BeforeValidator, StringConstraints

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


def find_task(task_id: int) -> Task:
    for task in tasks:
        if task.id == task_id:
            return task
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")


@app.get("/api/tasks")
def list_tasks(
    status: Status | None = None,
    priority: Priority | None = None,
    q: str | None = None,
) -> list[Task]:
    """할 일 목록을 등록 순서로 돌려준다. 조건을 함께 주면 모두 만족하는 항목만 돌려준다."""
    keyword = (q or "").strip().lower()
    return [
        task
        for task in tasks
        if (status is None or task.status == status)
        and (priority is None or task.priority == priority)
        and (keyword == "" or keyword in task.title.lower() or keyword in task.description.lower())
    ]


@app.post("/api/tasks", status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate) -> Task:
    """할 일을 등록한다. id는 서버가 부여한다."""
    global next_id
    task = Task(id=next_id, **payload.model_dump())
    next_id += 1
    tasks.append(task)
    return task


@app.patch("/api/tasks/{task_id}")
def update_task(task_id: int, payload: TaskUpdate) -> Task:
    """보낸 필드만 수정하고 보내지 않은 필드는 그대로 둔다."""
    task = find_task(task_id)
    changes = payload.model_dump(exclude_unset=True)
    updated = task.model_copy(update=changes)
    tasks[tasks.index(task)] = updated
    return updated


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int) -> Response:
    """할 일을 삭제한다. 본문 없이 204를 돌려준다."""
    task = find_task(task_id)
    tasks.remove(task)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
