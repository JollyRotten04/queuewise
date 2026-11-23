// Errors with a status and a message that is safe to show the client.
export class HttpError extends Error {
    constructor(status, message, field) {
        super(message);
        this.status = status;
        this.field = field;
    }
}
