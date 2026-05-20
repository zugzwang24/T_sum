from pathlib import Path

import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "raw"
PROCESSED_DIR = BASE_DIR / "processed"

SALES_INPUT = RAW_DIR / "추정매출.csv"
SALES_OUTPUT = PROCESSED_DIR / "cafe_sales_features.csv"

CAFE_SERVICE_NAME = "커피-음료"
TARGET_QUARTERS = [20251, 20252, 20253, 20254]

AGE_COUNT_COLS = [
    "연령대_10_매출_건수",
    "연령대_20_매출_건수",
    "연령대_30_매출_건수",
    "연령대_40_매출_건수",
    "연령대_50_매출_건수",
    "연령대_60_이상_매출_건수",
]

TIME_AMOUNT_COLS = [
    "시간대_00~06_매출_금액",
    "시간대_06~11_매출_금액",
    "시간대_11~14_매출_금액",
    "시간대_14~17_매출_금액",
    "시간대_17~21_매출_금액",
    "시간대_21~24_매출_금액",
]

TIME_LABEL_MAP = {
    "새벽": "시간대_00~06_매출_금액",
    "아침": "시간대_06~11_매출_금액",
    "점심": "시간대_11~14_매출_금액",
    "오후": "시간대_14~17_매출_금액",
    "저녁": "시간대_17~21_매출_금액",
    "야간": "시간대_21~24_매출_금액",
}


def safe_divide(numerator, denominator):
    denominator = denominator.replace(0, np.nan)
    return numerator / denominator


def minmax_score(series):
    min_value = series.min()
    max_value = series.max()

    if pd.isna(min_value) or pd.isna(max_value) or min_value == max_value:
        return pd.Series(0.0, index=series.index)

    return (series - min_value) / (max_value - min_value)


def most_common(series):
    mode = series.mode(dropna=True)

    if mode.empty:
        return np.nan

    return mode.iat[0]


def add_row_features(cafe):
    cafe = cafe.copy()

    cafe["2030_매출건수"] = (
        cafe["연령대_20_매출_건수"] +
        cafe["연령대_30_매출_건수"]
    )

    cafe["총매출건수"] = cafe[AGE_COUNT_COLS].sum(axis=1)

    cafe["2030_매출비율"] = safe_divide(
        cafe["2030_매출건수"],
        cafe["총매출건수"]
    )

    cafe["객단가"] = safe_divide(
        cafe["당월_매출_금액"],
        cafe["당월_매출_건수"]
    )

    cafe["피크타임_매출비중"] = safe_divide(
        cafe[TIME_AMOUNT_COLS].max(axis=1),
        cafe["당월_매출_금액"]
    )

    cafe["시간대추천"] = (
        cafe[TIME_AMOUNT_COLS]
        .idxmax(axis=1)
        .str.replace("시간대_", "", regex=False)
        .str.replace("_매출_금액", "", regex=False)
    )

    for time_label, col in TIME_LABEL_MAP.items():
        cafe[f"{time_label}_매출비중"] = safe_divide(
            cafe[col],
            cafe["당월_매출_금액"]
        )

    return cafe


def build_cafe_sales_features(sales_path=SALES_INPUT, output_path=SALES_OUTPUT):
    sales = pd.read_csv(sales_path, encoding="cp949")
    sales["기준_년분기_코드"] = sales["기준_년분기_코드"].astype(int)

    cafe = sales[
        (sales["서비스_업종_코드_명"] == CAFE_SERVICE_NAME)
        & (sales["기준_년분기_코드"].isin(TARGET_QUARTERS))
    ].copy()

    cafe = add_row_features(cafe)

    agg_dict = {
        "당월_매출_금액": ("당월_매출_금액", "sum"),
        "당월_매출_건수": ("당월_매출_건수", "sum"),
        "총매출건수": ("총매출건수", "sum"),
        "2030_매출건수": ("2030_매출건수", "sum"),
        "피크타임_매출비중": ("피크타임_매출비중", "mean"),
        "시간대추천": ("시간대추천", most_common),
    }

    for time_label in TIME_LABEL_MAP:
        agg_dict[f"{time_label}_매출비중"] = (
            f"{time_label}_매출비중",
            "mean"
        )

    grouped = cafe.groupby(
        ["행정동_코드", "행정동_코드_명"],
        as_index=False
    ).agg(**agg_dict)

    grouped["2030_매출비율"] = safe_divide(
        grouped["2030_매출건수"],
        grouped["총매출건수"]
    )

    grouped["객단가"] = safe_divide(
        grouped["당월_매출_금액"],
        grouped["당월_매출_건수"]
    )

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    grouped.to_csv(output_path, index=False, encoding="utf-8-sig")

    return grouped


if __name__ == "__main__":
    df = build_cafe_sales_features()
    print(f"saved {SALES_OUTPUT} ({len(df):,} rows)")