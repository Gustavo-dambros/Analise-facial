from fastapi import APIRouter


router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "ok"}


@router.get("/")
async def health_root():
    return {"status": "ok"}