import uvicorn
from backend.config import config

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host=config["app"]["host"],
        port=config["app"]["port"],
        reload=config["app"]["debug"],
        log_level=config["app"]["log_level"].lower(),
    )
