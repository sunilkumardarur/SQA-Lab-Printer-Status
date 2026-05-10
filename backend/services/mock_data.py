"""
Mock Brady printer HTML generator.

Called directly by the mock transport — no HTTP server, no ports.
Given an IP address, returns the same Brady-style HTML that a real
printer would serve at http://<ip>/
"""
import random

_STATUSES = [
    "Ready",          # idx 0
    "Paused",         # idx 1
    "Label Out",      # idx 2
    "Unreachable",    # idx 3  — transport raises ConnectError for these IPs
    "Ribbon Out",     # idx 4
    "Head Open",      # idx 5
    "USB Unavailable",# idx 6
    "Wiper Open",     # idx 7
]

_MODELS  = ["i4311", "i5100", "M611", "BMP71", "M710", "S3100", "BMP41"]
_SERIALS = [
    "PGi43112532102022", "PGi51001234567890", "M6110987654321",
    "BMP71123456789",    "M7109876543210",    "S31001234567890",
]
_LABELS  = [
    "B30-25-595-BLNKYL", "B30-25-423-BLNK", "M21-750-499",
    "B33-12-427",        "PTL-19-423",       "B30-25-595-WT-BK",
]
_RIBBONS = ["B30-R6000", "B30-R10000", "M21-R6000", "B30-R4200", "B30-R2000"]


def _status_index(ip: str) -> int:
    try:
        return sum(int(o) for o in ip.split(".")) % len(_STATUSES)
    except ValueError:
        return 0


def is_unreachable(ip: str) -> bool:
    return _STATUSES[_status_index(ip)] == "Unreachable"


def make_brady_html(ip: str) -> str:
    """Return Brady Device Status HTML for the given printer IP."""
    rng = random.Random(sum(ord(c) for c in ip))

    model      = rng.choice(_MODELS)
    serial     = rng.choice(_SERIALS)
    label      = rng.choice(_LABELS)
    ribbon     = rng.choice(_RIBBONS)
    label_pct  = rng.randint(10, 99)
    ribbon_pct = rng.randint(10, 99)

    status = _STATUSES[_status_index(ip)]

    title = f"{model}-{serial}"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Brady Printer</title>
</head>
<body>

<div id="printer-header">
  <h1 id="printer-title">{title}</h1>
  <p>Ethernet IP: {ip}</p>
</div>

<div id="printer-status-section">
  <h2>Printer Status and Errors</h2>
  <div id="printer-status">
    <p>{status}</p>
  </div>
</div>

<div id="device-status">
  <div class="supply-section">
    <h3>Label loaded</h3>
    <p>Supply Remaining {label_pct}%</p>
    <span>Label: {label}</span>
  </div>

  <div class="supply-section">
    <h3>Ribbon loaded</h3>
    <p>Supply Remaining {ribbon_pct}%</p>
    <span>Ribbon: {ribbon}</span>
  </div>
</div>

<div id="footer">
  <p>Brady Corporation</p>
</div>

</body>
</html>"""
