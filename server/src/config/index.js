module.exports = {
  port: process.env.PORT || 3001,
  env: process.env.NODE_ENV || "development",
  corsOptions: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173", // Vite 默认端口
    optionsSuccessStatus: 200
  }
};
