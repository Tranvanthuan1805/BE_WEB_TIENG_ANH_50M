const prisma = require('../../config/database');
const fs = require('fs');
const path = require('path');
const https = require('https');
const env = require('../../config/env');
const { breakdownSentenceToPhones } = require('./phonetics');

// Helper to evaluate audio using Gemini 1.5/2.0 Flash
const evaluateSpeakingAudioWithGemini = async (audioBuffer, rawMimeType, correctText = '') => {
  const apiKey = process.env.GEMINI_API_KEY || env.geminiApiKey;
  if (!apiKey) {
    console.warn("No GEMINI_API_KEY found in .env.");
    return null;
  }

  const base64Data = audioBuffer.toString('base64');
  const cleanMimeType = (rawMimeType || 'audio/webm').split(';')[0].trim();

  const promptText = `Bạn là một giáo viên chuyên chấm phát âm tiếng Anh cho người Việt theo chuẩn Speechace.
Đầu vào nhận được từ file âm thanh người học đọc:
- "reference_text": "${correctText}"

Nhiệm vụ:
1. Nhận dạng giọng đọc trong file âm thanh. Nếu im lặng hoàn toàn hoặc chỉ là tiếng ồn, trả về score: 0 và errors rõ ràng.
2. So sánh transcript với "reference_text" để tìm từ bị đọc sai, thiếu âm cuối (/s/, /t/, /d/, /k/, /p/), sai nguyên âm hoặc nuốt từ.
3. Chấm điểm tổng quan theo thang 0-100.
4. Trả về danh sách các từ bị lỗi và âm vị cụ thể bị sai nếu có.

BẮT BUỘC CHỈ TRẢ VỀ JSON THEO ĐÚNG FORMAT SAU:
{
  "score": 88,
  "transcript": "từ hoặc câu học viên đã đọc",
  "matched_words": ["word1", "word2"],
  "errors": [
    { "word": "${correctText}", "issue": "Thiếu âm đuôi", "wrong_phone": "k", "suggestion": "Bật rõ âm đuôi" }
  ]
}`;

  const postData = JSON.stringify({
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: base64Data
            }
          },
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  });

  const callGeminiModel = (modelName) => {
    return new Promise((resolve) => {
      let isSettled = false;
      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          console.warn(`Gemini (${modelName}) timed out after 3500ms.`);
          resolve(null);
        }
      }, 3500);

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        rejectUnauthorized: true
      };

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timer);
          try {
            if (res.statusCode !== 200) {
              console.error(`Gemini (${modelName}) Error Status:`, res.statusCode, responseBody);
              resolve(null);
              return;
            }
            const parsed = JSON.parse(responseBody);
            const rawText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            resolve(JSON.parse(rawText));
          } catch (e) {
            console.error(`Error parsing Gemini (${modelName}) response:`, e);
            resolve(null);
          }
        });
      });

      req.on('error', (e) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);
        console.error(`Gemini (${modelName}) request error:`, e);
        resolve(null);
      });

      req.write(postData);
      req.end();
    });
  };

  // Try gemini-flash-latest first with fast timeout, fallback to smart evaluation if needed
  let result = await callGeminiModel('gemini-flash-latest');
  return result;
};

// Fallback intelligent evaluator
const generateSmartFallbackEvaluation = (correctText, audioBuffer) => {
  const audioSize = audioBuffer ? audioBuffer.length : 0;
  // Short recording (<12KB) or silent audio
  const isAudioTooSmall = audioSize < 12000;

  if (isAudioTooSmall) {
    return {
      score: 0,
      transcript: '(Chưa ghi nhận được âm thanh / Im lặng)',
      errors: [{ word: correctText, issue: 'Âm thanh quá nhỏ hoặc chưa thu được giọng đọc' }]
    };
  }

  return {
    score: 0,
    transcript: '(Chưa nhận diện được giọng đọc)',
    errors: [{ word: correctText, issue: 'Chưa phát âm đúng từ vựng yêu cầu' }]
  };
};

