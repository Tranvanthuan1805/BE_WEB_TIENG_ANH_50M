# Handover — BE Web Tiếng Anh 50M
Ngày: ___/___/______   |   Prepared by: Tranvanthuan1805

## 1. Môi trường & Access
| Môi trường  | URL            |
|-------------|----------------|
| Production  | https://___    |
| Staging     | https://___    |
| DB Admin    | ___            |

## 2. Source Code
| Repo    | URL                                                       | Branch |
|---------|-----------------------------------------------------------|--------|
| Backend | https://github.com/Tranvanthuan1805/BE_WEB_TIENG_ANH_50M | main   |

### Chạy local
```bash
git clone https://github.com/Tranvanthuan1805/BE_WEB_TIENG_ANH_50M.git
cd BE_WEB_TIENG_ANH_50M
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

## 3. Tech Stack
| Layer     | Technology   | Version |
|-----------|-------------|---------|
| Runtime   | Node.js      | 20.x    |
| Framework | Express.js   | 4.x     |
| ORM       | Prisma       | 5.x     |
| Database  | PostgreSQL   | 16.x    |

## 4. Deploy
<!-- Bước deploy chi tiết -->

## 5. Environment Variables
| Variable          | Mô tả                        |
|-------------------|------------------------------|
| DATABASE_URL      | PostgreSQL connection string |
| JWT_SECRET        | Secret key cho JWT           |
| JWT_EXPIRES_IN    | Token expiry (e.g. 7d)       |
| OPENAI_API_KEY    | Whisper AI scoring           |
| OCR_API_KEY       | OCR service key              |
| PORT              | Server port (default 3000)   |

## 6. Known Issues
<!-- Ghi lại bugs / workarounds khi bàn giao -->
