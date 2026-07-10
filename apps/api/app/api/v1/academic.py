"""Academic CRUD endpoints — /academic/* (admin-only)."""

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import RequireAdmin
from app.db.session import SessionDep
from app.schemas.academic import (
    AcademicYearCreate,
    AcademicYearRead,
    AcademicYearUpdate,
    DepartmentCreate,
    DepartmentRead,
    DepartmentUpdate,
    DirectionCreate,
    DirectionRead,
    DirectionUpdate,
    FacultyCreate,
    FacultyRead,
    FacultyUpdate,
    GroupCreate,
    GroupRead,
    GroupUpdate,
)
from app.schemas.common import Paginated
from app.services import academic as svc

router = APIRouter(prefix="/academic", tags=["academic"])


# ─── Faculty ──────────────────────────────────────────────
@router.get("/faculties", response_model=Paginated[FacultyRead])
async def list_faculties(
    db: SessionDep,
    _: RequireAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Paginated[FacultyRead]:
    offset = (page - 1) * page_size
    items, total = await svc.list_faculties(db, offset, page_size)
    return Paginated(
        items=[FacultyRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/faculties", response_model=FacultyRead, status_code=status.HTTP_201_CREATED)
async def create_faculty(data: FacultyCreate, db: SessionDep, _: RequireAdmin) -> FacultyRead:
    return FacultyRead.model_validate(await svc.create_faculty(db, data))


@router.patch("/faculties/{id_}", response_model=FacultyRead)
async def update_faculty(
    id_: UUID, data: FacultyUpdate, db: SessionDep, _: RequireAdmin
) -> FacultyRead:
    return FacultyRead.model_validate(await svc.update_faculty(db, id_, data))


@router.delete("/faculties/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_faculty(id_: UUID, db: SessionDep, _: RequireAdmin) -> None:
    await svc.delete_faculty(db, id_)


# ─── Direction ────────────────────────────────────────────
@router.get("/directions", response_model=Paginated[DirectionRead])
async def list_directions(
    db: SessionDep,
    _: RequireAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    faculty_id: UUID | None = None,
) -> Paginated[DirectionRead]:
    offset = (page - 1) * page_size
    items, total = await svc.list_directions(db, offset, page_size, faculty_id)
    return Paginated(
        items=[DirectionRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/directions", response_model=DirectionRead, status_code=status.HTTP_201_CREATED)
async def create_direction(data: DirectionCreate, db: SessionDep, _: RequireAdmin) -> DirectionRead:
    return DirectionRead.model_validate(await svc.create_direction(db, data))


@router.patch("/directions/{id_}", response_model=DirectionRead)
async def update_direction(
    id_: UUID, data: DirectionUpdate, db: SessionDep, _: RequireAdmin
) -> DirectionRead:
    return DirectionRead.model_validate(await svc.update_direction(db, id_, data))


@router.delete("/directions/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_direction(id_: UUID, db: SessionDep, _: RequireAdmin) -> None:
    await svc.delete_direction(db, id_)


# ─── Department (Kafedra) ─────────────────────────────────
@router.get("/departments", response_model=Paginated[DepartmentRead])
async def list_departments(
    db: SessionDep,
    _: RequireAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200),
    faculty_id: UUID | None = None,
) -> Paginated[DepartmentRead]:
    offset = (page - 1) * page_size
    items, total = await svc.list_departments(db, offset, page_size, faculty_id)
    return Paginated(
        items=[DepartmentRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/departments", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
async def create_department(
    data: DepartmentCreate, db: SessionDep, _: RequireAdmin
) -> DepartmentRead:
    return DepartmentRead.model_validate(await svc.create_department(db, data))


@router.patch("/departments/{id_}", response_model=DepartmentRead)
async def update_department(
    id_: UUID, data: DepartmentUpdate, db: SessionDep, _: RequireAdmin
) -> DepartmentRead:
    return DepartmentRead.model_validate(await svc.update_department(db, id_, data))


@router.delete("/departments/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(id_: UUID, db: SessionDep, _: RequireAdmin) -> None:
    await svc.delete_department(db, id_)


# ─── AcademicYear ─────────────────────────────────────────
@router.get("/academic-years", response_model=list[AcademicYearRead])
async def list_academic_years(db: SessionDep, _: RequireAdmin) -> list[AcademicYearRead]:
    items = await svc.list_academic_years(db)
    return [AcademicYearRead.model_validate(i) for i in items]


@router.post(
    "/academic-years",
    response_model=AcademicYearRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_academic_year(
    data: AcademicYearCreate, db: SessionDep, _: RequireAdmin
) -> AcademicYearRead:
    return AcademicYearRead.model_validate(await svc.create_academic_year(db, data))


@router.patch("/academic-years/{id_}", response_model=AcademicYearRead)
async def update_academic_year(
    id_: UUID, data: AcademicYearUpdate, db: SessionDep, _: RequireAdmin
) -> AcademicYearRead:
    return AcademicYearRead.model_validate(await svc.update_academic_year(db, id_, data))


@router.delete("/academic-years/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_academic_year(id_: UUID, db: SessionDep, _: RequireAdmin) -> None:
    await svc.delete_academic_year(db, id_)


# ─── Group ────────────────────────────────────────────────
@router.get("/groups", response_model=Paginated[GroupRead])
async def list_groups(
    db: SessionDep,
    _: RequireAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    direction_id: UUID | None = None,
    academic_year_id: UUID | None = None,
    course: int | None = Query(None, ge=1, le=5),
) -> Paginated[GroupRead]:
    offset = (page - 1) * page_size
    items, total = await svc.list_groups(
        db, offset, page_size, direction_id, academic_year_id, course
    )
    return Paginated(
        items=[GroupRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/groups", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
async def create_group(data: GroupCreate, db: SessionDep, _: RequireAdmin) -> GroupRead:
    return GroupRead.model_validate(await svc.create_group(db, data))


@router.patch("/groups/{id_}", response_model=GroupRead)
async def update_group(id_: UUID, data: GroupUpdate, db: SessionDep, _: RequireAdmin) -> GroupRead:
    return GroupRead.model_validate(await svc.update_group(db, id_, data))


@router.delete("/groups/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(id_: UUID, db: SessionDep, _: RequireAdmin) -> None:
    await svc.delete_group(db, id_)
