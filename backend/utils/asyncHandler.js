// utils/asyncHandler.js — Wraps async route handlers with try/catch
// Prevents unhandled promise rejections from crashing the server

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
