# 황금을 찾아라 (Find the Gold)

> 유동인구가 아닌 **실제 구매 전환**으로 찾는 MZ 카페 상권 추천 서비스

서울시 공공데이터(유동인구 · 추정매출)를 기반으로, **2030세대 대상 카페 창업자**가
원하는 운영 시간대에 실제 카페 구매 전환이 높은 **행정동(administrative district)** 을
추천하는 상권 추천 서비스입니다. 단순히 유동인구가 많은 지역이 아니라, **유동인구 대비
실제 카페 구매가 활발한 지역**을 점수화해 추천하는 것이 핵심 차별점입니다.

> 이 문서는 현재 git branch(`taehyeong`)의 **실제 코드**를 기준으로 작성되었습니다.
> 프로젝트의 상세 기획·요구사항은 [`CODEX_DEV_BRIEF_황금을찾아라.md`](./CODEX_DEV_BRIEF_황금을찾아라.md)
> 에 정리되어 있으며, 일부 항목은 브리프(기획)와 현재 구현이 다릅니다(아래 본문에서 명시).

---

## 1. 프로젝트 개요

- **타겟 / 업종 (MVP 고정값):** 2030세대 / 커피·음료
- **추천 단위:** 서울시 행정동
- **사용자 입력:** 희망 운영 시간대 (새벽 / 오전 / 점심 / 오후 / 저녁 / 심야)
- **출력:** 추천 행정동 순위, 추천점수(0~100), 핵심 지표, 추천 사유, 행정동 비교

서비스는 세 개의 독립 파트로 구성됩니다.

| 파트 | 위치 | 역할 |
|------|------|------|
| **데이터 분석** | `data_analysis/` | 원천 CSV → 전처리 → 최종 추천용 feature 데이터셋(`cafe_area_features.csv`) 생성 (Python) |
| **백엔드 API** | `backend/` | 최종 CSV를 메모리에 로드해 추천·검색·비교·설명 API 제공 (Node.js) |
| **프론트엔드** | `frontend/` | 시간대 선택, 추천 카드, 상세/비교 화면 제공 (React via CDN) |

---

## 2. 기술 스택

코드·설정 파일에서 **실제로 확인된** 내용만 기술합니다.

### 백엔드 (`backend/`)
- **런타임:** Node.js (CommonJS). `engines` 필드가 없어 최소 버전은 미지정 — **[확인 필요]**
- **HTTP 서버:** Node 내장 `http` 모듈 사용 (`src/server.js`)
- **외부 의존성:** `package.json`에는 `express ^5.2.1`이 선언되어 있으나, **현재 서버 코드는 Express를 import/사용하지 않고 native `http`로 직접 구현**되어 있습니다. (express는 선언만 되어 있는 미사용 의존성)
- **CSV 파싱:** 외부 라이브러리 없이 `dataStore.js`에 자체 구현
- **AI 설명(선택):** 로컬 LLM(Ollama HTTP API) 연동, 실패 시 규칙 기반(rule-based) 설명으로 fallback
- **DB:** 사용하지 않음 (CSV in-memory)

### 프론트엔드 (`frontend/`)
- **정적 서버:** Node 내장 `http` 모듈로 `public/` 정적 파일 서빙 (`server.js`)
- **UI:** **React 18** — 빌드 도구 없이 `index.html`에서 **CDN(unpkg) UMD 번들**을 로드하고, `app.js`는 JSX 없이 `React.createElement`로 작성됨
- **npm 의존성:** 없음 (`package.json`에 `dependencies` 없음)
- **스타일:** 순수 CSS (Grid/Flexbox 반응형, 모바일 breakpoint 920px)

### 데이터 분석 (`data_analysis/`)
- **언어:** Python 3 (`__pycache__`의 `cpython-314` 캐시로 보아 개발 환경은 CPython 3.14)
- **라이브러리:** `pandas`, `numpy` (전처리 스크립트), `matplotlib`, `scikit-learn`(MinMaxScaler) (노트북)
- **버전 고정:** `requirements.txt` / `pyproject.toml` 등이 없어 정확한 라이브러리 버전은 **[확인 필요]**

