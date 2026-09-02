# CartDaddy

I worked as a cart pusher at X, and the job came down to one question you
answer badly all day: which corral do I walk to next? You guess, you walk, and half
the time somebody else already cleared it or a closer one filled up behind you.

This is the app I wanted. It tracks cart counts across the real lot, decides whether
the urgent job right now is clearing the lot or restocking the entrance, solves the
shortest route for that job, and predicts which corrals are about to fill up.

# Features

* Live map of the actual store lot, drawn to measured dimensions
* Picks the job for you: restock the storefront, or sweep the lot
* Shortest route for that job using a real TSP solver (Google OR-Tools), in feet
* Falls back to a greedy sort if the solver is unavailable, clearly labeled as degraded
* Cart count prediction by corral, hour, and day of week (LightGBM)
* Tracked count of carts inside the building
* Analytics view: peak hours, day of week patterns, busiest corrals
* Current weather, translated into its expected effect on cart flow
* A Simulate button that randomises the lot to a plausible state and re-plans
* Every update writes a snapshot, so the history the model trains on keeps growing
* JWT auth on writes; reads stay open so the app still demos without an account

# Tech Stack

Frontend: React 19, Vite, Tailwind CSS
Backend: Node.js, Express 5
Database: PostgreSQL
Optimizer: Python, Google OR-Tools
ML: Python, LightGBM, scikit-learn, pandas
Auth: JWT, bcrypt

Requires Node 18+, Python 3.10+, PostgreSQL 14+

# The Lot

The layout is the real one, measured on site rather than invented. 24 corrals in two
kinds:

* **21 return corrals** out in the parking lot, where shoppers leave carts.
  7 columns 130 ft apart, 3 rows 50 ft apart.
* **3 supply corrals** at the storefront, where shoppers take carts: the Cart
  Tunnel (V) in the center, flanked by Store Lot 1 (X) and Store Lot 2 (W), each
  50 ft in front of the nearest lot corral.

Because coordinates are in feet, route distances come back in a unit that means
something to whoever has to walk it.

The important consequence is that **urgency runs opposite between the two types**.
A return corral is a problem when it is full. A supply corral is a problem when it
is empty. One shared threshold would mark a well stocked entrance as an emergency,
so the two are scored separately everywhere: in the API, in the map colors, and in
the routing.

All of it lives in `shared/layout.json`, which both the map and the optimizer read.
Moving a corral is a one line edit and the picture and the math stay in agreement.
They used to disagree, because coordinates were duplicated in the route file.

# How It Fits Together

```
React frontend  --HTTP-->  Express API  --SQL-->  PostgreSQL
                                |
                                +--child process-->  Python (OR-Tools / LightGBM)
```

The Express API owns the database. Python does the two things Python is better at,
route solving and model training, and gets called as a subprocess with JSON over
stdin/stdout. Not the fastest possible design, but it keeps each language doing what
it is good at without standing up a second service.

Tables:

* `corrals` - current state, one row per corral, with coordinates and type
* `corral_snapshots` - append-only history, one row per update, what the model trains on
* `store_state` - single row, carts inside the building and the fleet size
* `users` - worker accounts, bcrypt hashes only
* `corral_predictions` - reserved for cached predictions, not used yet

# Setup

**1. Install dependencies**

```
npm install
pip install -r ml/requirements.txt
```

**2. Create the database**

```
createdb cartdaddy
psql cartdaddy -f database/migrations/001_create_corrals.sql
psql cartdaddy -f database/migrations/002_create_snapshots.sql
psql cartdaddy -f database/migrations/003_create_predictions.sql
psql cartdaddy -f database/migrations/004_create_users.sql
psql cartdaddy -f database/migrations/005_layout_and_store_state.sql
```

**3. Configure credentials**

Copy `.env.example` to `.env` and fill it in. Both the Node API and the Python
scripts read this same file. Generate the JWT secret with:

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**4. Apply the layout and seed history**

```
node scripts/syncLayout.js
node scripts/generateData.js
cd ml && python trainModel.py
```

`syncLayout.js` pushes `shared/layout.json` into the database. The seeder generates
90 days of synthetic snapshots ending today; re-run it if the data ages out of the
model's 90 day training window.

**5. Create a worker account**

```
node scripts/createUser.js <username> <password> manager
```

**6. Run it**

```
npm run dev
```

Frontend on `http://localhost:5173`, API on `http://localhost:3001`.

# API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | - | Liveness plus a real database check |
| POST | `/api/auth/login` | - | Exchange credentials for a token |
| GET | `/api/auth/me` | token | Confirm a token is still valid |
| GET | `/api/corrals` | - | Lot state, counts, and building totals |
| POST | `/api/corrals` | token | Update one corral, writes a snapshot |
| GET | `/api/corrals/:id/history` | - | Recent snapshots for one corral |
| GET | `/api/building` | - | Carts inside the store |
| POST | `/api/building` | token | Update the building count |
| GET | `/api/optimize-route` | - | Next job and its route (`?depot=` to pick a bay) |
| GET | `/api/optimize-route/preview` | - | Current optimizer configuration |
| GET | `/api/analytics` | - | Aggregated history over N days |
| GET | `/api/weather` | - | Current conditions and cart impact |
| POST | `/api/simulate` | - | Randomise the lot (demo, flag-gated) |
| GET | `/api/shifts` | - | Worker shifts (stub) |

Asking what to do next:

```
curl http://localhost:3001/api/optimize-route

{"success":true,"job":"restock","reason":"W is at 6/40 carts",
 "optimizedRoute":["W","P","N","M","J","W"],"totalDistance":597.84,
 "corralsCovered":4,"cartsMoved":34,"method":"or-tools-tsp","units":"feet"}
```

