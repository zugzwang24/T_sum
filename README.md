# 황금을 찾아라 (T-SUM)

> 서울시 공공데이터 기반, **업종·시간대·타깃 연령**에 맞춰 실제 구매 전환이 높은 행정동을
> 추천하는 **다중 업종 상권 추천 풀스택 서비스**

유동인구가 많은 곳이 아니라 **유동인구 대비 실제 매출 전환이 높은 행정동**을 점수화해 추천합니다.
초기에는 커피·음료 단일 업종(MVP)으로 시작했고, 현재는 **10개 업종**으로 확장되었습니다.
추천 점수는 백엔드 알고리즘이 계산하고, AI(LLM)는 결과를 자연어로 **설명만** 합니다.

- **Live Demo:** https://t-sum.vercel.app/ ([확인 필요] 실제 가동 여부는 배포 상태에 따름)
- 상세 기획·설계 문서: [`PROJECT_DEVELOPMENT_SUMMARY.md`](./PROJECT_DEVELOPMENT_SUMMARY.md)

> 이 문서는 현재 branch(`taehyeong`, `main` 머지 반영)의 **실제 코드** 기준입니다.

---

## 1. 아키텍처 개요

```
[Python 전처리]  raw CSV → feature CSV(area_features.csv)
        │  seed.js (csv-parse)
        ▼
[PostgreSQL] ◀── Prisma ORM ── [Express 백엔드 API]  (추천 점수·신뢰도 계산, JWT 인증, AI 설명)
                                        ▲  REST/JSON
                                        │
                              [Vite + React 프론트엔드]  (추천/상세/비교/저장/로그인)
```

| 파트 | 위치 | 핵심 |
|------|------|------|
| **데이터 전처리** | `data_analysis/` | Python(pandas/numpy)으로 원천 CSV → 행정동×업종 feature 생성 |
| **백엔드 API** | `backend/` | Node.js + Express 5 + Prisma 6 + PostgreSQL 16, JWT 인증, AI 설명 |
| **프론트엔드** | `frontend/` | Vite 6 + React 18 + TypeScript 5.7 + Tailwind 4 (+ 레거시 `public/`) |
| **DB** | `docker-compose.yml` | PostgreSQL 16 (로컬 컨테이너) |
| **배포** | `vercel.json` | Frontend → Vercel, Backend → Render ([확인 필요] 운영 상태) |

---

## 2. 기술 스택 (실제 manifest 기준)

### 백엔드 (`backend/package.json`)
- **런타임/프레임워크:** Node.js (CommonJS), **Express `^5.2.1`**
- **DB/ORM:** **PostgreSQL 16**, **Prisma `^6.19.3`** (`@prisma/client`)
- **인증:** `jsonwebtoken ^9.0.3`, `bcryptjs ^3.0.3` (salt rounds 12, JWT 기본 7d)
- **데이터:** `csv-parse ^6.2.1`, `dotenv ^17.4.2`
- **AI 설명(선택):** OpenAI Chat Completions(`OPENAI_MODEL` 기본 `gpt-5-nano`) 또는 로컬 Ollama(`llama3.1`), 실패 시 **rule-based fallback**

### 프론트엔드 (`frontend/package.json`)
- **빌드:** **Vite `^6.0.7`**, **TypeScript `^5.7.3`**
- **UI:** **React `^18.3.1`**, `react-router ^7.1.1`, **Tailwind CSS `^4.1.0`**(`@tailwindcss/vite`), `lucide-react`, `tw-animate-css`
- 인증 토큰은 `localStorage`(`goldenCafe.authToken`)에 저장

### 데이터 분석 (`data_analysis/`)
- **Python 3.x** (`__pycache__`상 CPython 3.14), `pandas`, `numpy`
- 버전 고정 파일(`requirements.txt` 등) 없음 → 정확한 버전 **[확인 필요]**

---

## 3. 디렉토리 구조