---

## 3. 디렉토리 구조

```
T_sum/
├── CODEX_DEV_BRIEF_황금을찾아라.md   # 프로젝트 기획 브리프(스펙·요구사항)
│
├── backend/                          # Node.js 추천 API 서버
│   ├── package.json                  # start/dev 스크립트, express(미사용) 선언
│   ├── .env.example                  # 환경변수 템플릿
│   ├── README.md                     # 백엔드 개별 문서
│   └── src/
│       ├── server.js                 # HTTP 서버 진입점(native http), 라우팅
│       ├── dataStore.js              # CSV 로드·정규화·추천점수·검색·비교 로직
│       └── aiReason.service.js       # 규칙 기반 설명 + 로컬 LLM(Ollama) 연동·fallback
│
├── frontend/                         # 정적 서버 + React(CDN) SPA
│   ├── package.json                  # start 스크립트(node server.js)
│   ├── .env.example                  # VITE_API_BASE_URL 템플릿(현재 미사용)
│   ├── README.md                     # 프론트엔드 개별 문서
│   ├── server.js                     # public/ 정적 파일 서버(native http)
│   └── public/
│       ├── index.html                # React 18 UMD(CDN) + app.js/styles.css 로드
│       ├── app.js                    # React.createElement 기반 SPA, API 호출
│       └── styles.css                # 골드/그린 팔레트, 반응형 스타일
│
├── data_analysis/                    # Python 전처리 파이프라인
│   ├── data/
│   │   ├── raw/
│   │   │   ├── 유동인구.csv          # 원천: 행정동·시간대별 유동인구
│   │   │   └── 추정매출.csv          # 원천: 업종별 추정매출
│   │   └── processed/
│   │       ├── pop.py                # 유동인구 → 2030 유동인구 피처
│   │       ├── sales.py              # 카페 매출 → 시간대·2030 매출 피처
│   │       ├── process.py            # 병합 + 추천점수 계산 → 최종 CSV (오케스트레이터)
│   │       ├── pop_2030_features.csv     # 중간 산출물
│   │       ├── cafe_sales_features.csv   # 중간 산출물
│   │       └── cafe_area_features.csv    # ★ 백엔드가 사용하는 최종 데이터셋
│   └── jupyter_practice/
│       └── analysis.ipynb            # 탐색적 분석(EDA) 노트북
│
├── step.ipynb                        # (탐색용) 유동인구·추정매출 로드 → 커피-음료 매출 중심 EDA
├── Test.ipynb                        # (탐색용) 유동인구 CSV 로드 → 유동인구 EDA(예: 역삼1동 시계열)
├── people.py                         # (탐색용) 유동인구 처리 함수 make_pop_data()
└── money.py                          # 빈 스텁 파일(내용 없음)
```

> 루트의 `step.ipynb`, `Test.ipynb`, `people.py`는 탐색/연습용이며, **실제 데이터 파이프라인은
> `data_analysis/data/processed/`의 `pop.py → sales.py → process.py`** 입니다.
> `money.py`는 현재 내용이 없는 빈 파일입니다.

---

## 4. 데이터 파이프라인 (`data_analysis/`)

원천 CSV를 전처리해 백엔드가 사용하는 최종 데이터셋을 만듭니다. **최종 산출물
`cafe_area_features.csv`는 이미 저장소에 포함되어 있어, 백엔드를 바로 실행할 수 있습니다.**

| 스크립트 | 입력 | 출력 | 주요 처리 |
|----------|------|------|-----------|
| `pop.py` | `../raw/유동인구.csv` | `pop_2030_features.csv` | 2025년 1~4분기 필터, 행정동별 평균 유동인구, `2030_유동인구`·`2030_유동인구비율` 계산 |
| `sales.py` | `../raw/추정매출.csv` | `cafe_sales_features.csv` | `커피-음료` 업종·2025년 필터, 시간대별 매출비중, `2030_매출비율`, `객단가`, 피크타임 산출 |
| `process.py` | 위 두 스크립트 결과 | `cafe_area_features.csv` | 유동인구·매출 피처 병합, `카페전환효율`·`MZ카페_추천점수` 계산 |

