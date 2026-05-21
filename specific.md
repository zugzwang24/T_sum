# 황금을 찾아라 개발 수정·추가·고도화 가이드

> 목적: 현재 구현된 데이터 전처리·추천 로직을 기준으로, 본격적인 백엔드/프론트엔드/AI 개발 전 Codex에게 전달할 수정 사항, 추가 구현 사항, 고도화 방향을 정리한다.  
> 프로젝트 방향: **MZ 카페 창업자를 위한 조건 기반 상권 추천 서비스**  
> 핵심 원칙: **추천점수와 순위는 데이터 기반 알고리즘이 계산하고, 생성형 AI/로컬 LLM은 추천 결과를 자연어로 설명한다.**

---

## 0. 현재 개발 상태 요약

현재 데이터 전처리 구조는 다음과 같다.

```txt
sales.py
→ 추정매출 데이터 전처리
→ 커피·음료 업종 필터링
→ 2030 매출비율, 시간대별 매출비중, 객단가 생성

pop.py
→ 유동인구 데이터 전처리
→ 2030 유동인구, 2030 유동인구비율, 시간대별 유동인구비중 생성

processed.py
→ sales feature와 pop feature 병합
→ 월 유동인구 추정값 계산
→ 카페전환효율 계산
→ 최종 추천용 데이터셋 생성
```

현재 MVP 추천점수 구조는 다음과 같다.

```txt
MZ카페 추천점수 =
    카페전환효율 점수 × 0.35
  + 2030 매출비율 점수 × 0.30
  + 선택시간대 매출비중 점수 × 0.25
  + 객단가 점수 × 0.10
```

현재 서비스 목표는 다음과 같다.

```txt
사용자가 카페 창업 조건과 희망 운영 시간대를 선택하면,
서울시 공공데이터 기반으로 실제 구매 전환이 높은 행정동을 추천하고,
그 이유와 운영 전략을 자연어로 설명한다.
```

---

## 1. 우선 수정해야 할 점

### 1-1. 추천점수 저장 위치 수정

현재 `processed.py`에서 `build_processed_features()`는 `cafe_area_features.csv`를 저장한 뒤, `__main__`에서 `add_final_score()`를 호출한다.

```python
if __name__ == "__main__":
    df = build_processed_features()
    df = add_final_score(df, selected_time="저녁")
    print(f"saved {FINAL_OUTPUT} ({len(df):,} rows)")
```

이 구조에서는 `MZ카페_추천점수`가 메모리의 `df`에는 생기지만, 이미 CSV 저장이 끝난 뒤라서 `cafe_area_features.csv`에는 저장되지 않을 수 있다.

다만 서비스 구조상 추천점수는 사용자가 선택한 시간대에 따라 달라지므로, **CSV에 고정 점수를 저장하기보다는 백엔드에서 동적으로 계산하는 방식**이 더 적절하다.

#### 권장 방향

```txt
cafe_area_features.csv
→ 추천점수 계산에 필요한 feature만 저장
→ 예: 카페전환효율, 2030_매출비율, 객단가, 새벽_매출비중, 오전_매출비중, ...

backend
→ 사용자가 선택한 시간대에 따라 add_final_score() 실행
→ Top N 추천 결과 반환
```

#### Codex 작업 지시

- `processed.py`에서는 최종 feature CSV만 생성한다.
- `MZ카페_추천점수`, `선택시간대_매출비중`, `추천순위`는 백엔드 추천 API에서 동적으로 계산한다.
- 테스트 목적으로만 `selected_time="저녁"` 기본값을 사용할 수 있다.

---

### 1-2. `2030` 고정 구조를 일반화해야 함

현재 MVP는 2030 타겟 카페 추천이지만, 서비스화하려면 사용자가 연령 타겟층을 선택할 수 있어야 한다.

현재처럼 `2030_매출비율`, `2030_유동인구`만 만들면 나중에 다음 기능 확장이 어렵다.

```txt
20대 타겟
30대 타겟
40대 타겟
2030 타겟
4050 타겟
전체 연령
```

#### 권장 방향

전처리 단계에서는 모든 연령대별 매출·유동인구 컬럼을 유지한다.

