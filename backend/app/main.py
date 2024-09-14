# uvicorn app.main:app --reload --port 8080
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.video_overview import video_overview

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Hi world"}


app.include_router(video_overview.router)
