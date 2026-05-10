import ipaddress
import bcrypt
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, field_validator
from backend.storage import storage, notifications_storage
from backend.services import printer_service
from backend.config import config

router = APIRouter(prefix="/api/printers", tags=["printers"])

_HASH = config["admin"]["password_hash"].encode()
_LOCATIONS = ["Milwaukee", "Plymouth", "Singapore"]


def _verify_password(password: str) -> bool:
    return bcrypt.checkpw(password.encode(), _HASH)


class AddPrinterRequest(BaseModel):
    ip_address: str
    location: str = ""

    @field_validator("ip_address")
    @classmethod
    def validate_ip(cls, v):
        try:
            ipaddress.IPv4Address(v)
        except ValueError:
            raise ValueError(f"Invalid IPv4 address: {v}")
        return v

    @field_validator("location")
    @classmethod
    def validate_location(cls, v):
        if v and v not in _LOCATIONS:
            raise ValueError(f"Location must be one of: {', '.join(_LOCATIONS)}")
        return v


class ReserveRequest(BaseModel):
    user: str


class ReleaseRequest(BaseModel):
    user: str = ""       # name of person releasing (must match reserved_by)
    password: str = ""   # OR admin password


class DeleteWithPasswordRequest(BaseModel):
    password: str


@router.get("/")
def list_printers():
    return storage.get_all_printers()


@router.post("/")
def add_printer(body: AddPrinterRequest, background_tasks: BackgroundTasks):
    existing = storage.get_all_printers()
    if any(p["ip_address"] == body.ip_address for p in existing):
        raise HTTPException(status_code=409, detail="A printer with this IP already exists.")
    new_printer = storage.add_printer(body.model_dump())
    background_tasks.add_task(printer_service.refresh_single, new_printer["sl_no"])
    return new_printer


@router.delete("/{sl_no}")
def remove_printer(sl_no: int):
    deleted = storage.delete_printer(sl_no)
    if not deleted:
        raise HTTPException(status_code=404, detail="Printer not found.")
    return {"message": f"Printer {sl_no} removed."}


@router.post("/{sl_no}/refresh")
def refresh_printer(sl_no: int):
    result = printer_service.refresh_single(sl_no)
    if not result:
        raise HTTPException(status_code=404, detail="Printer not found.")
    return result


@router.post("/refresh-all")
def refresh_all_printers():
    return printer_service.refresh_all()


@router.post("/clear-all")
def clear_all_printers(body: DeleteWithPasswordRequest):
    if not _verify_password(body.password):
        raise HTTPException(status_code=401, detail="Incorrect password.")
    storage.clear_all_printers()
    notifications_storage.clear_all_notifications()
    return {"message": "All printers cleared."}


@router.post("/{sl_no}/reserve")
def reserve_printer(sl_no: int, body: ReserveRequest):
    if not body.user.strip():
        raise HTTPException(status_code=400, detail="Your name is required to reserve.")
    printer = storage.get_printer(sl_no)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found.")
    if printer.get("availability") == "In Use":
        raise HTTPException(status_code=409, detail=f"Already reserved by {printer['reserved_by']}.")
    result = storage.reserve_printer(sl_no, body.user.strip())
    return result


@router.post("/{sl_no}/release")
def release_printer(sl_no: int, body: ReleaseRequest):
    printer = storage.get_printer(sl_no)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found.")

    reserved_by = printer.get("reserved_by", "")

    # Admin password path
    if body.password:
        if _verify_password(body.password):
            return storage.release_printer(sl_no)
        raise HTTPException(status_code=401, detail="Incorrect password.")

    # Name match path
    if body.user and reserved_by and body.user.strip().lower() == reserved_by.strip().lower():
        return storage.release_printer(sl_no)

    raise HTTPException(
        status_code=403,
        detail=f"Only '{reserved_by}' or an admin can release this printer."
    )


@router.post("/{sl_no}/delete-with-password")
def delete_with_password(sl_no: int, body: DeleteWithPasswordRequest):
    if not _verify_password(body.password):
        raise HTTPException(status_code=401, detail="Incorrect password.")
    deleted = storage.delete_printer(sl_no)
    if not deleted:
        raise HTTPException(status_code=404, detail="Printer not found.")
    notifications_storage.delete_notifications_for_printer(sl_no)
    return {"message": f"Printer {sl_no} deleted."}
