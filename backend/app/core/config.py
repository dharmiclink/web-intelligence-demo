from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = BASE_DIR / "data"
ASSETS_DIR = DATA_DIR / "assets"
SCREENSHOT_DIR = ASSETS_DIR / "screenshots"
DATABASE_URL = f"sqlite:///{DATA_DIR / 'demo.db'}"