Updating a corral:

```
curl -X POST http://localhost:3001/api/corrals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"corral_id": "C", "count": 30}'
```

# Choosing the Job

Rather than always sweeping the lot, the API decides what is actually urgent.

Restocking wins whenever a storefront corral falls below its low water mark, because
a shopper who cannot find a cart is a problem right now, while a full lot corral only
costs a longer trip later. A restock run takes the **nearest** stocked corrals until
the worker is loaded, since the point is refilling the entrance fast, not being
thorough.

Otherwise it plans a collection sweep across every lot corral above the threshold,
ending at whichever storefront corral is closest to the work.

A worker who already knows where they want to drop off can override that with
`?depot=X`, `?depot=V`, or `?depot=W`, which plans a delivery run to that bay
from the nearest stocked corrals regardless of what the automatic rule would have
picked. The UI exposes it as Auto / Store Lot 1 / Cart Tunnel / Store Lot 2.

Restock thresholds are per corral rather than one global fraction, because a 400
cart reservoir and a 100 cart bay at the door do not become urgent at the same
percentage. They are declared as `lowWater` in the layout file.

Either way the chosen stops go to `optimizer/optimizer.py`, which builds a Euclidean
distance matrix and hands it to OR-Tools using `PATH_CHEAPEST_ARC` for a first
solution, then guided local search to improve it, capped at 5 seconds.

If Python is missing or the solve fails, the API falls back to ordering by cart count.
That fallback ignores distance entirely, so it marks its response `degraded: true`
and the UI shows a warning. An earlier version fell back silently, which meant the
optimizer could be broken indefinitely without anyone noticing. It was, in fact,
broken the whole time: the code spawned `python3`, which does not exist on Windows,
so every request quietly used the worse algorithm and still reported success.

# The Prediction Model

LightGBM regression on `corral_snapshots`, aggregated into hourly averages per
corral, day, and hour. Hour and day of week are encoded cyclically as sin/cos pairs
so the model knows hour 23 sits next to hour 0 rather than 23 units away from it.

Current run on 51,313 snapshots (4,032 aggregated examples):

```
Mean Absolute Error      0.68 carts
Root Mean Squared Error  1.18 carts
R2 Score                 0.983
```

**Worth being honest about:** that R2 is not as impressive as it looks. The training
data is synthetic, generated by `scripts/generateData.js` from a known pattern plus
noise, and aggregating to hourly means averages most of that noise back out. The
model is largely recovering a function I wrote. It is a working end to end pipeline,
not evidence that cart counts are 98% predictable. Real numbers would need real data.

Top features by importance were corral identity, then day of week, then hour, which
at least matches intuition: which corral you are looking at matters more than when.

# Project Structure

```
backend/          Express API
  db.js           Shared Postgres pool
  middleware/     JWT verification
  routes/         auth, corrals, building, optimize, shifts
frontend/         React + Vite + Tailwind
  src/Components/ LotMap, CorralDetail, forms
database/         SQL migrations
ml/               LightGBM training and prediction
optimizer/        OR-Tools TSP solver
scripts/          Data generator, layout sync, user creation
shared/           Corral whitelist and lot layout
docs/             Original design notes
```

# Analytics

A second view charts the snapshot history the database has been accumulating:
average carts by hour, by day of week, and a ranking of the busiest corrals, over
a 7, 30, or 90 day window. One endpoint returns all of it, since the four
aggregates are always rendered together.

The charts are hand drawn SVG rather than a charting dependency. Series colors
were checked with a palette validator against the dark surface instead of picked
by eye, single series charts carry no legend, only the peak hour is labelled
directly, and a table view exposes the exact numbers.

Weather is proxied through the API so the OpenWeather key stays server side and
one cached call serves every client. Without a key the panel shows a setup hint
rather than breaking; if the service is unreachable it serves the last good
reading marked stale. Conditions are translated into an expected effect on cart
flow, since rain and cold are what actually change how fast corrals fill.

# Trying It Out

The **Simulate** button randomises all 24 corrals to a plausible state and
immediately re-plans against it, so the map, the counts, and the routing decision
all move together in one click. It is the fastest way to see the two job types:
run it a few times and it will swing between a collection sweep and a restock,
depending on where the carts land.

Carts are weighted heavily toward the rows nearest the doors, with an occasional
spike on one corral, so a simulated lot has a handful of corrals clearly worth
walking to rather than 21 sitting at the same average. A typical sweep comes out
around 200 to 240 carts across 14 to 18 corrals.

Every count stays consistent with a fixed fleet of 600 carts. The Cart Tunnel is
treated as the reservoir and takes whatever the rest of the store is not holding,
so the books always balance and the "unaccounted" tile stays at zero.

Simulation is a write, so it sits behind `ALLOW_SIMULATE`. Set it to `false` to
turn the button off for a real deployment.

# Current Limitations

Being upfront about what is not done:

* Cart counts are entered by hand. The plan was RFID sensors in each corral, which I
  do not have. `POST /api/corrals` is the seam a sensor would use.
* The model is trained but not wired to the UI. `ml/predictCorral.py` works from the
  command line; there is no endpoint calling it.
* `/api/shifts` returns fixed sample data.
* Training data is synthetic. See the honesty note above.
* One worker at a time. Splitting corrals between people on shift is not modeled.

# Road Map

1. Expose predictions through the API and show them on the map
2. Predicted vs actual on the analytics view
3. Real shift scheduling instead of the stub
4. Sensor ingestion, with per device keys and smoothing over a rolling window
5. Weather integration, since rain visibly changes how fast corrals fill
6. Multi worker routing

By: Steven Gantumur
