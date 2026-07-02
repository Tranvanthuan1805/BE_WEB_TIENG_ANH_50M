const progressService = require('./progress.service');

/**
 * GET /api/progress/:exerciseId/:type
 * Get progress for current user on a specific exercise
 */
const getProgress = async (req, res, next) => {
  try {
    const { exerciseId, type } = req.params;
    const userId = req.user.id;
    
    const progress = await progressService.getProgress(userId, exerciseId, type);
    
    return res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/progress/:exerciseId/:type
 * Save progress for current user on a specific exercise
 * Body: { data: {...} }
 */
const saveProgress = async (req, res, next) => {
  try {
    const { exerciseId, type } = req.params;
    const userId = req.user.id;
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Progress data is required'
      });
    }
    
    const saved = await progressService.saveProgress(userId, exerciseId, type, data);
    
    return res.json({
      success: true,
      data: saved
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/progress/:exerciseId/:type
 * Delete progress (restart exercise)
 */
const deleteProgress = async (req, res, next) => {
  try {
    const { exerciseId, type } = req.params;
    const userId = req.user.id;
    
    await progressService.deleteProgress(userId, exerciseId, type);
    
    return res.json({
      success: true,
      message: 'Progress deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/progress/all
 * Get all progress for current user
 */
const getAllProgress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const progressList = await progressService.getAllProgressForUser(userId);
    
    return res.json({
      success: true,
      data: progressList
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/progress/:exerciseId/:type/answer
 * Save a single quiz answer
 * Body: { questionIndex, answer, isCorrect }
 */
const saveAnswer = async (req, res, next) => {
  try {
    const { exerciseId, type } = req.params;
    const userId = req.user.id;
    const { questionIndex, answer, isCorrect } = req.body;
    
    if (questionIndex === undefined || answer === undefined || isCorrect === undefined) {
      return res.status(400).json({
        success: false,
        error: 'questionIndex, answer, and isCorrect are required'
      });
    }
    
    const progress = await progressService.saveQuizAnswer(
      userId,
      exerciseId,
      type,
      questionIndex,
      answer,
      isCorrect
    );
    
    return res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/progress/:exerciseId/:type/complete
 * Mark exercise as completed
 * Body: { finalScore }
 */
const markCompleted = async (req, res, next) => {
  try {
    const { exerciseId, type } = req.params;
    const userId = req.user.id;
    const { finalScore } = req.body;
    
    if (finalScore === undefined) {
      return res.status(400).json({
        success: false,
        error: 'finalScore is required'
      });
    }
    
    const progress = await progressService.markCompleted(userId, exerciseId, type, finalScore);
    
    return res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProgress,
  saveProgress,
  deleteProgress,
  getAllProgress,
  saveAnswer,
  markCompleted
};
