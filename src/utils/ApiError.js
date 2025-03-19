class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something wrong",
        errors = [],
        statck = ""
    ) {
        super(message); // Call the parent class (Error) constructor with the message
        this.statusCode = statusCode; // HTTP status code for the error
        this.data = null; // Placeholder for any additional data (not used here)
        this.message = message; // Error message
        this.success = false; // Indicates the operation was not successful
        this.errors = errors; // Array of specific errors (if any)

        if (statck) {
            this.stack = statck; // Use the provided stack trace if available
        } else {
            Error.captureStackTrace(this, this.constructor); // Capture the stack trace
        }
    }
}

export { ApiError };