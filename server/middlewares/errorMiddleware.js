export const errorMiddleware = (err, req, res) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";

    // Log the error for debugging purposes (e.g., to console or a logging service)
    console.error(err);

    // Differentiate error response based on environment
    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            success: false,
            errMessage: err.message,
            stack: err.stack, // Include stack trace in development
        });
    } else {
        res.status(err.statusCode).json({
            success: false,
            errMessage: err.message, // Only send generic message in production
        });
    }
};