# Aurora Demo → Backend Integration Guide

This repo is a **standalone front-end demo** of the Aurora clinical console. Out of the box it
generates **simulated** predictions so it runs with zero setup (GitHub Pages / any static host).

This guide is for wiring it to the **real FastAPI model backend** (the `adding_models` branch of
`Aurora-Backend`), which serves 5 models including the two new PyTorch ones (`end2end`, `model1cnn`).

You only touch **`app.js`** — everything is already stubbed and clearly marked.

---

## TL;DR — 3 steps

1. **Point it at your backend** — in `app.js` set:
   ```js
   const AURORA_API = { BASE_URL: 'https://YOUR-BACKEND-HOST', UPLOAD_PATH: '/prediction/upload', USER_ID: 'demo-user' };
   ```
   (or live from the browser console: `AURORA_API.BASE_URL = 'https://…'`)
2. **Implement image hosting** — fill in `hostImagesForBackend(dataUrls)` (see **§Images** — this is the one real
   piece of work). The backend fetches images **by URL**, so the selected slices must be uploaded somewhere public first.
3. **Enable CORS** on the backend for the demo's origin (see **§CORS**).

That's it. `runPrediction()` already calls the backend, adapts the response, and falls back to the
mock automatically if anything fails.

---

## The backend contract (verified against `Aurora-Backend@adding_models`)

**Endpoint:** `POST {BASE_URL}/prediction/upload` — `Content-Type: application/json`
(defined in `aurora/app/routers/prediction.py`, model `ImagesUploadPayload`). It is **JSON, not multipart.**

### Request body
```json
{
  "files": [
    { "name": "slice_1.png", "url": "https://your-bucket/scan/slice_1.png" },
    { "name": "slice_2.png", "url": "https://your-bucket/scan/slice_2.png" }
  ],
  "selected_model": "end2end",
  "selected_label": "GBM_MET_NON",
  "patient_id": "PT-1721880000000",
  "user_id": "demo-user"
}
```
- `selected_model` — the model **value** (backend lowercases it). One of: `sienna`, `neuroxai`, `inception`, `end2end`, `model1cnn`.
- `selected_label` — the category set (see table). The backend builds the lookup key as
  **`model_key = f"{selected_model.lower()}_{selected_label}"`** and finds it in `model_config.json`.
  An unknown key → **HTTP 500** (uncaught `ValueError`).

### Response body
```json
{
  "status": "success",
  "results": {
    "https://your-bucket/scan/slice_1.png": { "GBM": 0.83, "MET": 0.11, "NON": 0.06 },
    "https://your-bucket/scan/slice_2.png": { "GBM": 0.78, "MET": 0.15, "NON": 0.07 }
  }
}
```
- `results` is keyed by **the image URL you sent**, each value is `{ className: probability }` (rounded to 4 dp).
- **Class names & order vary per model** — the demo's adapter reads them straight from the response keys, so you
  don't hard-code them. (e.g. `sienna_MET_GBM_NON` → `{Non-Tumor, MET, GBM}` but `neuroxai_MET_GBM_NON` →
  `{No Tumor, GBM, MET}` — different spelling **and** order. This is why we don't assume the demo's label list.)
- **Sienna only** may add a `"gradcam_path"` key to a slice's object — the adapter ignores it.
- Per-slice failure → that URL maps to `{ "Error": "…" }`. Missing model file → every URL maps to `{ "Error": … }` (still HTTP 200).

---

## Model reference

| Display name    | `selected_model` | `selected_label`              | model_key (`model.lower()_label`) | Classes (backend order)   | Framework | Grad-CAM |
|-----------------|------------------|-------------------------------|-----------------------------------|---------------------------|-----------|----------|
| Sienna          | `Sienna`         | `MET_GBM_NON`                 | `sienna_MET_GBM_NON`              | Non-Tumor, MET, GBM       | keras     | ✅ yes   |
| Sienna          | `Sienna`         | `PITUITARY_MENINGIOMA_GLIOMA` | `sienna_PITUITARY_MENINGIOMA_GLIOMA` | Pituitary, Meningioma, Glioma | keras | ✅ yes |
| NeuroXAI        | `NeuroXAI`       | `MET_GBM_NON`                 | `neuroxai_MET_GBM_NON`           | No Tumor, GBM, MET        | keras     | ❌ no ¹  |
| Inception       | `Inception`      | `MET_GBM_NON`                 | `inception_MET_GBM_NON`          | Non-Tumor, MET, GBM       | keras     | ❌ no ¹  |
| **End-to-End CNN** | `end2end`     | `GBM_MET_NON`                 | `end2end_GBM_MET_NON`            | GBM, MET, NON             | **pytorch** (3-ch, 256px) | ❌ no |
| **Model 1 CNN**    | `model1cnn`   | `TUM_NON`                     | `model1cnn_TUM_NON`              | TUM, NON                  | **pytorch** (1-ch, 128px) | ❌ no |

