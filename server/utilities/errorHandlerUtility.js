class ErrorHandler extends Error{
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (err, req, res, next) => {
    
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });
};



// import fs from 'fs';
// import path from 'path';

// const logFilePath = path.join(path.dirname(new URL(import.meta.url).pathname), 'error.log'); // Update to use import.meta.url



// const logError = (error) => {
//     console.log("Logging error:", error); // Log the error to the console for debugging

// const errorMessage = `${new Date().toISOString()} - ${error.statusCode}: ${error.message}\n${error.stack}`; // Include stack trace for debugging


