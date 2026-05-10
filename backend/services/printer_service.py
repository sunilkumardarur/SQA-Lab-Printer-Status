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


def _fetch_html_real(ip: str) -> str:
    from playwright.sync_api import sync_playwright  # noqa: PLC0415
    url = f"http://{ip}/"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto(url, timeout=20000, wait_until="domcontentloaded")
            page.wait_for_selector('#printer-status p', timeout=15000)
            page.wait_for_selector('#printer-info', timeout=5000)
            return page.content()
        finally:
            browser.close()


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------
def _extract_field(soup: BeautifulSoup, prefix: str) -> str:
    """Return the value that follows `prefix` — matches real Brady div structure."""
    for div in soup.find_all("div"):
        text = div.get_text("\n", strip=True)
        for line in text.splitlines():
            line = line.strip()
            if line.startswith(prefix):
                return line[len(prefix):].strip()
    return ""


def _parse_html(html: str, printer: dict) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    # Printer Model + Serial
    # Real Brady UI: <div id="printer-info"><h1>i4311-PGi43112532102022</h1>
    # Mock/older UI:  <h1 id="printer-title">MODEL-SERIAL</h1>
    printer_info = soup.find(id="printer-info")
    title_el = (
        (printer_info.find("h1") if printer_info else None)
        or soup.find(id="printer-title")
        or soup.find("h1")
    )
    title_text = title_el.get_text(strip=True) if title_el else ""

    if "-" in title_text:
        model, serial = title_text.split("-", 1)
        model, serial = model.strip(), serial.strip()
    else:
        model  = title_text.strip() or printer.get("name", "Unknown")
        serial = printer.get("serial_number", "")

    # Status — real Brady UI: <div id="printer-status">...<p>Ready</p>...</div>
    status_el  = soup.find(id="printer-status")
    if status_el:
        # Prefer the first <p> or <span> inside, fall back to full text
        inner = status_el.find(["p", "span", "div"])
        status_raw = (inner.get_text(strip=True) if inner else status_el.get_text(separator=" ", strip=True))
    else:
        status_raw = "Unknown"
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
    """Fetch http://<ip>/ and parse. Mock uses httpx, real uses Playwright."""
    try:
        if _MOCK:
            url = f"http://{printer['ip_address']}/"
            with _make_client() as client:
                resp = client.get(url)
                resp.raise_for_status()
                html = resp.text
        else:
            html = _fetch_html_real(printer['ip_address'])
        return _parse_html(html, printer)
    except (httpx.ConnectError, httpx.ConnectTimeout, ConnectionRefusedError):
        return {
            "status":       "Unreachable",
            "css_class":    "status-error",
            "availability": "Not Available",
            "reserved_by":  "",
        }
    except Exception as e:
        err = str(e).lower()
        if any(x in err for x in ["timeout", "net::err", "connection", "unreachable"]):
            return {
                "status":       "Unreachable",
                "css_class":    "status-error",
                "availability": "Not Available",
                "reserved_by":  "",
            }
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