> ¹ **Grad-CAM column** = whether the backend returns a `gradcam_path`. It generates one for **Sienna only**
> (`aurora/app/dao/prediction.py`: `if model_name_lower == 'sienna'`). NeuroXAI and Inception are Keras models,
> but the backend emits no heatmap for them; the two PyTorch models never do either.

The two **new** models are PyTorch (`.pt` / `.pth`) and produce **no Grad-CAM heatmap** — the demo already hides
the heatmap toggle for them.

---

## §Images — the one piece you must implement

The backend does `requests.get(url)` on every image, so it needs **publicly reachable URLs**. The demo currently
holds uploaded scans as in-browser `data:` URLs (from `FileReader`), which the backend cannot fetch.

Implement `hostImagesForBackend(dataUrls)` in `app.js` to upload the selected slices and return `[{name, url}]`
**in the same order**. Two common options:

**A. Reuse the real app's Supabase bucket** (matches production):
```js
async function hostImagesForBackend(dataUrls){
  const out = [];
  for (let i = 0; i < dataUrls.length; i++){
    const blob = await (await fetch(dataUrls[i])).blob();      // data: URL -> Blob
    const path = `demo/${Date.now()}_${i}.png`;
    const { error } = await supabase.storage.from('scans').upload(path, blob, { contentType: blob.type });
    if (error) throw error;
    const { data } = supabase.storage.from('scans').getPublicUrl(path);
    out.push({ name: `slice_${i+1}.png`, url: data.publicUrl });
  }
  return out;
}
```

**B. Any object store / your own upload endpoint** — same idea: POST each blob, collect the public URL, return `[{name,url}]`.

> If you'd rather send raw image bytes instead of URLs, that's a **backend change** — add a `multipart/form-data`
> variant of `/prediction/upload` that accepts `UploadFile`s. The current endpoint is URL-only.

---

## §CORS

The demo is served from a **different origin** than the backend (e.g. `https://<user>.github.io` or
`http://localhost:8138`). FastAPI must allow it. In `Aurora-Backend/aurora/app/main.py` the CORS `origins`
list must include your demo origin (or `"*"` for a quick test):
```python
origins = ["http://localhost:8138", "https://vaanyashivkumar.github.io"]
```

---

## Auth

As written, `/prediction/upload` has **no auth dependency** — no token required. If the deployed backend adds one,
put the header in `predictViaBackend()`:
```js
headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + TOKEN }
```

---

## Where things live in `app.js`

| Piece | What it does |
|-------|--------------|
| `AURORA_API` | config: `BASE_URL` (`''` = mock), `UPLOAD_PATH`, `USER_ID` |
| `hostImagesForBackend(dataUrls)` | **← you implement**: upload slices, return `[{name,url}]` |
| `predictViaBackend({modelValue,label,files,patientId})` | POSTs the request, adapts `{results:{url:{class:prob}}}` → `{classes, preds}` |
| `runPrediction()` | entry point (Run button). Backend path if `BASE_URL` set, else mock; **auto-falls back to mock on error** |
| `MODELS` / `LABEL_SETS` | model + category-set config (top of file) |

---

## Quick backend smoke test (no frontend needed)

```bash
curl -X POST "$BASE_URL/prediction/upload" \
  -H "Content-Type: application/json" \
  -d '{
    "files":[{"name":"s1.png","url":"https://PUBLIC/s1.png"}],
    "selected_model":"end2end",
    "selected_label":"GBM_MET_NON",
    "patient_id":"PT-test",
    "user_id":"demo-user"
  }'
```
Expect `{"status":"success","results":{"https://PUBLIC/s1.png":{"GBM":…,"MET":…,"NON":…}}}`.

---

## Integration checklist

- [ ] Backend deployed & `/prediction/upload` reachable (the two `.pt`/`.pth` model files present under `assets/models/`)
- [ ] `AURORA_API.BASE_URL` set in `app.js`
- [ ] `hostImagesForBackend()` implemented (returns public URLs in order)
- [ ] CORS allows the demo origin
- [ ] `curl` smoke test returns real probabilities
- [ ] Run a prediction in the UI → results donut/bars show real numbers (not the simulated fallback toast)