```txt
연령대_10_매출_건수
연령대_20_매출_건수
연령대_30_매출_건수
연령대_40_매출_건수
연령대_50_매출_건수
연령대_60_이상_매출_건수

연령대_10_유동인구_수
연령대_20_유동인구_수
연령대_30_유동인구_수
연령대_40_유동인구_수
연령대_50_유동인구_수
연령대_60_이상_유동인구_수
```

백엔드에서 사용자가 선택한 연령대에 따라 동적으로 합산한다.

```js
// 예시: 사용자가 20대 + 30대를 선택한 경우
const selectedAges = ["20", "30"];

const targetSalesCount =
  row["연령대_20_매출_건수"] + row["연령대_30_매출_건수"];

const targetPopulation =
  row["연령대_20_유동인구_수"] + row["연령대_30_유동인구_수"];
```

#### Codex 작업 지시

- `sales.py`에서 연령대별 매출건수/매출금액 컬럼을 최종 feature CSV에 포함한다.
- `pop.py`에서 연령대별 유동인구 컬럼을 최종 feature CSV에 포함한다.
- 백엔드에서 `targetAges` 쿼리 파라미터를 받아 타겟 매출비율과 타겟 유동인구비율을 동적으로 계산한다.
- MVP 기본값은 `targetAges=20,30`으로 둔다.

---

### 1-3. 업종 하드코딩 제거

현재는 `커피-음료` 업종이 고정되어 있다.

```python
CAFE_SERVICE_NAME = "커피-음료"
```

MVP에서는 괜찮지만, 서비스 확장성을 고려하면 업종명을 파라미터로 받는 구조가 필요하다.

#### 권장 방향

```python
def build_sales_features(industry_name="커피-음료"):
    sales = pd.read_csv(SALES_INPUT, encoding="cp949")
    filtered = sales[sales["서비스_업종_코드_명"] == industry_name].copy()
    ...
```

#### Codex 작업 지시

- 데이터 전처리 함수에서 업종명을 인자로 받도록 수정한다.
- 백엔드 추천 API에서도 `industry` 값을 받을 수 있게 한다.
- MVP 기본값은 `industry=커피-음료`로 둔다.
- 현재는 카페에 맞는 가중치를 사용하되, 향후 업종별 가중치 설정 파일을 만들 수 있도록 구조를 열어둔다.

---

### 1-4. 시간대 컬럼명을 한글 기준으로 통일

현재 서비스 UI는 한글 시간대를 사용할 예정이다.

```txt
새벽: 00~06
오전: 06~11
점심: 11~14
오후: 14~17
저녁: 17~21
심야: 21~24
```

전처리와 백엔드에서 동일한 이름을 사용해야 프론트엔드 연동이 쉬워진다.

#### 권장 매핑

```python
TIME_LABEL_MAP = {
    "새벽": "시간대_00~06_매출_금액",
    "오전": "시간대_06~11_매출_금액",
    "점심": "시간대_11~14_매출_금액",
    "오후": "시간대_14~17_매출_금액",
    "저녁": "시간대_17~21_매출_금액",
    "심야": "시간대_21~24_매출_금액",
}
```

생성 컬럼 예시:

```txt
새벽_매출비중
오전_매출비중
점심_매출비중
오후_매출비중
저녁_매출비중
심야_매출비중

새벽_유동인구비중
오전_유동인구비중
점심_유동인구비중
오후_유동인구비중
저녁_유동인구비중
심야_유동인구비중
```

---

## 2. 추가해야 할 점

### 2-1. 선택시간대 유동인구비중 추가 검토

현재 추천점수에는 `선택시간대_매출비중`은 들어가지만, `선택시간대_유동인구비중`은 들어가지 않는다.

현재 점수식:

```txt
카페전환효율 0.35
2030 매출비율 0.30
선택시간대 매출비중 0.25
객단가 0.10
```

이 구조는 매출 중심이라 설명이 쉽다. 그러나 사용자의 희망 시간대에 실제 유동인구가 있는지도 함께 보여주면 결과 설명이 더 좋아진다.

#### 권장 방향

MVP 점수에는 넣지 않아도 되지만, 결과 카드에는 보조 지표로 표시한다.

