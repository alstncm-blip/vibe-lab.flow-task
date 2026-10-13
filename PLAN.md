# Task Flow PLAN
## 작업 원칙
한 번에 아래 작업 하나만 구현한다. 실제 확인 전에는 완료로 표시하지 않는다.
상태는 [ ] 미완료, [x] 확인 완료로 관리하고 확인 결과를 각 항목 아래 기록한다.
## 2장: 브라우저 앱
- [x] T01: frontend/index.html, frontend/styles.css, frontend/app.js 생성. 제목 입력·등록·목록만 구현한다.
  확인: 두 항목 등록, 빈 제목 거절. 이 단계에서 새로고침하면 사라져도 정상이다.
  - 변경 파일: frontend/index.html, frontend/styles.css, frontend/app.js
  - 실행 명령: python3 -m http.server 5500 --bind 127.0.0.1 --directory frontend
  - 확인 결과(2026-10-13): curl로 /, /styles.css, /app.js 모두 200. app.js를 Node 가짜 DOM으로 실행해
    두 항목 등록, 빈 제목·공백 제목 거절, HTML 입력이 글자로 표시되는 것을 확인.
  - 브라우저 확인(사용자): 두 항목 등록, 빈 제목 거절, 새로고침 시 목록 사라짐(정상) 확인.
  - 남은 오류: 없음
