"""Task Flow API 서버. 명세는 API-SPEC.md를 따른다."""

from fastapi import FastAPI

app = FastAPI(title="Task Flow API")


@app.get("/api/health")
def health() -> dict[str, str]:
    """서버가 요청을 받을 수 있는지 확인한다."""
    return {"status": "ok"}
