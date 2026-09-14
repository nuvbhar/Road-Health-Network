# Pothole Detection System — Implementation Context

## Problem Framing

This is **not** a time-synced sensor-fusion problem (different cars pass the same spot at different real times). It's a **spatial confirmation problem**: detect a candidate bump independently on each car, then confirm it's a real pothole by checking whether multiple *different* cars register a similar signature at roughly the *same location*.

---

## Pipeline Overview

```
Raw sensor stream (per car)
   → Windowing + g-force normalization
   → Per-car event detection (candidate bump?)
   → Geotag + upload candidate events
   → Spatial clustering across cars (same location, different times)
   → Cross-car shape confirmation (same event signature?)
   → Confidence score → confirmed pothole
```

---

## Stage 1: Data Ingestion (per car)

- Inputs per car: accelerometer (x, y, z), GPS (lat, lon, speed), timestamp
- Chunked into 666ms windows → 20 g-force data points per window
- 40 windows aggregated per collection cycle (~26.6s of driving)

**Decision needed:** how much of this runs on-device (phone/car unit) vs. streamed raw to a backend. On-device filtering is strongly recommended — see Stage 2.

---

## Stage 2: Per-Car Event Detection (edge, no cross-car data needed yet)

Goal: flag "this window might be a pothole" using only this car's own data.

- Focus mainly on **z-axis (vertical)** g-force — potholes produce a sharp dip-then-spike or spike-then-dip; smooth driving/braking/cornering look different.
- Two viable approaches, pick based on time/data available:
  - **Threshold-based** (fast to build, interpretable, no training data needed): flag when the z-axis delta within a window exceeds some tuned threshold.
  - **Small trained classifier** (1D-CNN or lightweight ML model) trained on labeled bump vs. no-bump windows, if you can get/label sample data.
- Output per candidate event: `{car_id, lat, lon, speed, timestamp, g_force_window[20], local_confidence}`

**Recommendation:** start with threshold-based detection; it gets you most of the value quickly. Only add the trained classifier as a stretch goal if time allows.

---

## Stage 3: Upload Candidate Events (not raw streams)

- Only upload flagged candidate windows, not the full continuous stream — cuts bandwidth and backend load dramatically.
- Payload per event: car ID, GPS location, speed at time of event, timestamp, the 20-point g-force window, local confidence score.

---

## Stage 4: Spatial Clustering (backend)

- Cluster candidate events by **location**, ignoring time.
- **DBSCAN with haversine distance** is a good fit:
  - `epsilon` ≈ 5–10m (tune based on real-world GPS accuracy in your test environment)
  - `min_samples` = minimum number of independent cars needed before a cluster is even considered (e.g. 2–3)
- At scale, consider geohash bucketing before clustering to avoid comparing every event against every other event.

---

## Stage 5: Cross-Car Shape Confirmation (within each spatial cluster)

This is where correlation comes back in — it rules out cases where GPS error grouped two *unrelated* events together.

- **Normalize by speed first.** A fast car crosses a pothole in less time (sharper, narrower spike); a slow car shows a broader, gentler one. Resample each window by distance rather than fixed time before comparing, or correlation scores will look artificially low for the same physical pothole.
- Compare shapes using:
  - **Pearson correlation** — captures overall shape match, robust to scale differences.
  - **DTW (dynamic time warping)** — use if speed normalization alone doesn't fully align the shapes.
- Only events from clearly **different cars** should count toward confirmation — repeated passes by the same car/driver don't add independent evidence.

---

## Stage 6: Confidence Scoring & Output

Combine into a final score per location cluster:
- Number of independent confirming cars
- Average pairwise shape correlation within the cluster
- Recency (a pothole confirmed 6 months ago may have been fixed)

Output: confirmed pothole locations + confidence score, servable via API / map visualization.

---

## Tech Stack Suggestions

| Layer | Suggested tools |
|---|---|
| Signal processing / windowing | Python (numpy, scipy) or C++ on-device |
| Per-car event detection | Threshold logic, or PyTorch/TensorFlow 1D-CNN if training data exists |
| Spatial clustering | scikit-learn `DBSCAN` (haversine metric) |
| Shape similarity | `scipy.stats.pearsonr`, `fastdtw` |
| Backend / storage | FastAPI or Flask + PostgreSQL with PostGIS (or geohash-based bucketing if avoiding PostGIS setup) |
| Visualization | Simple map overlay (Leaflet/Mapbox) plotting confirmed clusters |

---

## Key Design Decisions to Lock Down Early

1. **Minimum confirming cars** — higher = fewer false positives, but slower to confirm new potholes.
2. **GPS clustering epsilon** — depends entirely on your test environment's real GPS accuracy; measure this first if possible.
3. **Speed-normalization method** — resample by distance vs. by time; pick one and be consistent.
4. **Edge vs. cloud split** — how much event detection happens on the car itself vs. sent raw to backend.
5. **False-positive sources to watch for** — speed bumps, railroad crossings, curbs, and hard braking can produce similar vertical-g signatures. May need extra features (event duration, correlation with braking/steering data, road-type context) to disambiguate later.

---

## Suggested Build Order

1. Get sample/simulated sensor data flowing through the windowing + g-force normalization pipeline.
2. Build the simple threshold-based per-car event detector.
3. Build GPS clustering + multi-car confirmation logic — **this is the core novel value of the project**, prioritize it.
4. Add speed-normalized shape correlation within clusters to reduce false positives.
5. (Stretch) Train a small classifier to replace/augment the threshold-based detector.
6. Build a basic map visualization of confirmed potholes for the demo.
