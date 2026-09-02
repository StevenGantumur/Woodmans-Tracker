# Cart Corral Tracker

I worked as a cart pusher at Woodman's, and the job came down to one question you
answer badly all day: which corral do I walk to next? You guess, you walk, and half
the time somebody else already cleared it or a closer one filled up behind you.

This is the app I wanted. It tracks cart counts across 24 corrals, solves for the
shortest collection route, and predicts which corrals are about to fill up based on
the time and day.

# Features

* Live cart counts for 24 corrals (A–X), color coded by urgency
* Optimized collection route using a real TSP solver (Google OR-Tools)
* Graceful fallback to a greedy sort if the solver is unavailable, clearly labeled as degraded
* Cart count prediction by corral, hour, and day of week (LightGBM)
* Every update writes a snapshot, so the history the model trains on keeps growing
* Worker shift view (stub, not implemented yet)

# Tech Stack

Frontend: React 19, Vite, Tailwind CSS
Backend: Node.js, Express 5
Database: PostgreSQL
Optimizer: Python, Google OR-Tools
ML: Python, LightGBM, scikit-learn, pandas

Requires Node 18+, Python 3.10+, PostgreSQL 14+

# How It Fits Together

```
React frontend  ──HTTP──>  Express API  ──SQL──>  PostgreSQL
                                │
                                └──child process──>  Python (OR-Tools / LightGBM)
```

The Express API owns the database. Python does the two things Python is better at
(route solving and model training) and gets called as a subprocess with JSON over
stdin/stdout. It is not the fastest possible design, but it keeps each language
doing what it is good at without standing up a second service.

Three tables:

* `corrals` — current state, one row per corral, plus x/y coordinates for the optimizer
* `corral_snapshots` — append-only history, one row per update, what the model trains on
* `corral_predictions` — reserved for cached predictions, not used yet

# Setup

Clone the repo, then:

**1. Install dependencies**

```
npm install
pip install -r ml/requirements.txt
```

**2. Create the database**

```
createdb woodmans_carts
psql woodmans_carts -f database/migrations/001_create_corrals.sql
psql woodmans_carts -f database/migrations/002_create_snapshots.sql
psql woodmans_carts -f database/migrations/003_create_predictions.sql
```

**3. Configure credentials**

Copy `.env.example` to `.env` and fill in your Postgres details. Both the Node API
and the Python scripts read this same file.

**4. Seed history and train the model**

```
node scripts/generateData.js
cd ml && python trainModel.py
```

The seeder generates 90 days of synthetic snapshots ending today. Re-run it if the
data ages out of the model's 90 day training window.

**5. Run it**

```
npm run dev
```

Frontend on `http://localhost:5173`, API on `http://localhost:3001`.

# API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Liveness plus a real database check |
| GET | `/api/corrals` | Current cart count for every corral |
| POST | `/api/corrals` | Update one corral, writes a snapshot |
| GET | `/api/corrals/:id/history` | Recent snapshots for one corral |
| POST | `/api/optimize-route` | Optimized collection route |
| GET | `/api/optimize-route/preview` | Current optimizer configuration |
| GET | `/api/shifts` | Worker shifts (stub) |

Updating a corral:

```
curl -X POST http://localhost:3001/api/corrals \
  -H "Content-Type: application/json" \
  -d '{"corral_id": "C", "count": 30}'
```

Getting a route:

```
curl -X POST http://localhost:3001/api/optimize-route \
  -H "Content-Type: application/json" \
  -d '{"corrals": {"A": 6, "C": 30, "M": 18, "X": 22}}'

{"success":true,"optimizedRoute":["A","C","X","M","A"],
 "totalDistance":14.66,"method":"or-tools-tsp","corralsCovered":3}
```

Corrals below the threshold (5 carts by default) are skipped. The route always starts
and ends at the depot.

# The Route Optimizer

Collecting carts from a set of corrals and returning to the front of the store is a
travelling salesman problem. The corrals sit on an 8×3 grid and their coordinates live
in the `corrals` table, so the solver reads real positions rather than hardcoded ones.

`optimizer/optimizer.py` builds a Euclidean distance matrix and hands it to OR-Tools
using `PATH_CHEAPEST_ARC` for a first solution, then guided local search to improve it,
capped at 5 seconds.

If Python is missing or the solve fails, the API falls back to sorting corrals by cart
count. That fallback ignores distance entirely, so it marks its response `degraded:
true` and the UI shows a warning. An earlier version fell back silently, which meant
the optimizer could be broken for weeks without anyone noticing.

# The Prediction Model

LightGBM regression on `corral_snapshots`, aggregated into hourly averages per
corral / day / hour. Hour and day of week are encoded cyclically as sin/cos pairs so
the model knows hour 23 sits next to hour 0 rather than 23 units away from it.

Current run on 51,313 snapshots (4,032 aggregated examples):

```
Mean Absolute Error   0.68 carts
Root Mean Squared Error  1.18 carts
R² Score              0.983
```

**Worth being honest about:** that R² is not as impressive as it looks. The training
data is synthetic, generated by `scripts/generateData.js` from a known pattern plus
noise, and aggregating to hourly means averages most of that noise back out. The model
is largely recovering a function I wrote. It is a working end to end pipeline, not
evidence that cart counts are 98% predictable. Real numbers would need real data.

Top features by importance were corral identity, then day of week, then hour, which at
least matches intuition: which corral you are looking at matters more than when.

# Project Structure

```
├── backend/          Express API
│   ├── db.js         Shared Postgres pool
│   └── routes/       corrals, optimize, shifts
├── frontend/         React + Vite + Tailwind
│   └── src/Components/
├── database/         SQL migrations
├── ml/               LightGBM training and prediction
├── optimizer/        OR-Tools TSP solver
├── scripts/          Synthetic data generator
└── shared/           Corral whitelist used by both frontend and backend
```

# Current Limitations

Being upfront about what is not done:

* Cart counts are entered by hand. The plan was RFID sensors in each corral, which I
  do not have.
* The model is trained but not wired to the UI yet. `ml/predictCorral.py` works from
  the command line; there is no endpoint calling it.
* `/api/shifts` returns fixed sample data.
* No authentication. Anyone who can reach the API can update any corral.
* Training data is synthetic. See the honesty note above.

# Road Map

1. Expose predictions through the API and show them in the grid
2. Real shift scheduling instead of the stub
3. Weather integration, since rain visibly changes how fast corrals fill
4. Auth, so it could actually be deployed somewhere
5. Multi worker routing, splitting corrals between people on shift

By: Steven Gantumur
