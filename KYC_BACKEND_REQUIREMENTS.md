# KYC — What Exists vs. What's Required

## What already exists (as of V4.2)
- `User.kycStatus` enum field (`not_started` / `pending` / `verified` / `rejected`), default `not_started`.
- Admin can filter/search users by `kycStatus` (`AdminController`, `AdminUsers.tsx`).
- Admin user-detail drawer shows the status (read-only), with an honest note that no
  verification flow is built.
- **Newly added in V4.2**: `kycStatus` is now returned to the customer themselves via
  `GET /api/auth/me` (previously it was admin-only). This is exposing an existing field,
  not a new feature.
- **Newly added in V4.2**: `src/pages/KYCPage.tsx` — a complete, honest preview of the
  verification UI (profile photo, personal details, address, next of kin, BVN/NIN). Every
  field is either read-only (name/email/phone, pulled from the real account) or disabled,
  and the submit button is disabled with a visible explanation. Nothing on this page calls
  an API or persists data — it's UI scaffolding only, so wiring it up later is a backend +
  a few lines of frontend work, not a redesign.

## What does NOT exist and would need to be built for real KYC

### 1. Data model
A new `KYCSubmission` collection (or extend `User` directly — a separate collection is
cleaner since it lets you keep submission history across rejections):
```
KYCSubmission {
  userId: ObjectId (ref User, indexed)
  fullName, dob, gender, phone, address, state, lga, occupation: String
  nextOfKin: { name, phone, relationship }
  bvn, nin: String (encrypted at rest — see Security below)
  profilePhotoUrl, idDocumentUrl: String
  status: 'pending' | 'verified' | 'rejected'
  rejectionReason: String
  reviewedBy: ObjectId (ref User/admin)
  reviewedAt: Date
  createdAt, updatedAt: Date
}
```

### 2. File upload service
There is currently **no upload service anywhere in this backend** (no multer, no
Cloudinary/S3 config) — confirmed by grepping the codebase. Profile photo and any ID
document image need one of:
- Cloudinary (already used elsewhere in the SESCO project family — e.g. Mercy Hub,
  Emunahh — so this would be the natural choice for consistency), or
- AWS S3 / a signed-upload flow, or
- `multer` + local disk if this ever moves off a serverless host (not recommended on
  Vercel — ephemeral filesystem).

### 3. BVN / NIN verification provider
Real BVN/NIN verification requires a licensed identity-verification API — this is not
something to self-build. Common Nigerian-market options: Youverify, Smile Identity,
Prembly (formerly QoreID), Dojah, or Paystack Identity. Needs:
- API keys in environment config
- A thin `KycVerificationProvider` service (mirroring the existing
  `ProviderOrchestrator` pattern already used for VTU providers) so the provider can be
  swapped without touching controllers.
- BVN/NIN must be encrypted at rest (see Security) and never logged.

### 4. API endpoints
- `POST /api/kyc/submit` — customer submits/resubmits; sets status to `pending`.
- `GET /api/kyc/me` — customer fetches their own submission + status.
- `GET /api/admin/kyc` — admin list/filter of submissions (mirrors existing
  `AdminController.getUsers` filter pattern).
- `GET /api/admin/kyc/:id` — admin detail view.
- `PATCH /api/admin/kyc/:id/review` — admin approves/rejects with a reason; updates
  `User.kycStatus` to match.
- All admin actions should go through `AuditLogService` (already exists, already used
  for every other admin action in this codebase — add `'kyc'` to `targetType`).

### 5. Security
- BVN/NIN are sensitive PII — encrypt at rest (e.g. `crypto` AES-256-GCM with a key from
  env, not stored alongside the ciphertext), never return them un-masked in any GET
  response (mask to last 4 digits, same pattern as the existing `password` `toJSON`
  strip on `User`).
- Rate-limit `POST /api/kyc/submit` (this app already uses `express-rate-limit`
  elsewhere — reuse the same middleware).
- File uploads need type/size validation before they ever reach storage.

### 6. Notifications
Reuse the existing `EmailService` (already has `sendSystemAnnouncement` wired for
similar status-change emails in the Support module) to notify the customer when their
KYC status changes to `verified` or `rejected`.

## Suggested order of work
1. `KYCSubmission` model + `POST /api/kyc/submit` + `GET /api/kyc/me` (no file upload yet
   — text fields only, so this can ship first and unblock the frontend).
2. Wire `KYCPage.tsx` to the two endpoints above (straightforward — the UI is already
   built and matches these fields exactly).
3. Add Cloudinary upload for profile photo.
4. Add admin review endpoints + a simple `AdminKYC.tsx` admin panel (can follow the same
   list/detail-drawer pattern as `AdminUsers.tsx` / `AdminUserDetailDrawer.tsx`).
5. Only after 1–4 are live and working: integrate a real BVN/NIN verification provider.
   This is the highest-risk, highest-compliance-burden step (data-sharing agreements,
   provider contracts) — don't block the rest of the KYC flow on it.
