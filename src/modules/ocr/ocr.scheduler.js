const env = require('../../config/env');

/**
 * SCHEDULER cho OCR — chống "chồng chéo & delay nhau" khi NHIỀU giáo viên gọi cùng lúc.
 *
 * Hai cơ chế:
 *  1) Giới hạn ĐỒNG THỜI (maxConcurrent): chỉ cho N call OpenRouter chạy song song,
 *     phần còn lại xếp hàng FIFO → không tạo "thundering herd" làm tất cả cùng 429.
 *  2) Điều tiết TỐC ĐỘ (maxPerMin): trần số call/phút theo cửa sổ trượt → tránh chạm
 *     giới hạn "free-models-per-min" của OpenRouter.
 *
 * Node là single-thread + async nên các call I/O không chặn CPU của nhau; scheduler
 * chỉ điều phối để chia đều tài nguyên/quota, đảm bảo công bằng (FIFO) và ổn định.
 *
 * Lưu ý mở rộng: bản này in-memory (đủ cho 1 tiến trình / giai đoạn test). Khi chạy
 * nhiều instance, thay bộ đếm bằng Redis (token bucket) — interface giữ nguyên.
 */

const maxConcurrent = env.ocrMaxConcurrent;
const maxPerMin = env.ocrMaxPerMin;

let active = 0; // số task đang chạy
const queue = []; // { fn, resolve, reject, enqueuedAt }
const recent = []; // mốc thời gian các task đã khởi chạy trong 60s gần nhất

const pruneWindow = () => {
  const cutoff = Date.now() - 60000;
  while (recent.length && recent[0] < cutoff) recent.shift();
};

const pump = () => {
  pruneWindow();
  if (queue.length === 0) return;
  if (active >= maxConcurrent) return;

  // Chạm trần request/phút → hoãn tới khi cửa sổ trượt giải phóng chỗ.
  if (recent.length >= maxPerMin) {
    const waitMs = recent[0] + 60000 - Date.now() + 30;
    setTimeout(pump, Math.max(30, waitMs));
    return;
  }

  const job = queue.shift();
  active += 1;
  recent.push(Date.now());

  Promise.resolve()
    .then(job.fn)
    .then(job.resolve, job.reject)
    .finally(() => {
      active -= 1;
      pump(); // mở chỗ cho task kế tiếp
    });

  pump(); // thử lấp đầy tới maxConcurrent
};

/**
 * Đưa 1 tác vụ async vào hàng đợi. Trả promise resolve/reject theo kết quả tác vụ.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
const schedule = (fn) =>
  new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject, enqueuedAt: Date.now() });
    pump();
  });

/** Thống kê nhanh để theo dõi tải. */
const stats = () => {
  pruneWindow();
  return { active, queued: queue.length, lastMinute: recent.length, maxConcurrent, maxPerMin };
};

module.exports = { schedule, stats };
