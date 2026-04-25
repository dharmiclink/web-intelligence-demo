from app.db.session import SessionLocal
from app.services.demo_data import seed_demo_data


if __name__ == "__main__":
    db = SessionLocal()
    try:
        result = seed_demo_data(db, count=72, reset=True)
        print(result)
    finally:
        db.close()
