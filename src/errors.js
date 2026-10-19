// Domain errors carry an HTTP status and a stable machine-readable code; draft conflicts add the current draft state.
const codes = { 400: 'BAD_REQUEST', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 413: 'PAYLOAD_TOO_LARGE', 415: 'UNSUPPORTED_MEDIA_TYPE' };
export class DomainError extends Error {
  constructor(message, status = 400, code = codes[status] || 'BAD_REQUEST', details = undefined) { super(message); this.status = status; this.code = code; if (details !== undefined) this.details = details; }
}
