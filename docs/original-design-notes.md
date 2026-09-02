# Original Design Notes

The first brainstorm for this project, kept for reference. Not everything here got
built — see the Road Map and Current Limitations in the main README for where things
actually stand.

## The Idea

An application containing the information an X cart worker needs to do the job
well, and to take some of the physical stress off.

## Planned Features

**FindBestCartPath** — a designated route for cart workers based on how many carts are
in each corral. *(Built, using OR-Tools. See `optimizer/`.)*

**AddAmountToCorral** — RFID sensors in each corral so carts customers return
automatically increase that corral's count. *(Not built. Counts are entered by hand.)*

**CartDestination** — route carts based on which side of the building needs them,
depending on how many carts are inside. *(Not built.)*

**Weather API Integration** — pull weather periodically from something like
OpenWeather. *(Not built. Still on the road map.)*

## Planned UI

* Weather view, so workers can see what is coming
* Clock
* Shifts — when each worker is on *(stub only)*
* RouteMapView — shows the route *(built as a text route, not a map)*
* Live cart corral status, color coded by intensity *(built)*
* Safety alerts — icy pavement, lightning risk, weather warnings *(not built)*
* Performance metrics — carts moved, time efficiency vs. average, weekly goal progress
  *(not built)*

## Original Stack Guess

Frontend React, backend Python for AI plus React for real time, OpenWeatherMap,
scikit-learn or TensorFlow, and Firebase / PostgreSQL / MongoDB for storage.

Ended up on Express for the API with Python called as a subprocess for the solver and
the model, PostgreSQL for storage, and LightGBM rather than TensorFlow since the
problem is small tabular regression.
