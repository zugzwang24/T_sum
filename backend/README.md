# 황금을 찾아라 Backend

카페 상권 추천 MVP용 Node.js API 서버입니다.

## 실행

```bash
cd backend
npm start
```

서버 주소:

```txt
http://localhost:4000
```

## API

```txt
GET /api/health
GET /api/meta
GET /api/recommendations?time=evening&limit=10
GET /api/recommendations?time=evening&limit=10&ai=true
GET /api/recommendations?time=morning&limit=10
GET /api/areas?query=신촌
GET /api/areas/11410585?time=evening
GET /api/compare?areaA=11410585&areaB=11215710&time=morning
```

## 시간대 옵션

```txt
dawn      새벽 00~06
morning   오전 06~11
lunch     점심 11~14
afternoon 오후 14~17
evening   저녁 17~21
night     심야 21~24
```

## 추천점수 공식

```txt
추천점수 =
  카페전환효율 점수 * 0.35
+ 2030 매출비율 점수 * 0.30
+ 선택시간대 매출비중 점수 * 0.25
+ 객단가 점수 * 0.10
```

각 구성 요소는 CSV 데이터 기준 Min-Max Scaling으로 정규화합니다.

## AI 해설

배포 환경에서는 OpenAI Chat Completions API와 `gpt-5-nano`를 사용해 상권 해설을 생성합니다. API 키는 프론트엔드가 아니라 백엔드 환경변수에만 저장합니다.

```bash
OPENAI_API_KEY=sk-...
EXPLANATION_PROVIDER=openai
OPENAI_MODEL=gpt-5-nano
```

요청에 `ai=true`를 붙이면 추천 순위와 점수는 그대로 두고, 제공된 지표만 근거로 설명 문장을 생성합니다.

```bash
curl "http://localhost:4000/api/recommendations?time=evening&limit=5&ai=true"
```

OpenAI 호출이 실패하거나 API 키가 없으면 자동으로 rule-based 설명으로 fallback합니다. 로컬에서 Ollama를 다시 쓰고 싶으면 `EXPLANATION_PROVIDER=ollama`로 바꿀 수 있습니다.