```
T_sum/
├── PROJECT_DEVELOPMENT_SUMMARY.md     # 상세 설계 문서(데이터·점수·DB·배포)
├── docker-compose.yml                 # PostgreSQL 16 로컬 컨테이너
├── vercel.json                        # 배포 설정(프론트 Vite)
│
├── data_analysis/                     # Python 전처리 파이프라인
│   └── data/
│       ├── raw/   유동인구.csv, 추정매출.csv              # 원천(cp949)
│       └── processed/
│           ├── category_config.py     # 10개 업종 정의(DEFAULT_CATEGORIES)
│           ├── pop.py                  # 유동인구 → pop_features.csv
│           ├── sales.py               # 매출(업종별) → sales_features.csv
│           ├── process.py             # 병합·전환효율 → area_features.csv (+ cafe 호환본)
│           └── *.csv                  # 산출물(utf-8-sig)
│
├── backend/                           # Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma              # 10개 모델(User, District, BusinessCategory, AreaFeature 등)
│   │   ├── seed.js                    # area_features.csv → DB upsert
│   │   └── migrations/                # 5개 마이그레이션
│   ├── src/
│   │   ├── server.js                  # 진입점(dotenv 로드, PORT 4000)
│   │   ├── app.js                     # Express 앱(cors→methodGuard→json→routes→notFound→error)
│   │   ├── routes/                    # health/api/auth/area/recommendation/compare/comparison/savedArea/ai/meta
│   │   ├── controllers/               # 라우트별 컨트롤러
│   │   ├── services/                  # dataStore(점수계산)/areaFeature(Prisma)/aiReason/auth/savedArea/comparison/history/prisma
│   │   ├── middlewares/               # cors/methodGuard/auth/asyncHandler/error/notFound
│   │   └── schemas/                   # auth/query 입력 검증
│   └── .env.example
│
├── frontend/                          # Vite + React + TS + Tailwind
│   ├── index.html · vite.config.ts · tsconfig.json
│   ├── src/
│   │   ├── main.tsx · app/App.tsx · app/routes.tsx
│   │   ├── app/pages/                 # Home/Recommendations/Detail/Compare/Login/Register/Saved
│   │   ├── app/lib/                   # api.ts(백엔드 호출)·format·options·storage
│   │   ├── app/auth/AuthContext.tsx   # JWT 인증 상태
│   │   └── app/components/ui/         # shadcn 기반 UI 컴포넌트
│   ├── public/                        # ⚠️ 레거시 vanilla(React CDN) — 현재는 Vite src/가 주력
│   └── server.js                      # dist/ 정적 서빙 서버(node)
│
├── analysis/validate_recommendation.js  # 추천 민감도 검증 스크립트
├── step.ipynb · Test.ipynb               # 탐색용 노트북
└── people.py · money.py                  # 레거시/빈 스텁
```

---

## 4. 데이터 전처리 파이프라인 (`data_analysis/data/processed/`)

원천 CSV를 **행정동×업종** 단위 feature로 정제합니다. 산출물은 저장소에 포함되어 있습니다.

| 단계 | 입력 | 출력 | 처리 |
|------|------|------|------|
| `pop.py` | `유동인구.csv` (11,900행×25열) | `pop_features.csv` (425행×23열) | 2025년 4개 분기 필터 → 행정동 평균 집계 → 2030·시간대 비중 파생 |
| `sales.py` | `추정매출.csv` (67,113행×53열) | `sales_features.csv` (3,720행×39열) | 10개 업종 필터 → 행정동×분기 합산 후 `집계_기간수`로 기간 평균화 |
| `process.py` | 위 둘 | `area_features.csv` (3,720행×65열) | 행정동 공통키 left join + `월_유동인구추정`·`업종전환효율` 파생 |

- 호환용 `cafe_area_features.csv`(커피·음료 단일, 421행)도 함께 생성
- 인코딩: 입력 `cp949` → 출력 `utf-8-sig`
- 핵심 보정: `월_유동인구추정 = 총_유동인구_수 × (365.25/12/7)` (단순 ×30 아님), `safe_divide`로 0분모 보호, `분기별_매출안정성 = 1/(1+CV)`

```bash
pip install pandas numpy
cd data_analysis/data/processed
python process.py        # pop.py·sales.py 내부 호출 → area_features.csv 재생성
```

---

## 5. 설치 및 실행

### 5.1 데이터베이스 (PostgreSQL)
```bash
docker compose up -d     # postgres:16, db=t_sum, user/pass=t_sum_user/t_sum_password, :5432
```

### 5.2 백엔드 (port 4000)
```bash
cd backend
cp .env.example .env          # 값 채우기(아래 6장)
npm install
npm run prisma:generate       # Prisma Client 생성
npm run prisma:migrate        # 마이그레이션 적용(개발: prisma migrate dev)
npm run db:seed               # area_features.csv → DB 적재
npm start                     # node src/server.js  (개발: npm run dev = --watch)
```

### 5.3 프론트엔드 (Vite dev: port 5173)
```bash
cd frontend
npm install
npm run dev                   # vite --host 0.0.0.0
# 프로덕션: npm run build → dist/ , npm start(node server.js, dist 정적 서빙)
```

> 프론트엔드는 로컬 접속 시 API를 `http://<host>:4000/api`로 자동 지정합니다.
> 그 외에는 `VITE_API_BASE_URL` 또는 기본 프로덕션 URL을 사용합니다(`src/app/lib/api.ts`).

---

## 6. 환경 변수 (`backend/.env.example`)