`process.py`는 내부에서 `pop.build_pop_features()`와 `sales.build_cafe_sales_features()`를
호출하므로, **`process.py` 하나만 실행해도 전체 파이프라인이 재생성**됩니다.

재생성이 필요할 때만 실행하면 됩니다.

```bash
# pandas, numpy 설치 필요 (버전 미지정)
pip install pandas numpy

cd data_analysis/data/processed
python process.py        # pop/sales를 내부 호출 → cafe_area_features.csv 생성
```

> 원천 CSV는 `cp949` 인코딩으로 읽고, 산출 CSV는 `utf-8-sig`로 저장됩니다(스크립트 내 하드코딩).
> 데이터 기간·업종 등 설정값은 각 스크립트 상단 상수(`TARGET_QUARTERS`, `CAFE_SERVICE_NAME` 등)에
> 하드코딩되어 있으며, CLI 인자나 환경변수는 사용하지 않습니다.

---

## 5. 설치 및 실행 방법

백엔드(포트 4000)와 프론트엔드(포트 3000)를 각각 실행합니다. 프론트엔드 `app.js`는 API 주소를
`http://localhost:4000/api`로 **하드코딩**하고 있으므로, 백엔드를 4000 포트로 띄워야 정상 동작합니다.

### 5.1 백엔드 실행

```bash
cd backend
npm install              # express가 설치되지만 현재 코드에서는 사용되지 않음
npm start                # node src/server.js → http://localhost:4000
# 개발 모드(파일 변경 감지):
npm run dev              # node --watch src/server.js
```

- 서버는 시작 시 `cafe_area_features.csv`를 메모리에 로드합니다. **파일이 없으면 시작 시 에러를 던집니다.**
- 데이터 경로 기본값은 `backend/src/` 기준 `../../data_analysis/data/processed/cafe_area_features.csv`
  이므로, **`backend/` 디렉토리에서 실행**하면 저장소에 포함된 CSV를 그대로 사용합니다.

동작 확인:

```bash
curl http://localhost:4000/api/health
curl "http://localhost:4000/api/recommendations?time=저녁&limit=10"
```

### 5.2 프론트엔드 실행

```bash
cd frontend
npm start                # node server.js → http://localhost:3000
```

- `npm install`이 필요 없습니다(의존성 없음, React는 CDN 로드).
- 브라우저에서 `http://localhost:3000` 접속.
- React UMD 번들을 **외부 CDN(unpkg)** 에서 받으므로, **인터넷 연결이 필요**합니다.

### 5.3 (선택) 로컬 LLM AI 설명 사용

AI 자연어 설명은 선택 기능입니다. 사용하지 않으면 규칙 기반 설명이 반환됩니다.

```bash
# 1) Ollama 등 로컬 LLM 서버 실행 후 모델 준비 (기본값: llama3.1)
# 2) 백엔드 실행 시 환경변수 설정
EXPLANATION_MODE=local-llm LOCAL_LLM_MODEL=llama3.1 npm start   # backend/

# 3) 요청 시 ai=true 파라미터로 호출
curl "http://localhost:4000/api/recommendations?time=저녁&ai=true"
```

> LLM 호출이 실패하면 자동으로 규칙 기반 설명으로 fallback합니다. LLM은 **설명만** 담당하며
> 추천 순위·점수를 직접 만들지 않습니다(점수는 항상 알고리즘이 계산).

---

## 6. 환경 변수 / 설정

> ⚠️ 백엔드·프론트엔드 코드에는 `dotenv` 로딩이 없습니다. 따라서 `.env.example`의 값은
> **셸 환경변수로 직접 지정**하거나 Node의 `--env-file` 옵션으로 로드해야 적용되며,
> 지정하지 않으면 코드의 기본값이 사용됩니다.

