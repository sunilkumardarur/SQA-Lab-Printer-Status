# SQA Lab Printer Status

A web dashboard for Brady Corporation's SQA lab to monitor Brady label printers — see live status, reserve printers for testing, and manage printer entries.

Built with **FastAPI** (Python backend) and **React 18 + Tailwind CSS** (frontend).

---

## Features & How to Use

### Viewing Printers
The main table shows all printers with the following columns:

| Column | Description |
|---|---|
| # | Serial number / row order |
| Model | Printer model name (e.g. i5100, BMP41) — fetched automatically |
| Serial | Printer serial number — fetched automatically |
| IP Address | The IP you entered when adding the printer |
| Location | Milwaukee, Plymouth, or Singapore |
| Label | Label stock currently loaded — fetched from printer |
| Ribbon | Ribbon currently loaded — fetched from printer |
| Status | Live printer status (see Status Reference below) — hover for full text |
| Availability | Available / In Use / Not Available |
| Reserved By | Name of the person who reserved the printer |
| Updated | When the status was last fetched |
| Actions | Refresh, Reserve/Release, Delete buttons |

---

### Adding a Printer
1. Click **Add Printer** in the header.
2. Enter the printer's **IP address** and select its **Location**.
3. Click Add — the printer is saved immediately and its name, serial, label, ribbon, and status are fetched in the background.

> Only IP address and location are required. All other fields are populated automatically by connecting to the printer.

---

### Refreshing Status
- **Single printer** — click the circular arrow (↻) icon on that printer's row.
- **All printers** — click **Refresh All** in the header. All printers are fetched in parallel.

Status is not auto-refreshed — you refresh manually when needed.

---

### Reserving a Printer
1. Click the **lock icon** on a printer row (only enabled when the printer is Available).
2. Enter your name and click Reserve.
3. Your name is saved in your browser so it pre-fills next time you reserve.

A printer cannot be reserved if it is Unreachable or already In Use.

---

### Releasing a Printer
1. Click the **unlock icon** on a reserved printer row.
2. Either:
   - Enter **your name** exactly as it appears in "Reserved By" — or —
   - Enter the **admin password** to release any printer regardless of who reserved it.

---

### Deleting a Printer
Click the **trash icon** on a printer row. A modal opens with two options:

**Tab 1 — Notify Navya**
- Enter your name and click Send Delete Request.
- A notification is sent to the admin (Navya). She will see it in the Notifications panel and action it.
- Only one pending delete request is allowed per printer at a time.

**Tab 2 — I'm Navya (Admin)**
- Enter the admin password to delete the printer immediately.
- Any pending delete notifications for that printer are automatically cleared.

---

### Notifications Panel (Admin — Navya)
- Click the **bell icon** in the header. A red badge shows the number of pending requests.
- The panel slides in from the right showing all pending delete requests.
- For each request, enter the admin password and click Resolve to delete the printer and clear the notification.

---

### Clear All (Admin)
- Click the red **Clear All** button in the header.
- Enter the admin password to wipe all printers and notifications — complete clean slate.
- Use this when resetting the lab or before a fresh deployment.

---

## Status Reference

| Status | Color | Meaning |
|---|---|---|
| Ready | Green | Printer is online and ready |
| Paused | Amber | Printer is paused |
| Label Out | Red | Label stock is empty |
| Ribbon Out | Red | Ribbon is empty |
| Head Open | Red | Print head is open |
| USB Unavailable | Blue | USB connection issue |
| Wiper Open | Blue | Wiper door is open |
| Unreachable | Red | Could not connect to printer (network issue or wrong IP) |
| Timeout | Red | Connection timed out |
| Error | Red | Generic error state |
| Pending | Gray | Status not yet fetched (just added) |

> When a printer becomes Unreachable, it is automatically marked **Not Available** and any active reservation is cleared.

---

## Availability States

| State | Meaning |
|---|---|
| Available | Free to reserve |
| In Use | Reserved by someone |
| Not Available | Printer is unreachable — cannot be reserved |

---

## Deployment Setup (Server)

### Prerequisites
- Python 3.11+
- pip
- A web server (nginx recommended) to serve the frontend `dist/` folder and proxy API requests

### 1. Install Python dependencies

```bash
python -m venv .venv
source .venv/bin/activate        # Linux/macOS
# .venv\Scripts\Activate.ps1    # Windows

pip install -r requirements.txt
```

### 2. Configure the app

Edit `config/config.yaml`:

```yaml
mock:
  enabled: false   # Must be false for real printers
```

> Do not change or share the `admin.password_hash` value in config.yaml. The hash is a bcrypt hash — the plaintext password is held only by the admin.

### 3. Start the backend

```bash
python main.py
```

Backend runs on port `8000` by default.

### 4. Serve the frontend

The `frontend/dist/` folder is the built frontend. Point nginx (or any static server) at it and proxy `/api` to the backend:

```nginx
server {
    listen 80;
    server_name sqaprinters.corp;

    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

---

## Configuration Reference (`config/config.yaml`)

| Key | Default | Description |
|---|---|---|
| `mock.enabled` | `true` | Set to `false` for real printers |
| `mock.simulate_delay` | `1.0` | Simulated delay in seconds (mock mode only) |
| `printer.connection_timeout` | `5` | Seconds before giving up on HTTP connect |
| `printer.read_timeout` | `10` | Seconds to wait for printer page |
| `printer.refresh_workers` | `10` | Max parallel threads for Refresh All |
| `app.host` | `0.0.0.0` | Backend bind address |
| `app.port` | `8000` | Backend port |

---

## Data Files

| File | Purpose |
|---|---|
| `data/printers.yaml` | All printer records — persists across restarts |
| `data/notifications.yaml` | Pending delete requests — persists across restarts |

Both files are human-readable YAML. They are thread-safe (file-locked) and survive server restarts. Ship them as empty lists (`printers: []` / `notifications: []`) for a clean deployment.

---

## Files to Ship

```
main.py
requirements.txt
config/config.yaml
backend/
data/printers.yaml        (empty)
data/notifications.yaml   (empty)
frontend/dist/            (built frontend — run npm run build first if needed)
```

Do **not** ship: `frontend/src/`, `frontend/node_modules/`, `.venv/`, `.claude/`, `.idea/`, `logs/`.
