# ArchivArt API Documentation

This document consolidates the current API surface for:

- AR media matching/playback APIs (Node app)
- Admin media APIs (Node app)
- OCR/OpenCV service APIs (Python service)
- OCR provider switching (Tesseract / Google Vision)

## Base URLs

- Node app (web + public API): `http://<host>:3000`
- Python service (OpenCV + OCR): `http://<host>:5001`

---

## 1) Public Mobile/API Endpoints (Node)

Mounted from `src/routes/api.js` under `/api`.

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/social-login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/check-username`
- `GET /api/auth/profile` (JWT required)
- `PUT /api/auth/profile` (JWT required)

### AR Matching + Media

- `POST /api/media/match`  
  Upload field: `image` (multipart/form-data)  
  Uses OpenCV descriptor matching against media scanning images.

- `GET /api/media`  
  Returns paginated active media for mobile playback.

- `GET /api/media/:id`  
  Returns one media item.

#### Example: match request

```bash
curl -X POST "http://localhost:3000/api/media/match" \
  -F "image=@/path/to/scanning-image.jpg"
```

---

## 2) Admin Media Endpoints (Node)

Mounted from `src/routes/media.js` under `/admin/media`.

These require admin web session and RBAC permissions.

- `GET /admin/media` (list page)
- `GET /admin/media/data` (AJAX data)
- `GET /admin/media/upload` (upload page)
- `POST /admin/media/upload` (multipart upload)
- `GET /admin/media/view/:id`
- `GET /admin/media/edit/:id`
- `GET /admin/media/:id`
- `PUT /admin/media/:id/text`
- `PUT /admin/media/:id`
- `PATCH /admin/media/:id/toggle`
- `DELETE /admin/media/:id`

### Upload payload fields

- `title` (required)
- `description` (optional)
- `media_type` (`video` or `audio`, and image in some flows)
- `media_file` (required)
- `scanning_image` (required)

Upload flow does:

1. Duplicate checks (hash + perceptual + OpenCV descriptor checks)
2. S3 upload
3. Optional OCR extraction (`OCR_ON_UPLOAD=true`)
4. Store OCR result in `media_ocr_results` (latest returned in API/view payloads)

---

## 3) Python Service APIs (OpenCV + OCR)

Implemented in `python-service/app.py`.

### Health / OpenCV

- `GET /health`
- `GET /metrics`
- `GET /info`
- `POST /extract` (feature extraction)
- `POST /match` (descriptor match)
- `POST /compare` (query image vs stored descriptors)

### OCR (Tesseract service endpoints)

- `POST /ocr/extract` (JSON with `image_path`)
- `POST /ocr/upload-extract` (multipart `image`)
- `POST /ocr/extract-with-boxes`
- `POST /ocr/upload-extract-with-boxes`
- `POST /ocr/extract-auto`
- `POST /ocr/upload-extract-auto`
- `GET /ocr/languages`
- `GET /ocr/info`

#### Example: OCR upload request

```bash
curl -X POST "http://localhost:5001/ocr/upload-extract" \
  -F "image=@/path/to/image.jpg" \
  -F "language=eng" \
  -F "preprocess=true"
```

---

## 4) OCR Provider Switching (Node)

Provider orchestration is in `src/services/ocrProviderService.js`.

### Environment variables

- `OCR_ON_UPLOAD=true|false`
- `OCR_PROVIDER=tesseract|google`
- `OCR_FALLBACK_PROVIDER=tesseract|google|` (empty disables fallback)
- `OCR_DEFAULT_LANGUAGE=eng`
- `OPENCV_SERVICE_URL=http://localhost:5001` (used by Tesseract/OpenCV service clients)
- `GOOGLE_VISION_API_KEY=...` (required for Google provider)
- `GOOGLE_OCR_TIMEOUT_MS=30000`

### Behavior

1. Active provider runs first (`OCR_PROVIDER`)
2. If it fails and fallback is configured, fallback runs
3. OCR is best-effort: media upload does not fail solely due to OCR failure

---

## 5) OCR Data Model

OCR is stored separately from `media` table in:

- `media_ocr_results`

Core columns:

- `media_id` (FK -> `media.id`)
- `provider` (`tesseract`, `google`, or migration `legacy`)
- `extracted_text`
- `confidence`
- `language`
- `status` (`success` / `failed`)
- `error_message`
- `processed_at`

Latest OCR result per media is attached by controller responses/views.

---

## 6) Schema Migrations for OCR

- `database/create_media_ocr_results_table.sql`  
  Creates OCR table and optionally backfills legacy OCR data.

- `database/drop_legacy_ocr_columns_from_media.sql`  
  Removes old OCR columns from `media`.

Legacy compatibility migration (old approach):

- `database/add_ocr_columns_to_media.sql` (not needed in new architecture)

---

## 7) Notes

- Google Vision OCR requires billing enabled on the linked GCP project.
- If Python OCR/OpenCV service is down, Tesseract provider calls will fail unless fallback provider succeeds.
- Current route `GET /api/media/:id` has validation middleware that checks body field `id`; recommended to switch to `param('id')` for strict correctness.

