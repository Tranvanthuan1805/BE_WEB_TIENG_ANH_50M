const prisma = require('../config/database');
const { deleteFromR2, getR2KeyFromUrl } = require('../utils/r2');

/**
 * Cleanup audio files older than 3 days for both students and teachers
 */
const runCleanup = async () => {
  console.log('[Cleanup Job] Starting audio cleanup process...');
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

  try {
    // Find speaking results older than 3 days that still have audio URLs
    const oldResults = await prisma.speakingResult.findMany({
      where: {
        createdAt: { lt: cutoff },
        OR: [
          { audioUrl: { not: null } },
          { feedbackAudioUrl: { not: null } }
        ]
      }
    });

    console.log(`[Cleanup Job] Found ${oldResults.length} records to clean up.`);

    for (const record of oldResults) {
      let updatedData = {};

      // 1. Clean up student speaking recording
      if (record.audioUrl) {
        try {
          const key = getR2KeyFromUrl(record.audioUrl);
          if (key) {
            console.log(`[Cleanup Job] Deleting student audio: ${key}`);
            await deleteFromR2(key);
          }
        } catch (err) {
          console.error(`[Cleanup Job] Error deleting student audio file for record ${record.id}:`, err);
        }
        updatedData.audioUrl = null;
      }

      // 2. Clean up teacher feedback recording
      if (record.feedbackAudioUrl) {
        try {
          const key = getR2KeyFromUrl(record.feedbackAudioUrl);
          if (key) {
            console.log(`[Cleanup Job] Deleting teacher feedback audio: ${key}`);
            await deleteFromR2(key);
          }
        } catch (err) {
          console.error(`[Cleanup Job] Error deleting teacher feedback audio file for record ${record.id}:`, err);
        }
        updatedData.feedbackAudioUrl = null;
      }

      // 3. Update database record
      if (Object.keys(updatedData).length > 0) {
        await prisma.speakingResult.update({
          where: { id: record.id },
          data: updatedData
        });
        console.log(`[Cleanup Job] Successfully updated database record ${record.id} to clear audio URLs.`);
      }
    }

    console.log('[Cleanup Job] Audio cleanup process finished.');
  } catch (error) {
    console.error('[Cleanup Job] Error running cleanup process:', error);
  }
};

/**
 * Start the cleanup background job (running every hour)
 */
const startCleanupJob = () => {
  // Run once immediately on startup
  runCleanup();

  // Run every 1 hour (3600000 ms)
  setInterval(runCleanup, 60 * 60 * 1000);
  console.log('[Cleanup Job] Background audio cleanup job scheduled (every 1 hour).');
};

module.exports = {
  runCleanup,
  startCleanupJob
};