```txt
선택시간대 매출비중: 추천점수 반영
선택시간대 유동인구비중: 설명/운영전략 보조 지표
```

고도화 점수식 예시:

```txt
카페전환효율 0.30
타겟 매출비율 0.25
선택시간대 매출비중 0.25
선택시간대 유동인구비중 0.10
객단가 0.10
```

---

### 2-2. 극단값 처리 추가

`카페전환효율`은 분모가 작거나 특정 지역의 매출건수가 높으면 값이 튈 수 있다.

#### 권장 처리

1. `log1p` 적용
2. 상·하위 분위수 clipping
3. 결측치/무한대 처리

```python
def winsorize_series(series, lower=0.01, upper=0.99):
    low = series.quantile(lower)
    high = series.quantile(upper)
    return series.clip(low, high)

final["카페전환효율_보정"] = winsorize_series(final["카페전환효율"])
final["카페전환효율_log"] = np.log1p(final["카페전환효율_보정"])
```

#### Codex 작업 지시

- 추천점수 계산 전 `카페전환효율`, `객단가`에 대해 이상치 완화 옵션을 추가한다.
- 기본 MVP에서는 원본값 기반 점수를 사용하되, 추후 `useAdjustedScore=true` 옵션으로 보정 점수를 테스트할 수 있게 한다.

---

### 2-3. 추천 결과 검증 로직 추가

현재 추천 결과는 규칙 기반 가중합이다. 따라서 모델 신뢰도를 높이려면 결과 검증용 스크립트가 필요하다.

#### 검증 항목

```txt
1. Top 10 지역 확인
2. Bottom 10 지역 확인
3. 시간대별 추천 결과 차이 확인
4. 가중치 변경 시 Top 10 변화 확인
5. 특정 지표 하나 때문에 점수가 과도하게 튀는 지역 확인
6. 결측치가 많은 행정동 제외 여부 확인
```

#### Codex 작업 지시

`analysis/validate_recommendation.py` 또는 백엔드 테스트 스크립트를 만든다.

출력 예시:

```txt
[저녁 추천 Top 10]
1. 성수동 - 0.87
2. 연남동 - 0.82
...

[오전 추천 Top 10]
1. 역삼동 - 0.79
2. 종로1가 - 0.75
...

[가중치 민감도]
기본 가중치 Top 10과 대체 가중치 Top 10의 겹치는 지역 수: 7개
```

---

### 2-4. 추천 이유 rule-based fallback 추가

로컬 LLM이 실패하거나 응답이 느릴 때도 서비스가 동작해야 한다.

#### 권장 구조

```txt
AI 설명 요청
→ Ollama 호출 성공: LLM 설명 반환
→ Ollama 호출 실패: rule-based template 설명 반환
```

템플릿 예시:

```js
function buildFallbackReason(row, selectedTime) {
  return `${row.행정동_코드_명}은 ${selectedTime} 시간대 매출비중과 2030 매출비율을 기준으로 추천된 지역입니다. ` +
    `카페전환효율이 높아 유동인구 대비 실제 카페 구매가 활발한 상권으로 해석할 수 있습니다.`;
}
```

---

## 3. 백엔드 개발 요구사항

### 3-1. 기본 구조

```txt
backend/
├── src/
│   ├── app.js
│   ├── routes/
│   │   ├── recommend.routes.js
│   │   ├── compare.routes.js
│   │   └── ai.routes.js
│   ├── controllers/
│   │   ├── recommend.controller.js
│   │   ├── compare.controller.js
│   │   └── ai.controller.js
│   ├── services/
│   │   ├── data.service.js
│   │   ├── score.service.js
│   │   ├── recommend.service.js
│   │   ├── ai.service.js
│   │   └── reason.service.js
│   ├── utils/
│   │   ├── normalize.js
│   │   ├── timeMap.js
│   │   └── validateQuery.js
│   └── data/
│       └── cafe_area_features.csv
└── package.json
```

---

### 3-2. 추천 API

#### Endpoint

```txt
GET /api/recommend?time=저녁&targetAges=20,30&industry=커피-음료&limit=10&ai=true
```

