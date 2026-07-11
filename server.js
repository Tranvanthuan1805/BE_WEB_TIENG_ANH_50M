require('dotenv').config();
const app = require('./src/app');
const PORT = process.env.PORT || 3000;

// Start background audio files cleanup job (3 days retention policy)
const { startCleanupJob } = require('./src/jobs/cleanupAudio');
startCleanupJob();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
