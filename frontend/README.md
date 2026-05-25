# 황금을 찾아라 Frontend

카페 상권 추천 MVP용 React 화면입니다.

## 실행

백엔드:

```bash
cd backend
npm start
```

프론트엔드:

```bash
cd frontend
npm start
```

브라우저:

```txt
http://localhost:3000
```

## 주요 흐름

1. 희망 운영 시간대를 선택합니다.
2. 추천 상권 TOP 10을 확인합니다.
3. 추천 사유와 상세 지표를 확인합니다.
4. 후보 상권 2개를 비교합니다.
5. 필요하면 GPT-5 nano 설명 토글을 켭니다.

프론트는 다음 백엔드 API를 호출합니다.

```txt
http://localhost:4000/api
```
