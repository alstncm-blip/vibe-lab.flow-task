"""테이블을 만든다. 실행: python -m backend.init_db

이미 있는 테이블은 건드리지 않는다(삭제·초기화하지 않음).
"""

from sqlalchemy import inspect

from backend.database import engine
from backend.models import Base


def main() -> None:
    before = set(inspect(engine).get_table_names())
    Base.metadata.create_all(engine)
    after = set(inspect(engine).get_table_names())

    for name in sorted(Base.metadata.tables):
        state = "이미 있음(변경 없음)" if name in before else "생성함"
        print(f"{name}: {state}")
    if not after >= set(Base.metadata.tables):
        raise SystemExit("테이블 생성을 확인하지 못했습니다.")


if __name__ == "__main__":
    main()