### 백엔드 `backend/.env.example`

| 변수 | 기본값(.env.example) | 코드 기본값 | 설명 |
|------|----------------------|-------------|------|
| `PORT` | `4000` | `4000` | API 서버 포트 |
| `DATA_PATH` | `../data_analysis/data/processed/cafe_area_features.csv` | `../../data_analysis/data/processed/cafe_area_features.csv` (`src/` 기준) | 추천용 CSV 경로 |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | — | **현재 미사용.** CORS는 코드에서 `*`로 하드코딩됨 |
| `EXPLANATION_MODE` | `rule` | `rule` | 설명 모드(`rule` / `local-llm`) |
| `LOCAL_LLM_PROVIDER` | `ollama` | `ollama` | 로컬 LLM 제공자 |
| `LOCAL_LLM_URL` | `http://localhost:11434/api/generate` | — | 로컬 LLM 엔드포인트 |
| `LOCAL_LLM_MODEL` | `llama3.1` | — | 로컬 LLM 모델명 |

### 프론트엔드 `frontend/.env.example`

| 변수 | 값 | 설명 |
|------|----|------|
| `VITE_API_BASE_URL` | `http://localhost:4000/api` | **현재 미사용.** 정적 서버는 이 값을 주입하지 않으며, `public/app.js`가 동일 URL을 **하드코딩**하고 있음 (Vite 도입을 가정했던 잔재로 추정 — **[확인 필요]**) |

> 참고: `frontend/.env.example`에는 `VITE_API_BASE_URL`만 들어 있습니다. `PORT`는 이 파일에 없지만
> `frontend/server.js`가 `process.env.PORT`(기본 3000)를 읽으므로, 셸에서 `PORT`를 지정하면 적용됩니다.

---

## 7. 백엔드 API 명세

모든 응답은 `application/json; charset=utf-8`이며, CORS 헤더(`Access-Control-Allow-Origin: *`)가
포함됩니다. `GET` 외 메서드는 405를 반환합니다.

시간대 파라미터(`time`)는 **영문 value / 한글 label / 시간 range** 중 어느 것으로도 지정할 수 있습니다.

| value | label | range |
|-------|-------|-------|
| `dawn` | 새벽 | `00~06` |
| `morning` | 오전 | `06~11` |
| `lunch` | 점심 | `11~14` |
| `afternoon` | 오후 | `14~17` |
| `evening` | 저녁 | `17~21` |
| `night` | 심야 | `21~24` |

| 메서드 · 경로 | 설명 | 주요 쿼리 |
|---------------|------|-----------|
| `GET /api/health` (또는 `/`, `/health`) | 헬스 체크 → `{ "status": "ok" }` | — |
| `GET /api/meta` | 서비스 메타(업종·타겟·시간대·점수 가중치·LLM 설정·데이터 건수) | — |
| `GET /api/recommendations` | 추천 행정동 목록 | `time`(기본 evening), `limit`(기본 10, 1~50), `ai`(true 시 LLM 설명) |
| `GET /api/areas` | 행정동 검색(코드/이름) | `query`(또는 `keyword`), `limit`(기본 20, 1~100) |
| `GET /api/areas/:areaCode` | 행정동 상세(지표·시간대별 매출비중·사유·전략) | `time`, `ai` |
| `GET /api/compare` | 두 행정동 비교 | `areaA`, `areaB`(필수), `time` |

오류 처리:
- 추천(`/api/recommendations`)에서 **잘못된 시간대 → `400`**
- 상세(`/api/areas/:areaCode`)·비교(`/api/compare`)에서는 잘못된 시간대 또는 대상 미존재 시 **`404`** (해당 라우트는 시간대를 별도 400으로 구분하지 않음)
- 비교에서 `areaA`/`areaB` 누락 → `400`
- `GET` 외 메서드 → `405`, 알 수 없는 경로 → `404`, 서버 처리 실패 → `500`

