# ADR-B06: Explicit private use of an immutable local image

Status: implemented local candidate under Lead's 1 November 2026 correction scope; production identity/hosting decision is outside this ADR.

## Problem and decision

The classic image chooser required canonical `approval.status=approved`, but the actual media importer and validator deliberately retain `pending`. That lifecycle could never supply an image to the chooser. Canonical source/teaching publication approval is an existing, different exact-bundle decision.

Record explicit Author consent in an optional `media-state.privateImageUse` overlay. Its version-1 `approvals` map is keyed by `assetId/revisionId/sha256`; its `operations` map is keyed by `actorId/operationId`. A record contains version, scope `private-image-use`, status `approved`, server-selected actor/time/operation and the exact image pin (asset, revision, SHA256, managed URL, MIME, byte length, kind). Its operation receipt retains the strict request, canonical request hash and identical result. The importer, frozen revision and original operation result remain byte-for-byte unchanged. Approval is never inherited by another revision, even with the same bytes.

The new Author-only POST `studio/media/approve-private-image-use` accepts exactly `operationId`, `assetId`, `revisionId`, `sha256`, `url`, `mimeType`, `byteLength`, `expectedCurrentRevisionId`. Body limit is 4096 bytes. Actor, time, scope and approval are not client fields. It verifies PNG/JPEG/WebP/GIF kind/type, exact imported revision identity, signature/checksum/size of retained local bytes, current-head CAS, and complete prior audit integrity in the same transaction as the single media-state write. The existing local fictional Author identity and same-origin/loopback checks are reused; this is not production authentication.

The head CAS prevents approving against unseen history. An explicitly reviewed historical revision remains approvable if the request also names the current head. Exact repeated operation returns its original receipt without a write even after later revisions exist. Changed operation payload conflicts. A different operation for an already-approved pin conflicts and asks the caller to refresh. Audit storage is bounded to 5000 records and paired operation receipts; no eviction.

## Chooser and publication boundaries

Status is read-only. It validates stored assets/receipts/audit and returns a computed `privateUseApproval` on each revision; it never writes that DTO field into immutable history. The chooser presents title, provenance, full SHA256, revision/type/length and only a managed local raster preview. It offers an explicit private-use approval button, then a separate exact-revision selection and required alt text (1–2000 nonblank characters). It lists 20 image revisions per page. A failed preview disables approval/selection until refresh. Insert rechecks the actual server status, bytes and exact approved pin. Failed/retried requests retain alt text; a lost response retries the same operation; cancellation suppresses late UI callbacks without undoing an explicitly requested approval that already committed.

Insertion changes only the editor buffer. Ordinary explicit Save is still needed. The inserted HTML uses the immutable checksum URL and alt text; the full asset/revision/provenance/import and private-use receipts remain in media state. No new lesson text/media acquisition is generated. Existing media-library import and generic reference selection remain unchanged.

`checkPublication` and the source exact-bundle approval path are unchanged. Private consent cannot supply `trustedContentApproval`, cannot change canonical pending approval, and cannot publish human/source media through ordinary or selected-lesson publication. Existing synthetic-demo publication remains available for disposable verification.

## Recovery and compatibility

States without the optional overlay preserve their old shape. Media recovery bundles without the overlay remain version 1. Bundles with the overlay use **mediaRecovery.version 2**, while Store schema stays 10. Version 2 requires the complete overlay; version 1 cannot carry it. Older executable media readers reject version 2 rather than silently dropping its audit. Use the matching executable for backup recovery; do not code-downgrade an approval-bearing installation to an old reader.

Startup (when an overlay exists), status, imports, approvals, export, explicit persistent validation and restore all validate the overlay against immutable assets, verified bytes, valid Author identities, imported receipts and paired private-operation receipts. Incoming recovery validates independently, so existing local records cannot conceal missing incoming dependencies. Merge retains newer local records and unions compatible incoming records; any differing record for a shared pin or operation rejects before writes. Repeated recovery does not create new approvals/timestamps. The existing byte/alias/revision retention, 50 MB media recovery bound, whole-backup bound and transaction rollback remain intact.

These are structural/audit integrity checks within the existing Author-controlled local recovery trust boundary, not a cryptographic attestation that an arbitrary self-consistent externally edited backup came from this server. Canonical teaching approval continues to use its separate existing signed exact-bundle checks. No signing-key migration or new external identity service is introduced.

## Verification and consequences

See `docs/architecture/PRIVATE_IMAGE_USE_DELIVERY_20261101.md` and the checked-in focused evidence. Tests use real imported synthetic PNG bytes and actual server DTOs; the old fabricated canonical-approved chooser fixture was replaced. Native browser/image-decoding UX, accessibility, combined Feature integration, independent review and installation remain Lead-owned gates.

Runtime byte verification retains the existing supported signature/SHA/length contract; it does not add a general-purpose server image decoder. The synthetic PNG additionally has executable CRC and decompression checks. No actual user/source image was imported or approved during implementation.
