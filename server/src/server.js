const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
  console.log(`Environment: ${config.env}`);
  console.log(`Health check endpoint: http://localhost:${config.port}/api/health`);
});