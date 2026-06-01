# 황금을 찾아라 Backend

카페 상권 분석 데이터를 제공하는 Node.js API 서버입니다. 프론트엔드는 이 API를 통해 추천 상권, 상권 상세, 상권 비교, AI 해설을 가져옵니다.

## 실행

```bash
cd backend
npm start
```

개발 모드:

```bash
npm run dev
```

기본 주소:

```txt
http://localhost:4000
```

## 폴더 구조

```txt
src/
  server.js                  # 서버 실행 진입점
  app.js                     # Express 앱 조립
  routes/                    # URL 경로 정의
  controllers/               # 요청/응답 처리
  services/                  # 추천 계산, 데이터 로딩, AI 해설 로직
  schemas/                   # 쿼리 검증 및 파싱
  middlewares/               # CORS, 메서드 제한, 404, 에러 처리
```

## 주요 API

```txt
GET /api/health
GET /api/meta
GET /api/recommendations?time=evening&targetAges=20,30&limit=10
GET /api/recommend?time=evening&targetAges=20,30&limit=10
GET /api/recommendations?time=evening&targetAges=20,30&limit=10&ai=true
GET /api/areas?query=서교
GET /api/areas/11440660?time=evening&targetAges=20,30&ai=true
GET /api/compare?areaA=11440660&areaB=11410585&time=evening
```

## 추천 점수

추천 점수는 CSV에 저장하지 않고 `services/dataStore.service.js`에서 요청 조건에 따라 계산합니다.

```txt
카페전환효율: 30%
타깃 매출비율: 25%
타깃 유동인구 규모: 20%
선택 시간대 매출비중: 15%
객단가: 10%
```

## 데이터 신뢰도

추천 점수와 별개로 데이터 신뢰도를 계산하고, 기본 설정에서는 신뢰도가 낮은 후보가 상위에 바로 노출되지 않도록 보정합니다.

```txt
총 매출건수 규모: 30%
총 유동인구 규모: 20%
타깃 유동인구 규모: 20%
분기별 매출 안정성: 20%
카페전환효율 이상치 여부: 10%
```

## AI 해설

배포 환경에서는 OpenAI Chat Completions API와 `gpt-5-nano`를 사용해 상권 해설을 생성합니다. API 키는 프론트엔드에 노출하지 않고 백엔드 환경변수로만 관리합니다.

```bash
OPENAI_API_KEY=sk-...
EXPLANATION_PROVIDER=openai
OPENAI_MODEL=gpt-5-nano
```

OpenAI 호출이 실패하거나 API 키가 없으면 규칙 기반 설명으로 fallback합니다. 로컬 개발 중 Ollama를 다시 사용하고 싶으면 `EXPLANATION_PROVIDER=ollama`로 전환할 수 있습니다.
