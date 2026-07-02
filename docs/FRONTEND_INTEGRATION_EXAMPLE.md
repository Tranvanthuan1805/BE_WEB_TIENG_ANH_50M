# Frontend Integration Example

## Ví dụ tích hợp Progress API vào Frontend

### 1. Setup API Client

```javascript
// utils/api.js
const API_BASE_URL = 'http://localhost:8000/api';

class ProgressAPI {
  constructor(token) {
    this.token = token;
  }

  async getProgress(exerciseId, type) {
    const response = await fetch(`${API_BASE_URL}/progress/${exerciseId}/${type}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return await response.json();
  }

  async saveAnswer(exerciseId, type, questionIndex, answer, isCorrect) {
    const response = await fetch(`${API_BASE_URL}/progress/${exerciseId}/${type}/answer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ questionIndex, answer, isCorrect })
    });
    return await response.json();
  }

  async completeExercise(exerciseId, type, finalScore) {
    const response = await fetch(`${API_BASE_URL}/progress/${exerciseId}/${type}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ finalScore })
    });
    return await response.json();
  }

  async restartExercise(exerciseId, type) {
    const response = await fetch(`${API_BASE_URL}/progress/${exerciseId}/${type}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return await response.json();
  }
}

export default ProgressAPI;
```

---

### 2. React Component Example (Quiz với Progress Tracking)

```javascript
// components/VocabularyQuiz.jsx
import React, { useState, useEffect } from 'react';
import ProgressAPI from '../utils/api';

function VocabularyQuiz({ exerciseId, questions, token }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const progressAPI = new ProgressAPI(token);
  const type = 'quiz';

  // Load progress khi component mount
  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const result = await progressAPI.getProgress(exerciseId, type);
      
      if (result.success && result.data) {
        // Có progress - restore state từ database
        const { currentIndex: idx, answers: ans, score: s, completed } = result.data;
        setCurrentIndex(idx);
        setAnswers(ans);
        setScore(s);
        setIsCompleted(completed);
        
        console.log('📚 Loaded progress:', result.data);
      } else {
        // Chưa có progress - bắt đầu mới
        console.log('✨ Starting new quiz');
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (selectedAnswer) => {
    const currentQuestion = questions[currentIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    // Update local state
    const newAnswers = [...answers];
    newAnswers[currentIndex] = {
      answer: selectedAnswer,
      isCorrect,
      answeredAt: new Date().toISOString()
    };
    setAnswers(newAnswers);
    
    if (isCorrect) {
      setScore(score + 1);
    }

    // Save to database
    try {
      await progressAPI.saveAnswer(
        exerciseId,
        type,
        currentIndex,
        selectedAnswer,
        isCorrect
      );
      console.log('💾 Progress saved');
    } catch (error) {
      console.error('Error saving answer:', error);
    }

    // Move to next question or complete
    if (currentIndex + 1 >= questions.length) {
      await completeQuiz(isCorrect ? score + 1 : score);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const completeQuiz = async (finalScore) => {
    try {
      await progressAPI.completeExercise(exerciseId, type, finalScore);
      setIsCompleted(true);
      console.log('🎉 Quiz completed!');
    } catch (error) {
      console.error('Error completing quiz:', error);
    }
  };

  const handleRestart = async () => {
    try {
      await progressAPI.restartExercise(exerciseId, type);
      setCurrentIndex(0);
      setAnswers([]);
      setScore(0);
      setIsCompleted(false);
      console.log('🔄 Quiz restarted');
    } catch (error) {
      console.error('Error restarting quiz:', error);
    }
  };

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  if (isCompleted) {
    return (
      <div className="quiz-complete">
        <h2>🎉 Hoàn thành!</h2>
        <p>Điểm số: {score}/{questions.length}</p>
        <button onClick={handleRestart}>Làm lại</button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="vocabulary-quiz">
      <div className="progress-bar">
        <div className="progress" style={{ width: `${(currentIndex / questions.length) * 100}%` }} />
      </div>
      
      <div className="quiz-header">
        <span>Đã thuộc: {score}/{currentIndex + 1}</span>
        <span>Từ {currentIndex + 1}/{questions.length}</span>
      </div>

      <div className="question">
        <h3>{currentQuestion.question}</h3>
        <div className="options">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(option)}
              className="option-button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Show previous answers */}
      {currentIndex > 0 && (
        <div className="previous-answers">
          <p>Câu trước: {answers[currentIndex - 1]?.isCorrect ? '✅' : '❌'}</p>
        </div>
      )}
    </div>
  );
}

export default VocabularyQuiz;
```

---

### 3. Next.js Example (như trong ảnh UI của bạn)

```javascript
// app/exercises/[id]/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function ExercisePage() {
  const params = useParams();
  const exerciseId = params.id;
  
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    loadExerciseAndProgress();
  }, []);

  const loadExerciseAndProgress = async () => {
    // 1. Load questions từ API
    const questionsRes = await fetch(`/api/exercises/${exerciseId}/quiz`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    const questionsData = await questionsRes.json();
    setQuestions(questionsData.data);

    // 2. Load progress
    const progressRes = await fetch(`/api/progress/${exerciseId}/quiz`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    const progressData = await progressRes.json();

    if (progressData.success && progressData.data) {
      // Restore progress
      setCurrentIndex(progressData.data.currentIndex || 0);
      setScore(progressData.data.score || 0);
      setTotalAnswered(progressData.data.answers?.length || 0);
    }
  };

  const handleAnswerClick = async (answer) => {
    const isCorrect = answer === questions[currentIndex].correctAnswer;
    setSelectedAnswer(answer);
    setShowResult(true);

    // Save answer
    await fetch(`/api/progress/${exerciseId}/quiz/answer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        questionIndex: currentIndex,
        answer,
        isCorrect
      })
    });

    if (isCorrect) {
      setScore(score + 1);
    }
    setTotalAnswered(totalAnswered + 1);

    // Auto move to next after 1.5s
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        // Complete
        completeExercise();
      }
    }, 1500);
  };

  const completeExercise = async () => {
    await fetch(`/api/progress/${exerciseId}/quiz/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        finalScore: score
      })
    });
    // Navigate to results page
  };

  if (questions.length === 0) return <div>Loading...</div>;

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-blue-600 p-4">
      {/* Header */}
      <div className="flex justify-between items-center text-white mb-8">
        <button className="bg-yellow-500 rounded-full p-3">←</button>
        <h1 className="text-xl font-bold">Đảo từ vựng</h1>
      </div>

      {/* Progress */}
      <div className="text-white mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span>Đã thuộc: {score}/{totalAnswered}</span>
          <span>Từ {currentIndex + 1}/{questions.length}</span>
        </div>
        <div className="w-full bg-blue-800 rounded-full h-2">
          <div 
            className="bg-white h-2 rounded-full transition-all"
            style={{ width: `${(currentIndex / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-blue-500 rounded-3xl p-8 mb-8 text-white">
        <p className="text-center mb-4">Từ này nghĩa là gì?</p>
        <h2 className="text-5xl text-center font-bold text-yellow-400 mb-2">
          {currentQ.word || 'number'}
        </h2>
        <p className="text-center text-blue-200">/{currentQ.phonetic || 'nʌmbə'}/</p>
      </div>

      {/* Answer Options */}
      <div className="space-y-3">
        {currentQ.options.map((option, idx) => {
          let bgColor = 'bg-white';
          let textColor = 'text-gray-700';
          let icon = null;

          if (showResult && selectedAnswer === option) {
            if (option === currentQ.correctAnswer) {
              bgColor = 'bg-green-100 border-2 border-green-500';
              textColor = 'text-green-700';
              icon = '✓';
            } else {
              bgColor = 'bg-red-100 border-2 border-red-500';
              textColor = 'text-red-700';
              icon = '✗';
            }
          } else if (showResult && option === currentQ.correctAnswer) {
            bgColor = 'bg-green-100 border-2 border-green-500';
            textColor = 'text-green-700';
            icon = '✓';
          }

          return (
            <button
              key={idx}
              onClick={() => !showResult && handleAnswerClick(option)}
              disabled={showResult}
              className={`w-full p-4 rounded-2xl text-center font-medium transition-all ${bgColor} ${textColor} flex items-center justify-between`}
            >
              <span className="flex-1">{option}</span>
              {icon && <span className="text-2xl">{icon}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getToken() {
  // Get token from localStorage/cookie/context
  return localStorage.getItem('token');
}
```

---

### 4. CSS Styling (Tailwind)

Ảnh UI của bạn sử dụng:
- Background: `bg-blue-600`
- Cards: `bg-blue-500` với `rounded-3xl`
- Text màu vàng: `text-yellow-400`
- Buttons: `bg-white` với `rounded-2xl`
- Correct answer: `bg-green-100 border-green-500`
- Wrong answer: `bg-red-100 border-red-500`

---

### 5. Key Features Implemented

✅ **Auto-save**: Mỗi câu trả lời tự động lưu vào database  
✅ **Resume**: Khi quay lại, tiếp tục từ câu hỏi đã dừng  
✅ **Per-student**: Mỗi sinh viên có progress riêng  
✅ **Score tracking**: Theo dõi điểm số real-time  
✅ **Completion**: Đánh dấu hoàn thành và lưu điểm cuối  
✅ **Restart**: Có thể làm lại từ đầu  

---

## Testing

```bash
# Test với curl
TOKEN="your_jwt_token"
EXERCISE_ID="6a3e62b49adb552cdeba7dc1"

# 1. Get progress
curl http://localhost:8000/api/progress/$EXERCISE_ID/quiz \
  -H "Authorization: Bearer $TOKEN"

# 2. Save answer
curl -X POST http://localhost:8000/api/progress/$EXERCISE_ID/quiz/answer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"questionIndex": 0, "answer": "táo", "isCorrect": true}'

# 3. Complete
curl -X POST http://localhost:8000/api/progress/$EXERCISE_ID/quiz/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"finalScore": 8}'

# 4. Restart
curl -X DELETE http://localhost:8000/api/progress/$EXERCISE_ID/quiz \
  -H "Authorization: Bearer $TOKEN"
```