#### Query Parameters

```txt
time: 새벽 | 오전 | 점심 | 오후 | 저녁 | 심야

targetAges: 10 | 20 | 30 | 40 | 50 | 60 또는 콤마 조합
예: 20,30

industry: MVP에서는 커피-음료 기본값
limit: 추천 결과 개수, 기본값 10
ai: true일 경우 AI 설명 생성 시도
```

#### Response Example

```json
{
  "selectedTime": "저녁",
  "targetAges": ["20", "30"],
  "industry": "커피-음료",
  "weights": {
    "conversionRate": 0.35,
    "targetSalesRatio": 0.30,
    "selectedTimeSalesRatio": 0.25,
    "averagePrice": 0.10
  },
  "results": [
    {
      "rank": 1,
      "dongCode": 12345678,
      "dongName": "성수동",
      "score": 87.3,
      "metrics": {
        "targetSalesRatio": 0.62,
        "targetPopulationRatio": 0.48,
        "conversionRate": 0.054,
        "selectedTimeSalesRatio": 0.31,
        "selectedTimePopulationRatio": 0.29,
        "averagePrice": 8500,
        "peakTime": "오후"
      },
      "reason": "성수동은 2030세대 매출비율이 높고..."
    }
  ]
}
```

---

### 3-3. 상권 비교 API

#### Endpoint

```txt
GET /api/compare?dongA=성수동&dongB=연남동&time=저녁&targetAges=20,30
```

#### Response Example

```json
{
  "selectedTime": "저녁",
  "targetAges": ["20", "30"],
  "areas": [
    {
      "dongName": "성수동",
      "score": 87.3,
      "metrics": {
        "targetSalesRatio": 0.62,
        "targetPopulationRatio": 0.48,
        "conversionRate": 0.054,
        "selectedTimeSalesRatio": 0.31,
        "averagePrice": 8500
      }
    },
    {
      "dongName": "연남동",
      "score": 82.1,
      "metrics": {
        "targetSalesRatio": 0.58,
        "targetPopulationRatio": 0.51,
        "conversionRate": 0.047,
        "selectedTimeSalesRatio": 0.28,
        "averagePrice": 7900
      }
    }
  ]
}
```

---

## 4. AI / Local LLM 개발 요구사항

### 4-1. LLM의 역할

로컬 LLM은 추천 순위를 계산하지 않는다.

```txt
추천점수 계산: 백엔드 알고리즘 담당
추천 이유 설명: 로컬 LLM 담당
```

LLM은 다음을 하면 안 된다.

```txt
- 추천 순위를 임의로 변경하면 안 됨
- 새로운 수치를 만들어내면 안 됨
- 제공되지 않은 임대료, 경쟁점포, 폐업률을 아는 척하면 안 됨
- 과도하게 확정적인 표현을 쓰면 안 됨
```

LLM은 다음을 해야 한다.

```txt
- 제공된 정량 지표만 근거로 설명
- 예비 창업자가 이해하기 쉬운 문장 생성
- 선택한 시간대와 상권 특성을 연결
- 운영 전략을 조심스럽게 제안
```

---

### 4-2. Ollama 연동 구조

```txt
backend
→ 추천 결과 계산
→ 프롬프트 생성
→ Ollama API 호출
→ 설명문 반환
→ 프론트로 응답
```

개발 환경에서는 Ollama를 사용한다.

```txt
Ollama 서버 기본 주소:
http://localhost:11434
```

백엔드 환경변수 예시:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
AI_ENABLED=true
```

---

### 4-3. AI 설명 API

#### Endpoint

```txt
POST /api/ai/explain
```

#### Request

```json
{
  "dongName": "성수동",
  "selectedTime": "저녁",
  "score": 87.3,
  "metrics": {
    "targetSalesRatio": 0.62,
    "conversionRate": 0.054,
    "selectedTimeSalesRatio": 0.31,
    "averagePrice": 8500,
    "peakTime": "오후"
  }
}
```

#### Response

```json
{
  "reason": "성수동은 2030세대 매출비율이 높고, 저녁 시간대 카페 매출비중도 높은 지역입니다...",
  "source": "ollama"
}
```

Fallback 응답:

```json
{
  "reason": "성수동은 2030세대 매출비율과 저녁 시간대 매출비중을 기준으로 추천된 지역입니다...",
  "source": "fallback"
}
```

---

### 4-4. 프롬프트 예시

```txt
너는 예비 창업자를 위한 상권분석 설명 도우미다.
아래 데이터는 서울시 공공데이터 기반 추천 알고리즘이 계산한 결과다.

