const prisma = require('../../config/database');

/**
 * Get exercise progress for a user
 * @param {string} userId - User ID
 * @param {string} exerciseId - Exercise ID
 * @param {string} type - Progress type (e.g., "quiz", "vocab_flashcard", "sentence_arrange")
 * @returns {Object|null} Progress data or null if not found
 */
const getProgress = async (userId, exerciseId, type) => {
  try {
    const progress = await prisma.exerciseProgress.findUnique({
      where: {
        userId_exerciseId_type: {
          userId,
          exerciseId,
          type
        }
      }
    });
    
    return progress ? progress.data : null;
  } catch (error) {
    console.error('Error getting progress:', error);
    return null;
  }
};

/**
 * Save exercise progress for a user
 * @param {string} userId - User ID
 * @param {string} exerciseId - Exercise ID
 * @param {string} type - Progress type
 * @param {Object} data - Progress data to save
 * @returns {Object} Saved progress data
 */
const saveProgress = async (userId, exerciseId, type, data) => {
  try {
    const progress = await prisma.exerciseProgress.upsert({
      where: {
        userId_exerciseId_type: {
          userId,
          exerciseId,
          type
        }
      },
      update: {
        data,
        updatedAt: new Date()
      },
      create: {
        userId,
        exerciseId,
        type,
        data
      }
    });
    
    return progress.data;
  } catch (error) {
    console.error('Error saving progress:', error);
    throw error;
  }
};

/**
 * Delete exercise progress (e.g., when user wants to restart)
 * @param {string} userId - User ID
 * @param {string} exerciseId - Exercise ID
 * @param {string} type - Progress type
 * @returns {boolean} Success status
 */
const deleteProgress = async (userId, exerciseId, type) => {
  try {
    await prisma.exerciseProgress.delete({
      where: {
        userId_exerciseId_type: {
          userId,
          exerciseId,
          type
        }
      }
    });
    return true;
  } catch (error) {
    if (error.code === 'P2025') {
      // Record not found, already deleted
      return true;
    }
    console.error('Error deleting progress:', error);
    throw error;
  }
};

/**
 * Get all progress for a user across all exercises
 * @param {string} userId - User ID
 * @returns {Array} Array of progress records
 */
const getAllProgressForUser = async (userId) => {
  try {
    const progressList = await prisma.exerciseProgress.findMany({
      where: { userId },
      include: {
        exercise: {
          select: {
            id: true,
            title: true,
            type: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    return progressList;
  } catch (error) {
    console.error('Error getting all progress:', error);
    return [];
  }
};

/**
 * Save quiz answer and update progress
 * @param {string} userId - User ID
 * @param {string} exerciseId - Exercise ID
 * @param {string} type - Progress type (e.g., "quiz")
 * @param {number} questionIndex - Current question index
 * @param {string} answer - User's answer
 * @param {boolean} isCorrect - Whether answer is correct
 * @returns {Object} Updated progress data
 */
const saveQuizAnswer = async (userId, exerciseId, type, questionIndex, answer, isCorrect) => {
  try {
    // Get existing progress or create new
    let currentProgress = await getProgress(userId, exerciseId, type);
    
    if (!currentProgress) {
      currentProgress = {
        currentIndex: 0,
        answers: [],
        score: 0,
        totalQuestions: 0,
        completed: false,
        startedAt: new Date().toISOString()
      };
    }
    
    // Update answers array
    if (!currentProgress.answers) {
      currentProgress.answers = [];
    }
    
    currentProgress.answers[questionIndex] = {
      answer,
      isCorrect,
      answeredAt: new Date().toISOString()
    };
    
    // Update score
    if (isCorrect) {
      currentProgress.score = (currentProgress.score || 0) + 1;
    }
    
    // Update current index to next question
    currentProgress.currentIndex = questionIndex + 1;
    
    // Save back to database
    return await saveProgress(userId, exerciseId, type, currentProgress);
  } catch (error) {
    console.error('Error saving quiz answer:', error);
    throw error;
  }
};

/**
 * Mark exercise as completed
 * @param {string} userId - User ID
 * @param {string} exerciseId - Exercise ID
 * @param {string} type - Progress type
 * @param {number} finalScore - Final score
 * @returns {Object} Updated progress data
 */
const markCompleted = async (userId, exerciseId, type, finalScore) => {
  try {
    let currentProgress = await getProgress(userId, exerciseId, type);
    
    if (!currentProgress) {
      currentProgress = {};
    }
    
    currentProgress.completed = true;
    currentProgress.completedAt = new Date().toISOString();
    currentProgress.score = finalScore;
    
    return await saveProgress(userId, exerciseId, type, currentProgress);
  } catch (error) {
    console.error('Error marking completed:', error);
    throw error;
  }
};

module.exports = {
  getProgress,
  saveProgress,
  deleteProgress,
  getAllProgressForUser,
  saveQuizAnswer,
  markCompleted
};
