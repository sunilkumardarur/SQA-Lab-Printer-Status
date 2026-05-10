"""
Printer scraping service.

Mock mode  (config mock.enabled = true):
  Uses a custom httpx transport that intercepts http://<ip>/ calls and
  returns Brady-style HTML generated locally — no real network, no ports,
  URL is always the natural http://<ip>/.

Real mode  (config mock.enabled = false):
  httpx fetches http://<ip>/ directly. Identical parsing code either way.
"""
import httpx
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
from backend.config import config
from backend.storage import storage

_TIMEOUT = config["printer"]["connection_timeout"]
_READ_TIMEOUT = config["printer"]["read_timeout"]
_WORKERS = config["printer"]["refresh_workers"]
_MOCK = config["mock"]["enabled"]

# Status text from Brady page -> (normalised label, css class)
_STATUS_MAP = {
    "ready":            ("Ready",           "status-ready"),
    "paused":           ("Paused",          "status-warning"),
    "label out":        ("Label Out",       "status-error"),
    "ribbon out":       ("Ribbon Out",      "status-error"),
    "head open":        ("Head Open",       "status-error"),
    "usb unavailable":  ("USB Unavailable", "status-mismatch"),
    "wiper open":       ("Wiper Open",      "status-mismatch"),
    "cover open":       ("Cover Open",      "status-error"),
    "paper jam":        ("Paper Jam",       "status-error"),
    "out of paper":     ("Out of Paper",    "status-error"),
    "out of ribbon":    ("Ribbon Out",      "status-error"),
}


# ---------------------------------------------------------------------------
# Mock transport — intercepts http://<ip>/ and returns local Brady HTML
# ---------------------------------------------------------------------------
class _BradyMockTransport(httpx.BaseTransport):
    def handle_request(self, request: httpx.Request) -> httpx.Response:
        from backend.services.mock_data import make_brady_html, is_unreachable
        ip = request.url.host
        if is_unreachable(ip):
            raise httpx.ConnectError(f"mock: {ip} is unreachable")
        html = make_brady_html(ip)
        return httpx.Response(200, text=html)


def _make_client() -> httpx.Client:
    if _MOCK:
        return httpx.Client(transport=_BradyMockTransport())
    return httpx.Client(timeout=(_TIMEOUT, _READ_TIMEOUT), follow_redirects=True)


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------
def _extract_field(soup: BeautifulSoup, prefix: str) -> str:
    """Return the value that follows `prefix` in any element's text."""
    for el in soup.find_all(True):
        if el.string and prefix in el.string:
            return el.string.replace(prefix, "").strip()
    for el in soup.find_all(["span", "div", "p", "td", "li"]):
        text = el.get_text(strip=True)
        if text.startswith(prefix):
            return text[len(prefix):].strip()
    return ""


def _parse_html(html: str, printer: dict) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    # Printer Model + Serial  (Brady: <h1 id="printer-title">i4311-PGi43112532102022</h1>)
    title_el = soup.find(id="printer-title") or soup.find("h1")
    title_text = title_el.get_text(strip=True) if title_el else ""

    if "-" in title_text:
        model, serial = title_text.split("-", 1)
        model, serial = model.strip(), serial.strip()
    else:
        model  = title_text.strip() or printer.get("name", "Unknown")
        serial = printer.get("serial_number", "")

    # Status  (Brady: <div id="printer-status"><p>Ready</p></div>)
    status_el  = soup.find(id="printer-status")
    status_raw = status_el.get_text(separator=" ", strip=True) if status_el else "Unknown"
    status_raw = "".join(c for c in status_raw if c.isascii()).strip()
    status, css_class = _STATUS_MAP.get(status_raw.lower(), (status_raw or "Unknown", "status-warning"))

    # Label / Ribbon  (Brady: <span>Label: B30-25-595-BLNKYL</span>)
    label  = _extract_field(soup, "Label:")
    ribbon = _extract_field(soup, "Ribbon:")

    updates = {
        "name":          model,
        "serial_number": serial,
        "label":         label,
        "ribbon":        ribbon,
        "status":        status,
        "css_class":     css_class,
    }

    # Unreachable resets reservation
    if status == "Unreachable":
        updates["availability"] = "Not Available"
        updates["reserved_by"]  = ""

    return updates


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def _fetch_printer(printer: dict) -> dict:
    """Fetch http://<ip>/ and parse. Works for mock and real."""
    url = f"http://{printer['ip_address']}/"
    try:
        with _make_client() as client:
            resp = client.get(url)
            resp.raise_for_status()
            return _parse_html(resp.text, printer)
    except (httpx.ConnectError, httpx.ConnectTimeout, ConnectionRefusedError):
        return {
            "status":       "Unreachable",
            "css_class":    "status-error",
            "availability": "Not Available",
            "reserved_by":  "",
        }
    except httpx.TimeoutException:
        return {"status": "Timeout", "css_class": "status-error"}
    except Exception:
        return {"status": "Error", "css_class": "status-error"}


def refresh_single(sl_no: int) -> dict | None:
    printer = storage.get_printer(sl_no)
    if not printer:
        return None
    updates = _fetch_printer(printer)
    return storage.update_printer(sl_no, updates)


def refresh_all() -> list[dict]:
    printers = storage.get_all_printers()

    def _refresh(p):
        updates = _fetch_printer(p)
        return storage.update_printer(p["sl_no"], updates)

    results = []
    with ThreadPoolExecutor(max_workers=_WORKERS) as ex:
        futures = {ex.submit(_refresh, p): p for p in printers}
        for fut in as_completed(futures):
            result = fut.result()
            if result:
                results.append(result)

    # Always return sorted by sl_no regardless of thread completion order
    return sorted(results, key=lambda p: p["sl_no"])


def startup_init():
    pass  # nothing to initialise — mock transport is stateless