중요한 규칙:
1. 새로운 수치를 만들지 마라.
2. 제공된 지표만 근거로 설명해라.
3. 추천 순위를 바꾸지 마라.
4. 임대료, 경쟁점포, 폐업률 등 제공되지 않은 정보는 언급하지 마라.
5. 예비 창업자가 이해하기 쉬운 한국어로 3~5문장 작성해라.

행정동: {dongName}
선택 시간대: {selectedTime}
추천점수: {score}
타겟 매출비율: {targetSalesRatio}
카페전환효율: {conversionRate}
선택시간대 매출비중: {selectedTimeSalesRatio}
객단가: {averagePrice}
피크타임: {peakTime}

출력 형식:
- 추천 이유
- 시간대 적합성
- 운영 전략 제안
```

---

## 5. 프론트엔드 개발 요구사항

### 5-1. 기본 화면 구조

```txt
frontend/
├── src/
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Recommend.jsx
│   │   ├── Result.jsx
│   │   └── Compare.jsx
│   ├── components/
│   │   ├── TimeSelector.jsx
│   │   ├── TargetAgeSelector.jsx
│   │   ├── IndustrySelector.jsx
│   │   ├── ResultCard.jsx
│   │   ├── MetricBadge.jsx
│   │   ├── ReasonBox.jsx
│   │   └── CompareTable.jsx
│   ├── api/
│   │   ├── recommendApi.js
│   │   ├── compareApi.js
│   │   └── aiApi.js
│   └── App.jsx
└── package.json
```

---

### 5-2. 사용자 입력 화면

MVP 입력값:

```txt
업종: 커피·음료, 기본 선택
타겟: 2030세대, 기본 선택
희망 운영 시간대: 새벽 / 오전 / 점심 / 오후 / 저녁 / 심야
```

시간대 선택 시 설명을 함께 표시한다.

```txt
새벽: 00~06
오전: 06~11
점심: 11~14
오후: 14~17
저녁: 17~21
심야: 21~24
```

---

### 5-3. 추천 결과 화면

추천 결과 카드는 다음 정보를 보여준다.

```txt
순위
행정동명
추천점수
AI 추천 이유
핵심 지표
- 카페전환효율
- 타겟 매출비율
- 선택시간대 매출비중
- 객단가
- 피크타임
```

CTA 예시:

```txt
상세 보기
비교에 추가
AI 설명 다시 생성
```

---

### 5-4. 상권 비교 화면

두 행정동을 선택해 비교한다.

비교 항목:

```txt
추천점수
타겟 매출비율
타겟 유동인구비율
카페전환효율
선택시간대 매출비중
선택시간대 유동인구비중
객단가
피크타임
```

---

## 6. 추천 로직 고도화 방향

### 6-1. 업종별 가중치 분리

카페와 치킨, 편의점은 중요한 지표가 다르다.

예시:

```js
const WEIGHT_PRESETS = {
  "커피-음료": {
    conversionRate: 0.35,
    targetSalesRatio: 0.30,
    selectedTimeSalesRatio: 0.25,
    averagePrice: 0.10,
  },
  "치킨": {
    conversionRate: 0.30,
    selectedTimeSalesRatio: 0.35,
    targetSalesRatio: 0.15,
    averagePrice: 0.20,
  },
  "편의점": {
    selectedTimePopulationRatio: 0.30,
    conversionRate: 0.30,
    selectedTimeSalesRatio: 0.25,
    targetPopulationRatio: 0.15,
  },
};
```

---

### 6-2. 코사인 유사도는 고도화 단계에서 검토

현재 숫자형 지표 기반 추천에는 가중합 방식이 적절하다.

코사인 유사도는 다음 상황에서 활용 가능하다.

```txt
- 이상적인 상권 벡터와 실제 행정동 벡터의 유사도 계산
- 상권 유형 유사도 분석
- RAG에서 사용자 질문과 데이터 설명 문서의 유사도 검색
```

MVP에서는 가중합 방식을 유지한다.

---

### 6-3. RAG 기반 상권 질의응답

향후 사용자가 다음처럼 질문할 수 있게 한다.

```txt
왜 이 지역이 저녁형 카페에 적합한가요?
성수동과 연남동 중 어디가 더 적합한가요?
오전 장사 위주 카페는 어느 지역이 좋나요?
```

구조:

```txt
사용자 질문
→ 관련 행정동/지표 검색
→ LLM 프롬프트 생성
→ 데이터 기반 답변
```

---

### 6-4. 외부 데이터 추가

현재 데이터만으로는 최종 수익성을 판단하기 어렵다.

향후 추가하면 좋은 데이터:

```txt
임대료 데이터
점포 수 데이터
폐업률 데이터
경쟁 점포 밀도
상가 면적/권리금 데이터
배달 매출 데이터
1인 가구 데이터
대중교통 승하차 데이터
```

현재 MVP에서는 이 데이터들이 없으므로 AI 설명에서 언급하지 않도록 한다.

---

## 7. 개발 우선순위

### Phase 1. MVP 추천 서비스 완성

```txt
1. cafe_area_features.csv 생성 확인
2. 백엔드에서 CSV 로드
3. 시간대 기반 추천점수 계산
4. 추천 Top 10 API 구현
5. 프론트에서 시간대 선택 후 추천 결과 출력
6. rule-based 추천 이유 출력
```

### Phase 2. 로컬 LLM 설명 기능 추가

```txt
1. Ollama 실행
2. 백엔드 ai.service.js 구현
3. 추천 결과 → 프롬프트 변환
4. LLM 설명 반환
5. 실패 시 fallback 설명 반환
```

### Phase 3. 사용자 선택 확장

```txt
1. targetAges 선택 기능
2. 모든 연령대 feature 기반 동적 계산
3. 업종 선택 구조 추가
4. 업종별 가중치 프리셋 추가
```

### Phase 4. 고도화

```txt
1. 상권 비교 기능
2. 운영 전략 가이드
3. RAG 질의응답
4. 상권 유형 분류
5. 임대료/경쟁점포/폐업률 등 외부 데이터 결합
```

---

## 8. Codex에게 반드시 지시해야 할 핵심 원칙

```txt
1. 추천 순위는 LLM이 아니라 데이터 기반 알고리즘이 계산한다.
2. LLM은 추천 결과를 자연어로 설명하는 역할만 한다.
3. 사용자가 지역을 필수로 선택하게 만들지 않는다. 지역은 추천 결과로 제공한다.
4. MVP 기본값은 업종=커피·음료, 타겟=2030세대다.
5. 시간대는 사용자가 반드시 선택할 수 있어야 한다.
6. 추천점수는 선택한 시간대에 따라 동적으로 달라져야 한다.
7. CSV에는 고정 추천점수보다 feature 값을 저장한다.
8. 백엔드에서 선택 조건에 따라 추천점수를 계산한다.
9. 로컬 LLM이 실패해도 fallback 설명으로 서비스가 계속 동작해야 한다.
10. 제공되지 않은 데이터, 예를 들어 임대료·경쟁점포·폐업률은 AI가 단정적으로 말하지 않게 한다.
```

---

## 9. 최종 개발 목표

최종적으로 사용자가 다음처럼 입력하면,

```txt
업종: 커피·음료
타겟: 2030세대
희망 시간대: 저녁
```

서비스는 다음 결과를 제공해야 한다.

```txt
1. 추천 행정동 Top 10
2. 추천점수
3. 카페전환효율
4. 타겟 매출비율
5. 선택시간대 매출비중
6. 객단가
7. AI 추천 이유
8. 운영 전략 가이드
9. 후보 지역 비교
```

핵심 메시지는 다음과 같다.

```txt
유동인구가 많은 곳이 아니라,
내 업종과 시간대에 실제로 돈이 도는 상권을 추천한다.
```