| 변수 | 예시값 | 설명 |
|------|--------|------|
| `PORT` | `4000` | API 서버 포트 |
| `DATABASE_URL` | `postgresql://t_sum_user:t_sum_password@localhost:5432/t_sum?schema=public` | Prisma 연결 |
| `DATA_PATH` | `../data_analysis/data/processed/area_features.csv` | seed/CSV 소스 경로 |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | CORS 용도 ([확인 필요] 코드 CORS 기본 `*`) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | `...` / `7d` | JWT 서명 키 / 만료 |
| `EXPLANATION_MODE` / `EXPLANATION_PROVIDER` | `rule` / `openai` | 설명 모드/제공자 |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | `` / `gpt-5-nano` | OpenAI 설명(선택) |
| `LOCAL_LLM_PROVIDER` / `LOCAL_LLM_URL` / `LOCAL_LLM_MODEL` | `ollama` / `http://localhost:11434/api/generate` / `llama3.1` | 로컬 LLM(선택) |

프론트엔드(`frontend/.env.example`): `VITE_API_BASE_URL` (API base, `/api` 포함).

---

## 7. 백엔드 API (주요 경로)

Base: `/api`. 인증이 필요한 경로는 `Authorization: Bearer <JWT>` 헤더 필요.

| 메서드·경로 | 인증 | 설명 |
|-------------|------|------|
| `GET /api/health` | — | 헬스 체크 |
| `GET /api/meta` | — | 시간대·연령대·업종·가중치 등 메타 |
| `GET /api/recommendations` (alias `/recommend`) | optional | 추천 목록. query: `category`,`time`,`targetAges`,`limit`,`useAdjustedScore`,`minQualityScore`,`ai` |
| `GET /api/areas` · `GET /api/areas/:areaCode` | — | 행정동 검색 / 상세 |
| `GET /api/compare` | — | 두 행정동 비교 (`areaA`,`areaB`,`time`,`category`) |
| `POST /api/auth/register` · `/login` · `GET /api/auth/me` | 일부 | 회원가입/로그인/내 정보 |
| `GET/POST/DELETE /api/saved-areas` | 필요 | 저장 상권 CRUD |
| `GET/POST /api/comparisons`, `/:id/items` | 필요 | 비교함 CRUD |
| `POST /api/ai/area-report` · `compare-summary` · `reliability-explanation` | — | AI 설명 생성 |

허용되지 않은 변경 메서드 → `405`, 미존재 경로 → `404`.

---

## 8. 추천 점수·신뢰도 모델

추천 점수는 **API 호출 시 조건(업종·시간대·연령)에 따라 동적 계산**됩니다(`backend/src/services/dataStore.service.js`).

```
baseScore = Σ( norm(featureᵢ) × weightᵢ ) × 100
  weights = 업종전환효율 0.30 · 타깃 매출비율 0.25 · 타깃 유동인구 0.20
            · 선택시간대 매출비중 0.15 · 객단가 0.10
norm(x)  = clamp((x - min) / (max - min), 0, 1)   # useAdjustedScore=true면 min=P1,max=P99
```

데이터 신뢰도 보정:
```
dataQuality        = (매출건수0.3 + 유동인구0.2 + 타깃유동0.2 + 분기안정성0.2 + 이상치0.1) × 100
reliabilityFactor  = 0.55 + (dataQuality/100) × 0.45     # 0.55 ~ 1.0
finalScore         = baseScore × reliabilityFactor
```
품질 등급: 80+ 높음 / 60+ 보통 / 40+ 주의 / 그 미만 낮음. 기준 미만은 “검토 후보”로 분리.

---

## 9. 데이터베이스 (Prisma + PostgreSQL)

`schema.prisma`의 주요 모델: `User`, `District`(행정동), `BusinessCategory`(업종), `Dataset`,
`AreaFeature`(행정동×업종×데이터셋, 수치 feature + `rawFeatures` JSON 보존), `RecommendationRun`/
`RecommendationResult`(추천 이력), `SavedArea`(저장), `Comparison`/`ComparisonItem`(비교함).

`seed.js`가 `area_features.csv`(없으면 `cafe_area_features.csv`)를 읽어
`District`/`BusinessCategory`/`Dataset`/`AreaFeature`를 upsert합니다.

---

## 10. 참고 / 확인 필요

- **[확인 필요]** 추천 점수 계산의 데이터 소스 — 인메모리 CSV(`dataStore.service.js`)와 Prisma DB(`areaFeature.service.js`) 경로가 공존하며, 둘의 우선순위/동기화 방식이 코드만으로는 명확치 않음
- **[확인 필요]** 라이브러리(Node/Python/패키지)의 정확한 버전(`engines`·`requirements.txt` 부재)
- **[확인 필요]** 운영 배포 상태(Vercel/Render URL·가동 여부) 및 OpenAI 활성화 여부
- `frontend/public/`(React CDN vanilla)은 **레거시**이며 현재 주력은 `frontend/src/`(Vite). 루트 `step.ipynb`/`Test.ipynb`/`people.py`/`money.py`는 탐색·레거시 파일
- 본 README는 `taehyeong` branch(현재 `main` 머지 반영) 기준입니다.
