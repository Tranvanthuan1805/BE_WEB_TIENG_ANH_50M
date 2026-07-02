# Progress Tracking API Documentation

## Overview
API để lưu và quản lý tiến độ học tập của từng sinh viên trên các bài tập. Mỗi sinh viên có tiến độ riêng biệt, được lưu vào database và persist qua các sessions.

## Base URL
```
/api/progress
```

## Authentication
Tất cả endpoints yêu cầu JWT token trong header:
```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Get All Progress
Lấy tất cả tiến độ của sinh viên hiện tại.

**Endpoint:** `GET /api/progress/all`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "userId": "...",
      "exerciseId": "...",
      "type": "quiz",
      "data": {
        "currentIndex": 5,
        "answers": [...],
        "score": 3,
        "completed": false
      },
      "exercise": {
        "id": "...",
        "title": "Unit 1 Vocabulary Quiz",
        "type": "QUIZ"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:10:00.000Z"
    }
  ]
}
```

---

### 2. Get Exercise Progress
Lấy tiến độ của sinh viên trên một bài tập cụ thể.

**Endpoint:** `GET /api/progress/:exerciseId/:type`

**Parameters:**
- `exerciseId` (string): ID của bài tập
- `type` (string): Loại bài tập (`quiz`, `vocab_flashcard`, `sentence_arrange`, etc.)

**Response:**
```json
{
  "success": true,
  "data": {
    "currentIndex": 5,
    "answers": [
      { "answer": "số đếm", "isCorrect": true, "answeredAt": "2024-01-01T00:01:00.000Z" },
      { "answer": "bốn", "isCorrect": false, "answeredAt": "2024-01-01T00:02:00.000Z" }
    ],
    "score": 3,
    "totalQuestions": 10,
    "completed": false,
    "startedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (No Progress):**
```json
{
  "success": true,
  "data": null
}
```

---

### 3. Save Progress
Lưu toàn bộ tiến độ của sinh viên.

**Endpoint:** `POST /api/progress/:exerciseId/:type`

**Parameters:**
- `exerciseId` (string): ID của bài tập
- `type` (string): Loại bài tập

**Body:**
```json
{
  "data": {
    "currentIndex": 6,
    "answers": [...],
    "score": 4,
    "totalQuestions": 10,
    "completed": false,
    "startedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentIndex": 6,
    "answers": [...],
    "score": 4
  }
}
```

---

### 4. Save Single Answer
Lưu một câu trả lời đơn lẻ (tự động cập nhật score và currentIndex).

**Endpoint:** `POST /api/progress/:exerciseId/:type/answer`

**Parameters:**
- `exerciseId` (string): ID của bài tập
- `type` (string): Loại bài tập

**Body:**
```json
{
  "questionIndex": 5,
  "answer": "số đếm",
  "isCorrect": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentIndex": 6,
    "answers": [...],
    "score": 4,
    "totalQuestions": 10,
    "completed": false
  }
}
```

---

### 5. Mark as Completed
Đánh dấu bài tập đã hoàn thành.

**Endpoint:** `POST /api/progress/:exerciseId/:type/complete`

**Parameters:**
- `exerciseId` (string): ID của bài tập
- `type` (string): Loại bài tập

**Body:**
```json
{
  "finalScore": 8
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentIndex": 10,
    "answers": [...],
    "score": 8,
    "completed": true,
    "completedAt": "2024-01-01T00:15:00.000Z"
  }
}
```

---

### 6. Delete Progress (Restart)
Xóa tiến độ để bắt đầu lại từ đầu.

**Endpoint:** `DELETE /api/progress/:exerciseId/:type`

**Parameters:**
- `exerciseId` (string): ID của bài tập
- `type` (string): Loại bài tập

**Response:**
```json
{
  "success": true,
  "message": "Progress deleted successfully"
}
```

---

## Progress Data Structure

### Quiz Progress
```javascript
{
  currentIndex: 5,              // Câu hỏi hiện tại (0-indexed)
  answers: [                    // Mảng các câu trả lời
    {
      answer: "số đếm",
      isCorrect: true,
      answeredAt: "2024-01-01T00:01:00.000Z"
    }
  ],
  score: 3,                     // Số câu trả lời đúng
  totalQuestions: 10,           // Tổng số câu hỏi
  completed: false,             // Đã hoàn thành chưa
  startedAt: "2024-01-01T00:00:00.000Z",
  completedAt: "2024-01-01T00:15:00.000Z" // (optional)
}
```

### Vocabulary Flashcard Progress
```javascript
{
  currentIndex: 8,              // Thẻ từ hiện tại
  reviewedWords: [              // Danh sách từ đã ôn
    {
      vocabularyId: "...",
      remembered: true,
      reviewedAt: "2024-01-01T00:02:00.000Z"
    }
  ],
  completed: false
}
```

---

## Usage Examples

### Frontend Integration Example

```javascript
// Khi bắt đầu bài tập, load progress
async function loadProgress(exerciseId, type) {
  const response = await fetch(`/api/progress/${exerciseId}/${type}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  
  if (data.success && data.data) {
    // Có progress - tiếp tục từ vị trí cũ
    return data.data;
  } else {
    // Chưa có progress - bắt đầu mới
    return {
      currentIndex: 0,
      answers: [],
      score: 0,
      completed: false,
      startedAt: new Date().toISOString()
    };
  }
}

// Khi sinh viên trả lời câu hỏi
async function saveAnswer(exerciseId, type, questionIndex, answer, isCorrect) {
  const response = await fetch(`/api/progress/${exerciseId}/${type}/answer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      questionIndex,
      answer,
      isCorrect
    })
  });
  
  return await response.json();
}

// Khi hoàn thành bài tập
async function completeExercise(exerciseId, type, finalScore) {
  const response = await fetch(`/api/progress/${exerciseId}/${type}/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      finalScore
    })
  });
  
  return await response.json();
}

// Khi muốn làm lại từ đầu
async function restartExercise(exerciseId, type) {
  const response = await fetch(`/api/progress/${exerciseId}/${type}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
}
```

---

## Progress Types

Các giá trị phổ biến cho parameter `type`:

- `quiz` - Bài tập trắc nghiệm
- `vocab_flashcard` - Flashcard từ vựng
- `sentence_arrange` - Sắp xếp câu
- `speaking_practice` - Luyện nói
- `vocab_island` - Đảo từ vựng (game)
- `challenge_arena` - Thử thách

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Progress data is required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Không có quyền truy cập. Vui lòng đăng nhập."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Notes

1. **Tự động lưu**: Progress được tự động lưu sau mỗi câu trả lời
2. **Multi-user safe**: Mỗi sinh viên có progress riêng biệt
3. **Session persistence**: Progress được lưu vào database, không mất khi refresh
4. **Unique constraint**: Mỗi user chỉ có 1 progress record cho mỗi (exerciseId, type)
