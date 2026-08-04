const aiService = require('./ai.service');

const getListeningTask = async (req, res, next) => {
  try {
    const { level, topic } = req.body;
    const data = await aiService.generateListeningTask({ level, topic });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getReadingTask = async (req, res, next) => {
  try {
    const { level, topic } = req.body;
    const data = await aiService.generateReadingTask({ level, topic });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getWritingPrompt = async (req, res, next) => {
  try {
    const { level, topic } = req.body;
    const data = await aiService.generateWritingPrompt({ level, topic });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const evaluateWriting = async (req, res, next) => {
  try {
    const { prompt, content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung bài viết.' });
    }
    const data = await aiService.evaluateWritingTask({ prompt, content });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getListeningTask,
  getReadingTask,
  getWritingPrompt,
  evaluateWriting
};
