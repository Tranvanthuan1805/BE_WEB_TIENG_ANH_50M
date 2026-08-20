const prisma = require('../../config/database');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Helper to transcribe audio using Gemini 2.5 Flash
const env = require('../../config/env');

// Helper to evaluate audio using Gemini 1.5 Flash as Expert Phonetics Examiner
const evaluateSpeakingAudioWithGemini = async (audioBuffer, rawMimeType, correctText = '') => {
  const apiKey = process.env.GEMINI_API_KEY || env.geminiApiKey;
  if (!apiKey) {
    console.warn("No GEMINI_API_KEY found.");
    return null;
  }

  const base64Data = audioBuffer.toString('base64');
  const cleanMimeType = (rawMimeType || 'audio/webm').split(';')[0].trim();

  const promptText = `You are an elite Senior AI Phonetics & English Speech Specialist evaluating school student speech recordings.
Target word / sentence to pronounce: "${correctText}"

Instructions:
1. Examine the audio file carefully for clear human spoken speech.
2. If audio is completely silent or only background noise:
   Return: {"isSilent": true, "score": 0, "transcript": "", "feedback": "Không phát hiện giọng nói. Bạn hãy chọn phòng yên tĩnh, bấm micro và phát âm rõ từ nhé!"}
3. If spoken speech is present:
   - Transcribe exact spoken English text in "transcript".
   - Evaluate phoneme accuracy, stress, clarity, and intonation against target "${correctText}".
   - Provide a fair, accurate score from 0 to 100 in "score". (If student pronounced target correctly or with minor accent, score 80-100; if partially correct, score 50-79; if wrong word or un-understandable, score 0-49).
   - Provide detailed, constructive feedback in Vietnamese in "feedback", explaining EXACTLY why they got this score (e.g. what sounds were pronounced well, which ending consonant or vowel stress needs improvement).

Return strictly JSON matching this structure:
{
  "isSilent": false,
  "transcript": "bicycle",
  "score": 95,
  "feedback": "Tuyệt vời! Bạn phát âm từ 'bicycle' rất tròn vành, đúng trọng âm đầu /ˈbaɪsɪkl/ và chuẩn âm đuôi /kl/."
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
      temperature: 0.2
    }
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    rejectUnauthorized: true
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            console.error('Gemini Speaking API Error Status:', res.statusCode, responseBody);
            resolve(null);
            return;
          }
          const parsed = JSON.parse(responseBody);
          const rawText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          resolve(JSON.parse(rawText));
        } catch (e) {
          console.error('Error parsing Gemini evaluation response:', e);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error('Gemini request error:', e);
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
};

const calculateScore = (transcript, correctText) => {
  if (!transcript || transcript.trim() === '') return 0;

  const normalize = (s) => String(s || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
  const transcriptWords = normalize(transcript).split(/\s+/).filter(Boolean);
  const correctWords = normalize(correctText).split(/\s+/).filter(Boolean);
  
  if (correctWords.length === 0 || transcriptWords.length === 0) return 0;
  
  let matches = 0;
  correctWords.forEach((word, index) => {
    if (transcriptWords[index] === word) {
      matches += 1;
    }
  });
  return Math.round((matches / correctWords.length) * 100);
};

const gradeSpeaking = async (user, { exerciseId, correctText, file }) => {
  if (!exerciseId || !correctText || !file) {
    const err = new Error('Thiếu thông tin bài tập, từ vựng hoặc file ghi âm.');
    err.status = 400;
    throw err;
  }

  // Fall-safe: Verify exercise exists. If not, look up or create a dummy one
  let exercise = null;
  let targetExerciseId = exerciseId;
  try {
    exercise = await prisma.exercise.findFirst({ where: { id: exerciseId } });
  } catch (e) {
    // invalid ObjectId format
  }

  if (!exercise) {
    const anySpeakingEx = await prisma.exercise.findFirst({
      where: { type: 'SPEAKING', isDeleted: false }
    });
    if (anySpeakingEx) {
      targetExerciseId = anySpeakingEx.id;
    } else {
      let cls = await prisma.class.findFirst({ where: { isDeleted: false } });
      if (!cls) {
        let teacher = await prisma.user.findFirst({ where: { role: 'TEACHER', isDeleted: false } });
        if (!teacher) {
          teacher = await prisma.user.findFirst({ where: { isDeleted: false } });
        }
        cls = await prisma.class.create({
          data: {
            name: 'Lớp Luyện Nói',
            classCode: 'SPEAKING101',
            teacherId: teacher.id
          }
        });
      }
      const newEx = await prisma.exercise.create({
        data: {
          classId: cls.id,
          title: 'Luyện nói tiếng Anh giao tiếp',
          type: 'SPEAKING',
          status: 'PUBLISHED'
        }
      });
      targetExerciseId = newEx.id;
    }
  }

  // 1. Enforce max 3 attempts at backend
  const attemptsCount = await prisma.speakingResult.count({
    where: { userId: user.id, exerciseId: targetExerciseId }
  });

  if (attemptsCount >= 3) {
    const err = new Error('Bạn đã hết lượt thử cho câu này (tối đa 3 lần).');
    err.status = 400;
    throw err;
  }

  // 2. Perform AI Evaluation via Gemini Expert Examiner
  const audioBuffer = file.buffer;
  const evalResult = await evaluateSpeakingAudioWithGemini(audioBuffer, file.mimetype, correctText);

  let score = 0;
  let transcript = '';
  let feedbackText = '';

  if (evalResult && typeof evalResult.score === 'number') {
    if (evalResult.isSilent) {
      score = 0;
      transcript = '';
      feedbackText = evalResult.feedback || 'Không phát hiện giọng nói. Vui lòng bấm micro và đọc lại rõ hơn!';
    } else {
      score = Math.max(0, Math.min(100, Math.round(evalResult.score)));
      transcript = evalResult.transcript || '';
      feedbackText = evalResult.feedback || `Phát âm đạt ${score}%. Bạn đọc là: "${transcript}"`;
    }
  } else {
    score = 0;
    transcript = '';
    feedbackText = 'Không nhận diện được phát âm. Vui lòng bấm micro và phát âm rõ từ!';
  }

  // 4. Upload to Cloudflare R2 and Save speaking result
  const { uploadToR2 } = require('../../utils/r2');
  const ext = path.extname(file.originalname) || '.webm';
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const r2FileName = `speaking-${uniqueSuffix}${ext}`;
  const r2Url = await uploadToR2(audioBuffer, r2FileName, file.mimetype);

  const speakingResult = await prisma.speakingResult.create({
    data: {
      userId: user.id,
      exerciseId: targetExerciseId,
      audioUrl: r2Url,
      aiScore: score,
      feedback: `Độ chính xác: ${score}%. Bạn đọc là: "${transcript}"`
    }
  });

  // 5. Update or insert Score table with highest score
  const existingScore = await prisma.score.findFirst({
    where: { userId: user.id, exerciseId: targetExerciseId }
  });

  if (!existingScore) {
    await prisma.score.create({
      data: {
        userId: user.id,
        exerciseId: targetExerciseId,
        score: score
      }
    });
  } else if (score > existingScore.score) {
    await prisma.score.update({
      where: { id: existingScore.id },
      data: { score: score }
    });
  }

  // 6. Award Stars in Gamification (>=80: 3 stars, >=50: 2 stars, otherwise 1 star)
  const earnedStars = score >= 80 ? 3 : score >= 50 ? 2 : 1;
  let gamification = await prisma.gamification.findUnique({
    where: { userId: user.id }
  });

  if (!gamification) {
    await prisma.gamification.create({
      data: {
        userId: user.id,
        stars: earnedStars,
        totalPoints: earnedStars * 10,
        streak: 1
      }
    });
  } else {
    // Basic streak increment if lastActive is not today
    const now = new Date();
    const lastActive = new Date(gamification.lastActive);
    let newStreak = gamification.streak;
    
    if (now.toDateString() !== lastActive.toDateString()) {
      const diffTime = Math.abs(now - lastActive);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    }

    await prisma.gamification.update({
      where: { id: gamification.id },
      data: {
        stars: gamification.stars + earnedStars,
        totalPoints: gamification.totalPoints + (earnedStars * 10),
        streak: newStreak,
        lastActive: now
      }
    });
  }

  const currentAttempt = attemptsCount + 1;
  const canRetry = currentAttempt < 3;

  return {
    resultId: speakingResult.id,
    audioUrl: r2Url,
    transcript,
    score,
    feedback: feedbackText,
    attempt: currentAttempt,
    canRetry,
    earnedStars
  };
};

module.exports = { gradeSpeaking };
