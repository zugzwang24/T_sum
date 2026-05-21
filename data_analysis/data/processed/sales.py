from pathlib import Path

import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "raw"
PROCESSED_DIR = BASE_DIR / "processed"

SALES_INPUT = RAW_DIR / "추정매출.csv"
SALES_OUTPUT = PROCESSED_DIR / "cafe_sales_features.csv"

DEFAULT_INDUSTRY_NAME = "커피-음료"
TARGET_QUARTERS = [20251, 20252, 20253, 20254]

AGE_COUNT_COLS = [
    "연령대_10_매출_건수",
    "연령대_20_매출_건수",
    "연령대_30_매출_건수",
    "연령대_40_매출_건수",
    "연령대_50_매출_건수",
    "연령대_60_이상_매출_건수",
]

AGE_AMOUNT_COLS = [
    "연령대_10_매출_금액",
    "연령대_20_매출_금액",
    "연령대_30_매출_금액",
    "연령대_40_매출_금액",
    "연령대_50_매출_금액",
    "연령대_60_이상_매출_금액",
]

TIME_AMOUNT_COLS = {
    "새벽": "시간대_00~06_매출_금액",
    "오전": "시간대_06~11_매출_금액",
    "점심": "시간대_11~14_매출_금액",
    "오후": "시간대_14~17_매출_금액",
    "저녁": "시간대_17~21_매출_금액",
    "심야": "시간대_21~24_매출_금액",
}


def safe_divide(numerator, denominator):
    denominator = denominator.replace(0, np.nan)
    return numerator / denominator


def most_common(series):
    mode = series.mode(dropna=True)
    if mode.empty:
        return np.nan
    return mode.iat[0]


def add_row_features(filtered):
    filtered = filtered.copy()
    filtered["총매출건수"] = filtered[AGE_COUNT_COLS].sum(axis=1)
    filtered["2030_매출건수"] = (
        filtered["연령대_20_매출_건수"] + filtered["연령대_30_매출_건수"]
    )
    filtered["2030_매출비율"] = safe_divide(
        filtered["2030_매출건수"], filtered["총매출건수"]
    )
    filtered["객단가"] = safe_divide(
        filtered["당월_매출_금액"], filtered["당월_매출_건수"]
    )
    filtered["피크타임_매출비중"] = safe_divide(
        filtered[list(TIME_AMOUNT_COLS.values())].max(axis=1),
        filtered["당월_매출_금액"],
    )
    filtered["시간대추천"] = (
        filtered[list(TIME_AMOUNT_COLS.values())]
        .idxmax(axis=1)
        .str.replace("시간대_", "", regex=False)
        .str.replace("_매출_금액", "", regex=False)
    )
    return filtered


def build_sales_features(
    industry_name=DEFAULT_INDUSTRY_NAME,
    sales_path=SALES_INPUT,
    output_path=SALES_OUTPUT,
):
    sales = pd.read_csv(sales_path, encoding="cp949")
    sales["기준_년분기_코드"] = sales["기준_년분기_코드"].astype(int)

    filtered = sales[
        (sales["서비스_업종_코드_명"] == industry_name)
        & (sales["기준_년분기_코드"].isin(TARGET_QUARTERS))
    ].copy()
    filtered = add_row_features(filtered)

    agg_dict = {
        "당월_매출_금액": ("당월_매출_금액", "sum"),
        "당월_매출_건수": ("당월_매출_건수", "sum"),
        "총매출건수": ("총매출건수", "sum"),
        "2030_매출건수": ("2030_매출건수", "sum"),
        "피크타임_매출비중": ("피크타임_매출비중", "mean"),
        "시간대추천": ("시간대추천", most_common),
    }

    for col in AGE_COUNT_COLS + AGE_AMOUNT_COLS:
        agg_dict[col] = (col, "sum")

    for label, col in TIME_AMOUNT_COLS.items():
        agg_dict[col] = (col, "sum")

    grouped = (
        filtered.groupby(["행정동_코드", "행정동_코드_명"], as_index=False)
        .agg(**agg_dict)
    )

    grouped["2030_매출비율"] = safe_divide(
        grouped["2030_매출건수"], grouped["총매출건수"]
    )
    grouped["객단가"] = safe_divide(
        grouped["당월_매출_금액"], grouped["당월_매출_건수"]
    )

    for label, col in TIME_AMOUNT_COLS.items():
        grouped[f"{label}_매출비중"] = safe_divide(
            grouped[col].astype(float),
            grouped["당월_매출_금액"].astype(float),
        )

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    grouped.to_csv(output_path, index=False, encoding="utf-8-sig")
    return grouped


def build_cafe_sales_features(sales_path=SALES_INPUT, output_path=SALES_OUTPUT):
    return build_sales_features(
        industry_name=DEFAULT_INDUSTRY_NAME,
        sales_path=sales_path,
        output_path=output_path,
    )


if __name__ == "__main__":
    df = build_cafe_sales_features()
    print(f"saved {SALES_OUTPUT} ({len(df):,} rows)")
