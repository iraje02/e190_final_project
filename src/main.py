from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse

app = FastAPI()

# Folder that holds the HTML, CSS and JavaScript for the page.
WEB_DIR = Path(__file__).parent / "web"


@app.get("/")
def home():
    return FileResponse(WEB_DIR / "index.html")


@app.get("/health")
def health():
    return {"ok": True}
