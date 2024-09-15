# uvicorn app.main:app --reload --port 8080
from .config import get_allowed_origins
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.video_overview import video_overview

app = FastAPI()

# CORS setup
allowed_origins = get_allowed_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(video_overview.router)


@app.get("/")
def read_root():
    return {"message": "Hi world"}
