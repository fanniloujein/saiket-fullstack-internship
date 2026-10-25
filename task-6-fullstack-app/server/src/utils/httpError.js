// An error that already knows its HTTP status. errorHandler turns it into JSON.
export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, "VALIDATION_ERROR", message, details);
export const unauthorized = (message = "Connectez-vous pour continuer.") => new HttpError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "Vous n'avez pas les droits pour cette action.") => new HttpError(403, "FORBIDDEN", message);
export const notFound = (message) => new HttpError(404, "NOT_FOUND", message);
export const conflict = (message, details) => new HttpError(409, "CONFLICT", message, details);
export const tooManyRequests = (message) => new HttpError(429, "TOO_MANY_REQUESTS", message);