응답 값에 `NaN`/`Infinity`는 포함하지 않고 `null` 또는 `0`으로 처리합니다.

예시:

```bash
curl http://localhost:4000/api/meta
curl "http://localhost:4000/api/recommendations?time=오전&limit=10"
curl "http://localhost:4000/api/areas?query=성수"
curl "http://localhost:4000/api/areas/11200114?time=저녁"
curl "http://localhost:4000/api/compare?areaA=11200114&areaB=11440124&time=저녁"
```

---

## 8. 추천 점수 로직

추천점수는 **CSV 데이터 기반으로 API 호출 시 동적으로 계산**됩니다(하드코딩된 가짜 결과 없음).
각 지표를 전체 행정동 대상 **Min-Max 정규화(0~1)** 한 뒤 가중합하고, `×100`(소수 1자리)으로 표시합니다.

```
추천점수 =  카페전환효율(cafeConversionRate)      × 0.35
          + 2030 매출비율(mzSalesRatio)           × 0.30
          + 선택시간대 매출비중(selectedTime…)    × 0.25
          + 객단가(averageOrderValue)             × 0.10
```

(가중치 출처: `backend/src/dataStore.js`의 `SCORE_WEIGHTS`)

**추천 사유**는 `aiReason.service.js`의 규칙 기반 함수가 생성합니다(예: 카페전환효율이 상위
25%이면 "구매 전환효율이 높다", 2030 매출비율이 평균 이상이면 "MZ 타겟에 적합" 등). 최소 2개,
선택 시 로컬 LLM이 자연어 설명을 추가로 생성할 수 있습니다.

---

## 9. 주요 기능

- **시간대별 추천:** 6개 운영 시간대 선택에 따라 추천점수·순위가 동적으로 바뀜
- **Top N 추천 목록:** 추천점수, 핵심 지표(2030 매출비율·카페전환효율·선택시간대 매출비중·객단가), 추천 사유 카드 제공
- **행정동 상세:** 총 매출·유동인구, 시간대별 매출비중, 점수 분해(scoreBreakdown), 운영 전략 가이드
- **행정동 비교:** 두 행정동의 핵심 지표·추천점수 비교 및 요약 문장
- **데이터 기반 설명:** 규칙 기반 설명 + (선택) 로컬 LLM 자연어 설명
- **반응형 UI:** 골드/그린 톤, 모바일에서 카드 단일 열 정렬

---

## 10. 프론트엔드 ↔ 백엔드 연동

- 프론트엔드(`public/app.js`)는 `API_BASE_URL = "http://localhost:4000/api"`로 백엔드를 호출합니다.
- 사용 엔드포인트: `/recommendations`, `/areas/:areaCode`, `/compare` (`fetch` 사용).
- 따라서 **백엔드(4000)를 먼저 실행**한 뒤 프론트엔드(3000)에 접속해야 추천 결과가 표시됩니다.

---

## 11. 참고 / 확인 필요 항목

코드에서 단정하기 어려운 부분은 아래에 정리했습니다.

- **[확인 필요]** Node.js·Python·각 라이브러리의 정확한 버전(`engines`/`requirements.txt` 부재)
- **[확인 필요]** `express`(backend)·`VITE_API_BASE_URL`(frontend)는 선언/정의만 있고 현재 코드에서 미사용 — 향후 도입 예정인지 잔재인지 불명확
- **[확인 필요]** 원천 데이터(`유동인구.csv`, `추정매출.csv`)의 정확한 출처·라이선스(컬럼명상 서울시 공공/상권 통계로 추정)
- **[확인 필요]** 노트북(`analysis.ipynb`)은 `MinMaxScaler`를, 스크립트(`process.py`)는 자체 `minmax_score()`를 사용 — 정규화 방식의 일관성
- 본 README는 현재 branch(`taehyeong`)의 코드 기준입니다. 다른 branch에는 차이가 있을 수 있습니다.
