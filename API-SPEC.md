# Task Flow API 명세

할 일(Task)을 등록·조회·수정·삭제하는 HTTP API다. 프런트엔드(T04)가 localStorage에 저장하던 데이터를
서버에 저장하기 위해 만든다. PRD에 API 요구사항이 없으므로 T04 화면의 데이터와 동작을 기준으로 정했다.

## 구현 단계

| 작업 | 범위 | 저장소 |
|---|---|---|
| T05 | `GET /api/health` | 없음 |
| T06 | `GET /api/tasks`, `POST /api/tasks` | 메모리 (서버를 다시 시작하면 사라짐) |
| T07 | `PATCH /api/tasks/{id}`, `DELETE /api/tasks/{id}`, 목록 필터 | 메모리 |
| T11 | 위 API 전체 (계약 변경 없음) | MariaDB |

## 공통 규칙

- 기본 주소: `/api`
- 요청·응답 본문은 JSON(`Content-Type: application/json`), 문자 인코딩은 UTF-8이다.
- 필드 이름은 snake_case를 쓴다.
- 서버는 입력값을 다시 검증한다. 프런트엔드 검증만 믿지 않는다.
- 문자열은 앞뒤 공백을 지운 뒤 검증하고 저장한다.
- 응답에 HTML을 만들지 않는다. 화면은 받은 문자열을 글자로 표시한다.

## Task 객체

| 필드 | 타입 | 필수 | 규칙 | 기본값 |
|---|---|---|---|---|
| `id` | integer | 응답 | 서버가 부여한다. 1부터 증가하고 재사용하지 않는다. 요청에서 보내도 무시한다. | - |
| `title` | string | 등록 시 필수 | 공백 제거 후 1~100자 | - |
| `description` | string | 선택 | 공백 제거 후 0~1000자 | `""` |
| `status` | string | 선택 | `TODO`, `IN_PROGRESS`, `DONE` 중 하나 | `TODO` |
| `priority` | string | 선택 | `LOW`, `MEDIUM`, `HIGH` 중 하나 | `MEDIUM` |
| `due_date` | string \| null | 선택 | `YYYY-MM-DD` 형식의 실제 날짜, 또는 `null`(마감일 없음) | `null` |

예시:

```json
{
  "id": 1,
  "title": "보고서 작성",
  "description": "3분기 실적 정리",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "due_date": "2026-10-20"
}
```

글자 수 제한(100자, 1000자)은 PRD에 정의가 없어 임시로 정한 값이다.

지연 여부는 저장하지 않는다. 화면이 `due_date`와 `status`로 계산한다
(마감일이 오늘보다 이전이고 `DONE`이 아니면 지연).

## 엔드포인트

### GET /api/health

서버 상태를 확인한다.

- 응답 `200 OK`

```json
{ "status": "ok" }
```

### GET /api/tasks

할 일 목록을 등록 순서(`id` 오름차순)로 돌려준다.

쿼리 매개변수(모두 선택, 함께 쓰면 모두 만족하는 항목만 돌려준다):

| 이름 | 규칙 |
|---|---|
| `status` | `TODO`, `IN_PROGRESS`, `DONE` 중 하나 |
| `priority` | `LOW`, `MEDIUM`, `HIGH` 중 하나 |
| `q` | 제목 또는 설명에 포함된 글자(대소문자 구분 없음). 빈 값이면 조건을 적용하지 않는다. |

- 응답 `200 OK`: Task 객체 배열. 없으면 `[]`.
- 응답 `422 Unprocessable Entity`: `status`·`priority` 값이 허용 목록에 없을 때.

예: `GET /api/tasks?status=TODO&q=보고서`

필터(`status`, `priority`, `q`)는 T07에서 구현한다. T06에서는 전체 목록만 돌려준다.

### POST /api/tasks

할 일을 등록한다. 본문에는 `title`이 반드시 있어야 하고, 나머지 필드는 생략하면 기본값을 쓴다.

```json
{
  "title": "보고서 작성",
  "description": "3분기 실적 정리",
  "priority": "HIGH",
  "due_date": "2026-10-20"
}
```

- 응답 `201 Created`: 등록된 Task 객체.
- 응답 `422 Unprocessable Entity`: `title`이 없거나 비었을 때, 글자 수·허용 값·날짜 형식이 맞지 않을 때.

### PATCH /api/tasks/{id}

할 일의 일부 필드를 수정한다. **보낸 필드만 바꾸고 보내지 않은 필드는 그대로 둔다.**
`id`는 바꿀 수 없다.

```json
{ "status": "DONE" }
```

- `title`을 보내면 비어 있을 수 없다. `title: null`도 허용하지 않는다.
- `due_date: null`을 보내면 마감일을 지운다.
- 응답 `200 OK`: 수정된 Task 객체.
- 응답 `404 Not Found`: 해당 `id`가 없을 때.
- 응답 `422 Unprocessable Entity`: 값 규칙을 어겼을 때.

### DELETE /api/tasks/{id}

할 일을 삭제한다.

- 응답 `204 No Content`: 본문 없음.
- 응답 `404 Not Found`: 해당 `id`가 없을 때.

## 오류 응답

FastAPI 기본 형식을 따른다.

- `404 Not Found`

```json
{ "detail": "Task not found" }
```

- `422 Unprocessable Entity`: `detail`에 위반한 필드와 이유가 배열로 들어간다.

```json
{
  "detail": [
    { "loc": ["body", "title"], "msg": "String should have at least 1 character", "type": "string_too_short" }
  ]
}
```
