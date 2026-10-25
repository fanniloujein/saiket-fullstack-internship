// An error that already knows which HTTP status to send.
// Thrown anywhere in a route, it is turned into a clean JSON response by errorHandler.js.
export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, "VALIDATION_ERROR", message, details);
export const notFound = (message) => new HttpError(404, "NOT_FOUND", message);
export const conflict = (message, details) => new HttpError(409, "CONFLICT", message, details);
