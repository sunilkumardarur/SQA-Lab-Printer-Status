from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import printers, notifications
from backend.config import config
from backend.services.printer_service import startup_init


@asynccontextmanager
async def lifespan(app: FastAPI):
    startup_init()
    yield


app = FastAPI(
    title=config["app"]["title"],
    description="Monitor and manage Brady lab printers.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(printers.router)
app.include_router(notifications.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": config["app"]["title"]}
