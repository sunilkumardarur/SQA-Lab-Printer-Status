import bcrypt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.config import config
from backend.storage import notifications_storage, storage

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

_HASH = config["admin"]["password_hash"].encode()


def _verify_password(password: str) -> bool:
    return bcrypt.checkpw(password.encode(), _HASH)


class CreateNotificationRequest(BaseModel):
    printer_sl_no: int
    printer_name: str
    printer_ip: str
    requested_by: str


class MarkDoneRequest(BaseModel):
    password: str


@router.get("/")
def list_notifications():
    return notifications_storage.get_all_notifications()


@router.post("/")
def create_notification(body: CreateNotificationRequest):
    if not body.requested_by.strip():
        raise HTTPException(status_code=400, detail="Your name is required.")
    printer = storage.get_printer(body.printer_sl_no)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found.")
    try:
        return notifications_storage.add_notification(body.model_dump())
    except ValueError:
        raise HTTPException(status_code=409, detail="A pending delete request already exists for this printer.")


@router.post("/{notif_id}/done")
def mark_done(notif_id: str, body: MarkDoneRequest):
    if not _verify_password(body.password):
        raise HTTPException(status_code=401, detail="Incorrect password.")

    notif = notifications_storage.get_notification(notif_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    deleted_printer = storage.delete_printer(notif["printer_sl_no"])
    notifications_storage.delete_notification(notif_id)

    return {"message": "Printer deleted and notification resolved.", "printer_deleted": deleted_printer}