- [x] T02: localStorage(task-flow-v1) 저장·복원.
  확인: 새로고침 후 유지. 손상된 저장값을 자동 덮어쓰지 않는다.
  - 변경 파일: frontend/app.js, frontend/index.html(저장 경고 문구 영역), frontend/styles.css(경고 스타일)
  - 실행 명령: python3 -m http.server 5500 --bind 127.0.0.1 --directory frontend
  - 확인 결과(2026-10-13): app.js를 Node 가짜 DOM·localStorage로 실행해 새로고침 후 목록 유지,
    손상값 4종({not json, {"a":1}, [{"id":1}], [1,2])에서 경고 표시·원본 유지, 저장소 차단 시 앱 오류 없음,
    연속 등록 시 id 중복 없음(T01에서 같은 밀리초에 id가 겹치던 문제 수정) 확인.
  - 브라우저 확인(사용자): 새로고침 후 목록 유지 확인.
  - 남은 일: 손상값 보호는 Node 테스트로만 확인, 브라우저 미확인(사용자 결정으로 생략).
- [x] T03: 상태 변경, 수정, 삭제 확인.
  확인: 삭제 취소 시 유지. 다른 항목이 수정되지 않는다.
  - 변경 파일: frontend/app.js, frontend/styles.css
  - 상태 값: TODO(할 일)·IN_PROGRESS(진행 중)·DONE(완료). PRD에 정의가 없어 임시로 정함.
    T02에서 저장된 항목(status 없음)은 TODO로 읽는다.
  - 실행 명령: python3 -m http.server 5500 --bind 127.0.0.1 --directory frontend
  - 확인 결과(2026-10-13): app.js를 Node 가짜 DOM·localStorage로 실행해 상태 변경, 제목 수정,
    빈 제목 수정 거절, Esc 수정 취소, 삭제 취소 시 유지, 삭제 확인 시 해당 항목만 삭제,
    각 변경 후 다른 항목 불변, 새로고침 후 유지, T02 형식 데이터 로드 확인.
  - 브라우저 확인(사용자): 상태 변경·제목 수정 시 다른 항목 불변, 삭제 취소 시 유지, 삭제 확인 시 해당 항목만 삭제.
  - 남은 오류: 없음
- [x] T04: 설명·우선순위·마감일·검색·필터·지연 표시.
  확인: 필터 중 수정·삭제, 어제 마감 TODO의 지연 표시.
  - 변경 파일: frontend/index.html, frontend/app.js, frontend/styles.css
  - 정한 기준(PRD에 정의 없음): 우선순위 LOW(낮음)·MEDIUM(보통, 기본)·HIGH(높음). 마감일은 선택(YYYY-MM-DD).
    검색은 제목·설명 대상, 필터는 상태·우선순위. 지연은 마감일 < 오늘(브라우저 날짜)이고 DONE이 아닌 항목.
    이전 데이터의 빈 필드는 description "", priority MEDIUM, dueDate null로 읽는다.
  - 실행 명령: python3 -m http.server 5500 --bind 127.0.0.1 --directory frontend
  - 확인 결과(2026-10-13): app.js를 Node 가짜 DOM·localStorage로 실행해 어제 마감 TODO·IN_PROGRESS 지연 표시,
    어제 마감 DONE·오늘 마감은 지연 아님, 설명 검색, 결과 없음 문구, 상태·우선순위 필터,
    필터 중 내용 수정·상태 변경·삭제 취소·삭제 확인 시 다른 항목 불변, 새로고침 후 유지,
    이전 형식 데이터 로드, 잘못된 우선순위 저장값 보호, 사용자 입력 글자 표시 확인.
  - 브라우저 확인(사용자): 어제 마감 항목 지연 표시, 필터 중 수정 시 해당 항목만 변경, 필터 중 삭제 시 해당 항목만 삭제.
  - 남은 오류: 없음
## 3장: API
- [x] T05: API-SPEC.md 작성, FastAPI /api/health 구현.
  확인: curl로 200과 status=ok.
  - 변경 파일: API-SPEC.md, backend/__init__.py, backend/main.py, requirements.txt(fastapi, uvicorn), .gitignore(.venv·.env 제외)
  - 정한 기준(PRD에 정의 없음): API 필드는 snake_case(due_date), id는 서버가 부여하는 정수,
    title 1~100자·description 0~1000자. 자세한 내용은 API-SPEC.md.
  - 실행 명령: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
    .venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
  - 확인 결과(2026-10-13): curl http://127.0.0.1:8000/api/health → 200, {"status":"ok"}. /docs 200.
  - 남은 오류: 없음
- [x] T06: 메모리 기반 /api/tasks GET과 POST.
  확인: /docs에서 등록 후 조회. 입력 위반은 422.
  - 변경 파일: backend/main.py
  - 실행 명령: .venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
  - 확인 결과(2026-10-13, curl): 빈 목록 [] 200. 제목만·전체 필드 등록 201(앞뒤 공백 제거, 기본값 적용,
    요청의 id 무시, id 1부터 증가), 등록 후 GET에 반영. title 없음·빈 값·공백·101자, description 1001자,
    허용되지 않은 status·priority, 날짜 형식 위반(2026/10/20, 2026-02-30, 숫자, 시간 포함), JSON 아님 → 422.
    서버 재시작(--reload) 후 목록이 비는 것 확인(메모리 저장).
  - 수정한 오류: due_date에 strict 모드를 쓰면 정상 날짜 "2026-10-20"도 422가 나와 문자열 형식 검사로 교체.
  - /docs 확인(사용자, 서버 로그로 확인): POST 201 두 건 등록 후 GET 200, 목록에 id 4·5 반영. 위반 입력 422.
  - 남은 오류: 없음
- [x] T07: PATCH·DELETE와 필터 구현.
  확인: 미전달 필드 유지, 없는 ID 404, 삭제 204.
  - 변경 파일: backend/main.py
  - 실행 명령: .venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
  - 확인 결과(2026-10-13, curl): PATCH status만·title만·빈 본문 → 나머지 필드 유지(200), due_date null로 마감일 삭제,
    요청의 id 무시, title·status null·공백 title·잘못된 값 → 422(항목 변경 없음), 없는 ID 404, 숫자 아닌 ID 422,
    다른 항목 불변. 필터 status·priority·q(설명 포함)·조합·결과 없음 [], 잘못된 status 422.
    DELETE 204(본문 없음), 같은 ID 재삭제·없는 ID 404, 삭제 후 등록 시 id 재사용 안 함.
  - 남은 오류: 없음
- [x] T08: 프런트엔드 저장 처리를 API 호출로 교체.
  확인: 화면과 curl 목록이 같음. API 중지 시 오류 표시.
  - 변경 파일: frontend/app.js, frontend/index.html(오류 영역 api-error, 글자 수 제한), frontend/styles.css,
    backend/main.py(CORS: localhost:5500·127.0.0.1:5500만 허용), API-SPEC.md(CORS 규칙)
  - 동작: 목록은 시작 시 GET으로 불러오고, 등록·상태 변경·수정·삭제는 서버 응답을 받은 뒤 화면에 반영.
    검색·필터·지연 표시는 화면에서 계산. 기존 localStorage(task-flow-v1) 데이터는 읽지 않고 지우지도 않음.
  - 실행 명령: API .venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
    화면 python3 -m http.server 5500 --bind 127.0.0.1 --directory frontend
  - 확인 결과(2026-10-13): curl로 CORS 사전 요청 허용 주소 200·그 외 400. app.js를 Node 가짜 DOM에서 실제 API에 연결해
    등록·상태 변경·수정·삭제 후 화면 목록과 GET 목록 일치, 삭제 취소 시 유지, 새로고침 후 유지,
    다른 곳에서 삭제된 항목 수정 시 404 안내 후 목록 갱신, API 중지(fetch 실패 흉내) 시 오류 표시·입력 유지·
    목록 불러오기 실패 안내와 다시 시도 버튼으로 복구 확인.
  - 브라우저 확인(사용자): 화면 등록·수정 후 화면과 curl 목록 일치(장보기/진행 중/높음 1건),
    API 서버 실제 중지 시 새로고침·등록에서 오류 표시와 입력 유지.
  - 남은 오류: 없음
## 4장: DB
- [x] T09: mariadb 전용 사용자·DB와 .env 준비. 접속 확인.
  - 변경 파일: .env.example(변수 이름·가짜 값), .env(실제 값, Git 제외·권한 600)
  - DB 구성: 기존 MariaDB 11.8(127.0.0.1:3306)에 사용자가 미리 만든 전용 사용자 task_flow_app@localhost와
    DB task_flow(utf8mb4, 테이블 없음) 사용. 권한은 task_flow.* 에만 ALL.
  - 확인 결과(2026-10-13): .env 값으로 mariadb -h 127.0.0.1 접속, SELECT 1 → 1, CURRENT_USER task_flow_app@localhost.
  - 남은 일: DB 비밀번호가 약한 임시 값임. 5장(T12)에서 DB를 별도 서버로 옮기기 전에 강한 값으로 변경.
- [x] T10: backend/database.py, backend/models.py, backend/init_db.py 생성.
  확인: python -m backend.init_db 실행 후 tasks 테이블 확인.
  - 변경 파일: backend/database.py(.env 읽기, SQLAlchemy 엔진·세션), backend/models.py(tasks 테이블),
    backend/init_db.py(없는 테이블만 생성), requirements.txt(SQLAlchemy, PyMySQL, python-dotenv)
  - tasks 컬럼: id INT AUTO_INCREMENT PK, title VARCHAR(100), description VARCHAR(1000) 기본 '',
    status VARCHAR(20) 기본 TODO, priority VARCHAR(10) 기본 MEDIUM, due_date DATE NULL. status·priority CHECK 제약.
  - 실행 명령: .venv/bin/pip install -r requirements.txt && .venv/bin/python -m backend.init_db
  - 확인 결과(2026-10-13): 1회차 "tasks: 생성함", 2회차 "이미 있음(변경 없음)". SQL로 SHOW TABLES에 tasks,
    SHOW CREATE TABLE로 컬럼·제약·utf8mb4 확인, 행 0개. 잘못된 status INSERT는 CHECK 제약으로 거절(ERROR 4025).
  - 남은 오류: 없음
- [ ] T11: API 메모리 저장을 DB로 교체.
  확인: 등록한 행을 SQL로 조회. API 재시작 후 데이터 유지.
## 5장: 서버 분리
- [ ] T12: DB 서버 구성 후 App 서버에서 SELECT 1 확인.
- [ ] T13: App 서버 코드·가상환경·환경변수·systemd 구성.
  확인: App에서 /api/health 응답.
- [ ] T14: Web 서버 Nginx와 정적 파일·/api 프록시 구성.
  확인: Web 주소로 등록, DB 저장, App 재시작 후 유지.
## 실행 기준
T01~T04: python3 -m http.server 5500 --bind 127.0.0.1 --directory frontend
T05~T11: 가상환경에서 python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
실제 존재하는 파일을 확인한 뒤 명령을 실행한다.
## 기록
각 작업에 변경 파일, 실행 명령, 실제 확인 결과, 남은 오류를 기록한다.
정상 동작을 확인한 작업 단위로 Git 커밋한다.