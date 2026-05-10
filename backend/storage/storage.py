import yaml
from pathlib import Path
from filelock import FileLock
from datetime import datetime
from backend.config import config

_ROOT = Path(__file__).parent.parent.parent
_DATA_FILE = _ROOT / config["storage"]["data_file"]
_LOCK_FILE = _DATA_FILE.with_suffix(".lock")
_LOCK_TIMEOUT = config["storage"]["lock_timeout"]

# Fields that a status-refresh is NOT allowed to overwrite
# (unless explicitly clearing due to Unreachable)
_PROTECTED_ON_REFRESH = {"availability", "reserved_by", "location"}


def _read_raw() -> dict:
    if not _DATA_FILE.exists():
        return {"printers": []}
    with open(_DATA_FILE, "r") as f:
        return yaml.safe_load(f) or {"printers": []}


def _write_raw(data: dict) -> None:
    _DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(_DATA_FILE, "w") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)


def get_all_printers() -> list[dict]:
    with FileLock(_LOCK_FILE, timeout=_LOCK_TIMEOUT):
        printers = _read_raw().get("printers", [])
        return sorted(printers, key=lambda p: p.get("sl_no", 0))


def get_printer(sl_no: int) -> dict | None:
    printers = get_all_printers()
    return next((p for p in printers if p["sl_no"] == sl_no), None)


def add_printer(printer: dict) -> dict:
    with FileLock(_LOCK_FILE, timeout=_LOCK_TIMEOUT):
        data = _read_raw()
        printers = data.get("printers", [])
        next_sl = max((p["sl_no"] for p in printers), default=0) + 1
        new_printer = {
            "sl_no": next_sl,
            "name": "",
            "serial_number": "",
            "ip_address": printer["ip_address"],
            "location": printer.get("location", ""),
            "label": "",
            "ribbon": "",
            "status": "Pending",
            "css_class": "status-pending",
            "availability": "Available",
            "reserved_by": "",
            "last_updated": "",
        }
        printers.append(new_printer)
        data["printers"] = printers
        _write_raw(data)
        return new_printer


def update_printer(sl_no: int, updates: dict, is_refresh: bool = True) -> dict | None:
    """
    Apply updates to a printer record.

    is_refresh=True (default for status refreshes):
        - Skips overwriting availability/reserved_by/location UNLESS the
          update explicitly includes them (e.g. Unreachable clears reservation).

    is_refresh=False (for reserve/release/manual edits):
        - Applies all updates unconditionally.
    """
    with FileLock(_LOCK_FILE, timeout=_LOCK_TIMEOUT):
        data = _read_raw()
        printers = data.get("printers", [])
        for i, p in enumerate(printers):
            if p["sl_no"] == sl_no:
                if is_refresh:
                    # Only allow protected fields if they are explicitly in updates
                    # (the Unreachable case passes them explicitly to reset)
                    safe_updates = {
                        k: v for k, v in updates.items()
                        if k not in _PROTECTED_ON_REFRESH or k in updates
                    }
                    printers[i].update(safe_updates)
                else:
                    printers[i].update(updates)
                printers[i]["last_updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                data["printers"] = printers
                _write_raw(data)
                return printers[i]
    return None


def delete_printer(sl_no: int) -> bool:
    with FileLock(_LOCK_FILE, timeout=_LOCK_TIMEOUT):
        data = _read_raw()
        printers = data.get("printers", [])
        new_list = [p for p in printers if p["sl_no"] != sl_no]
        if len(new_list) == len(printers):
            return False
        data["printers"] = new_list
        _write_raw(data)
        return True


def clear_all_printers() -> None:
    with FileLock(_LOCK_FILE, timeout=_LOCK_TIMEOUT):
        _write_raw({"printers": []})


def reserve_printer(sl_no: int, user: str) -> dict | None:
    return update_printer(sl_no, {"availability": "In Use", "reserved_by": user}, is_refresh=False)


def release_printer(sl_no: int) -> dict | None:
    return update_printer(sl_no, {"availability": "Available", "reserved_by": ""}, is_refresh=False)