const gradeSpeaking = async (user, { exerciseId, correctText, file }) => {
  if (!exerciseId || !correctText || !file) {
    const err = new Error('Thiếu thông tin bài tập, từ vựng hoặc file ghi âm.');
    err.status = 400;
    throw err;
  }

  const isValidHexId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

  // Fall-safe: Verify exercise exists. If not, look up or fallback to null
  let targetExerciseId = isValidHexId(exerciseId) ? exerciseId : null;
  if (targetExerciseId) {
    try {
      const exercise = await prisma.exercise.findFirst({ where: { id: targetExerciseId } });
      if (!exercise) {
        const anySpeakingEx = await prisma.exercise.findFirst({
          where: { type: 'SPEAKING', isDeleted: false }
        });
        if (anySpeakingEx) {
          targetExerciseId = anySpeakingEx.id;
        }
      }
    } catch (e) {
      // ObjectId issue fallback
    }
  }

  // 1. Fetch previous attempts for user + exercise (limit 3 attempts)
  let previousResults = [];
  if (user?.id && isValidHexId(user.id) && targetExerciseId) {
    try {
      previousResults = await prisma.speakingResult.findMany({
        where: { userId: user.id, exerciseId: targetExerciseId },
        orderBy: { createdAt: 'asc' },
        take: 3
      });
    } catch (e) {
      console.warn('Error fetching previous attempts:', e.message);
    }
  }

  const attemptsCount = previousResults.length;
  if (attemptsCount >= 3) {
    const err = new Error('Bạn đã hết lượt thử cho câu này (tối đa 3 lần).');
    err.status = 400;
    throw err;
  }

  // 2. Perform AI Evaluation via Gemini
  const audioBuffer = file.buffer;
  let evalResult = await evaluateSpeakingAudioWithGemini(audioBuffer, file.mimetype, correctText);

  let score = 0;
  let transcript = '';
  let errorsList = [];

  if (evalResult && typeof evalResult.score === 'number') {
    score = Math.max(0, Math.min(100, Math.round(evalResult.score)));
    transcript = evalResult.transcript || correctText;
    errorsList = Array.isArray(evalResult.errors) ? evalResult.errors : [];
  } else {
    const fb = generateSmartFallbackEvaluation(correctText, audioBuffer);
    score = fb.score;
    transcript = fb.transcript;
    errorsList = fb.errors || [];
  }

  // 3. Generate detailed Syllable and Phone breakdown with status
  const wordsBreakdown = breakdownSentenceToPhones(correctText, score, errorsList);
  const earnedStars = score >= 80 ? 3 : score >= 50 ? 2 : 1;

  // 4. Background non-blocking R2 Upload & DB saving
  setImmediate(async () => {
    try {
      let r2Url = '';
      try {
        const { uploadToR2 } = require('../../utils/r2');
        const ext = path.extname(file.originalname) || '.webm';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const r2FileName = `speaking-${uniqueSuffix}${ext}`;
        r2Url = await uploadToR2(audioBuffer, r2FileName, file.mimetype);
      } catch (e) {}

      if (user?.id && isValidHexId(user.id) && targetExerciseId) {
        await prisma.speakingResult.create({
          data: {
            userId: user.id,
            exerciseId: targetExerciseId,
            audioUrl: r2Url || 'local_audio',
            aiScore: score,
            feedback: `Độ chính xác: ${score}%. Bạn đọc là: "${transcript}"`
          }
        });

        const existingScore = await prisma.score.findFirst({
          where: { userId: user.id, exerciseId: targetExerciseId }
        });

        if (!existingScore) {
          await prisma.score.create({
            data: { userId: user.id, exerciseId: targetExerciseId, score: score }
          });
        } else if (score > existingScore.score) {
          await prisma.score.update({
            where: { id: existingScore.id },
            data: { score: score }
          });
        }
      }

      if (user?.id && isValidHexId(user.id)) {
        let gamification = await prisma.gamification.findUnique({
          where: { userId: user.id }
        });

        if (!gamification) {
          await prisma.gamification.create({
            data: { userId: user.id, stars: earnedStars, totalPoints: earnedStars * 10, streak: 1 }
          });
        } else {
          await prisma.gamification.update({
            where: { id: gamification.id },
            data: {
              stars: gamification.stars + earnedStars,
              totalPoints: gamification.totalPoints + (earnedStars * 10),
              lastActive: new Date()
            }
          });
        }
      }
    } catch (bgErr) {
      console.warn('Background save notice:', bgErr.message);
    }
  });

  const currentAttempt = attemptsCount + 1;
  const canRetry = currentAttempt < 3;

  // Build attemptsHistory array (e.g. 1ST, 2ND, 3RD + LATEST)
  const attemptsHistory = [
    ...previousResults.map((r, idx) => ({
      attempt: idx + 1,
      score: r.aiScore
    })),
    {
      attempt: currentAttempt,
      score: score
    }
  ];

  return {
    resultId: `speaking-${Date.now()}`,
    audioUrl: 'local_audio',
    transcript,
    score,
    latestScore: score,
    words: wordsBreakdown,
    attemptsHistory,
    attempt: currentAttempt,
    canRetry,
    earnedStars
  };
};

module.exports = { gradeSpeaking };
