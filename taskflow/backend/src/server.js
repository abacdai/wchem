require('dotenv').config();
const mongoose = require('mongoose');
const { createApp } = require('./app');

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskflow';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log(`[TaskFlow] MongoDB connected: ${MONGODB_URI}`);
  const httpServer = createApp();
  httpServer.listen(PORT, () => {
    console.log(`[TaskFlow] API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[TaskFlow] Fatal startup error:', err);
  process.exit(1);
});
