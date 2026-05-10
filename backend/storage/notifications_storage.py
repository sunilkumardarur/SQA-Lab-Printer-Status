import uuid
import yaml
from pathlib import Path
from filelock import FileLock
from datetime import datetime
from backend.config import config

_ROOT = Path(__file__).parent.parent.parent
_DATA_FILE = _ROOT / config["storage"]["notifications_file"]
_LOCK_FILE = _DATA_FILE.with_suffix(".lock")
_LOCK_TIMEOUT = config["storage"]["lock_timeout"]


def _read_raw() -> dict:
    if not _DATA_FILE.exists():
        return {"notifications": []}
    with open(_DATA_FILE, "r") as f:
        return yaml.safe_load(f) or {"notifications": []}


def _write_raw(data: dict) -> None:
    _DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(_DATA_FILE, "w") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)


def get_all_notifications() -> list[dict]:
    with FileLock(_LOCK_FILE, timeout=_LOCK_TIMEOUT):
        return _read_raw().get("notifications", [])


def get_pending_notifications() -> list[dict]:
    return [n for n in get_all_notifications() if n.get("status") == "pending"]


def add_notification(data: dict) -> dict:
    with FileLock(_LOCK_FILE, timeout=_LOCK_TIMEOUT):
        raw = _read_raw()
        notifs = raw.get("notifications", [])
        entry = {
            "id": str(uuid.uuid4()),
            "type": "delete_request",
            "printer_sl_no": data["printer_sl_no"],
            "printer_name": data["printer_name"],
            "printer_ip": data["printer_ip"],
            "requested_by": data["requested_by"],
            "requested_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "pending",
        }
        already = any(
            n["printer_sl_no"] == data["printer_sl_no"] and n["status"] == "pending"
            for n in notifs
        )
        if already:
            raise ValueError("pending_exists")
        notifs.append(entry)
        raw["notifications"] = notifs
        _write_raw(raw)
        return entry


def delete_notification(notif_id: str) -> bool:
    with FileLock(_LOCK_FILE, timeout=_LOCK_TIMEOUT):
        raw = _read_raw()
        notifs = raw.get("notifications", [])
        new_list = [n for n in notifs if n["id"] != notif_id]
        if len(new_list) == len(notifs):
            return False
        raw["notifications"] = new_list
        _write_raw(raw)
        return True


def get_notification(notif_id: str) -> dict | None:
    return next((n for n in get_all_notifications() if n["id"] == notif_id), None)


def delete_notifications_for_printer(sl_no: int) -> None:
    with FileLock(_LOCK_FILE, timeout=_LOCK_TIMEOUT):
        raw = _read_raw()
        notifs = raw.get("notifications", [])
        raw["notifications"] = [n for n in notifs if n.get("printer_sl_no") != sl_no]
        _write_raw(raw)


def clear_all_notifications() -> None:
    with FileLock(_LOCK_FILE, timeout=_LOCK_TIMEOUT):
        _write_raw({"notifications": []})
