class ErrorHandler extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (message, statusCode) => {
    return new ErrorHandler(message, statusCode);
};
