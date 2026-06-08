from pathlib import Path

import numpy as np
import pandas as pd

from category_config import DEFAULT_CATEGORIES


BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "raw"
PROCESSED_DIR = BASE_DIR / "processed"

SALES_INPUT = RAW_DIR / "추정매출.csv"
SALES_OUTPUT = PROCESSED_DIR / "sales_features.csv"
CAFE_SALES_OUTPUT = PROCESSED_DIR / "cafe_sales_features.csv"

DEFAULT_INDUSTRY_NAME = "커피-음료"
TARGET_QUARTERS = [20251, 20252, 20253, 20254]

CATEGORY_CODE_COL = "서비스_업종_코드"
CATEGORY_NAME_COL = "서비스_업종_코드_명"
DISTRICT_KEYS = ["행정동_코드", "행정동_코드_명"]

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


def sales_stability(series):
    values = series.dropna().astype(float)
    if len(values) < 2:
        return 0.5
    mean = values.mean()
    if mean <= 0:
        return 0
    coefficient_of_variation = values.std(ddof=0) / mean
    return 1 / (1 + coefficient_of_variation)


def read_sales(sales_path=SALES_INPUT):
    sales = pd.read_csv(sales_path, encoding="cp949")
    sales["기준_년분기_코드"] = sales["기준_년분기_코드"].astype(int)
    return sales


def get_available_categories(sales_path=SALES_INPUT):
    sales = pd.read_csv(
        sales_path,
        encoding="cp949",
        usecols=[CATEGORY_CODE_COL, CATEGORY_NAME_COL],
    )
    categories = (
        sales[[CATEGORY_CODE_COL, CATEGORY_NAME_COL]]
        .drop_duplicates()
        .sort_values([CATEGORY_NAME_COL, CATEGORY_CODE_COL])
        .reset_index(drop=True)
    )
    return categories


def resolve_categories(sales, categories=None):
    requested = categories or DEFAULT_CATEGORIES
    available = (
        sales[[CATEGORY_CODE_COL, CATEGORY_NAME_COL]]
        .drop_duplicates()
        .set_index(CATEGORY_NAME_COL)[CATEGORY_CODE_COL]
        .to_dict()
    )

    resolved = []
    missing = []

    for category in requested:
        category_name = category["category_name"]
        category_code = category.get("category_code") or available.get(category_name)
        if category_name not in available:
            missing.append(category)
            continue
        resolved.append(
            {
                "category_code": category_code,
                "category_name": category_name,
                "category_label": category.get("category_label") or category_name,
            }
        )

    return resolved, missing


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


def build_sales_features(category, sales=None, sales_path=SALES_INPUT, output_path=None):
    sales = sales if sales is not None else read_sales(sales_path)
    category_name = category["category_name"]
    category_code = category.get("category_code")
    category_label = category.get("category_label") or category_name

    filtered = sales[
        (sales[CATEGORY_NAME_COL] == category_name)
        & (sales["기준_년분기_코드"].isin(TARGET_QUARTERS))
    ].copy()

    if filtered.empty:
        return pd.DataFrame()

    if not category_code:
        category_code = filtered[CATEGORY_CODE_COL].dropna().astype(str).mode().iat[0]

    filtered = add_row_features(filtered)
    period_counts = (
        filtered.groupby(DISTRICT_KEYS)["기준_년분기_코드"]
        .nunique()
        .reset_index(name="집계_기간수")
    )
    quarterly_sales = (
        filtered.groupby(
            [*DISTRICT_KEYS, "기준_년분기_코드"],
            as_index=False,
        )["당월_매출_건수"]
        .sum()
    )
    sales_stability_features = (
        quarterly_sales.groupby(DISTRICT_KEYS)["당월_매출_건수"]
        .apply(sales_stability)
        .reset_index(name="분기별_매출안정성")
    )

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

    for col in TIME_AMOUNT_COLS.values():
        agg_dict[col] = (col, "sum")

    grouped = filtered.groupby(DISTRICT_KEYS, as_index=False).agg(**agg_dict)
    grouped = grouped.merge(period_counts, on=DISTRICT_KEYS, how="left")
    grouped = grouped.merge(sales_stability_features, on=DISTRICT_KEYS, how="left")

    average_cols = [
        "당월_매출_금액",
        "당월_매출_건수",
        "총매출건수",
        "2030_매출건수",
        *AGE_COUNT_COLS,
        *AGE_AMOUNT_COLS,
        *TIME_AMOUNT_COLS.values(),
    ]
    for col in average_cols:
        grouped[col] = safe_divide(
            grouped[col].astype(float),
            grouped["집계_기간수"].astype(float),
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

    grouped.insert(2, "업종_코드", category_code)
    grouped.insert(3, "업종명", category_name)
    grouped.insert(4, "업종_라벨", category_label)

    if output_path is not None:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        grouped.to_csv(output_path, index=False, encoding="utf-8-sig")
    return grouped


def build_all_sales_features(
    categories=None,
    sales_path=SALES_INPUT,
    output_path=SALES_OUTPUT,
):
    sales = read_sales(sales_path)
    resolved_categories, missing_categories = resolve_categories(sales, categories)

    frames = []
    row_counts = {}
    for category in resolved_categories:
        frame = build_sales_features(category, sales=sales, output_path=None)
        row_counts[category["category_label"]] = len(frame)
        if not frame.empty:
            frames.append(frame)

    if frames:
        result = pd.concat(frames, ignore_index=True)
    else:
        result = pd.DataFrame()

    if output_path is not None:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        result.to_csv(output_path, index=False, encoding="utf-8-sig")

    return result, row_counts, missing_categories


def build_cafe_sales_features(sales_path=SALES_INPUT, output_path=CAFE_SALES_OUTPUT):
    return build_sales_features(
        category={
            "category_code": "CS100010",
            "category_name": DEFAULT_INDUSTRY_NAME,
            "category_label": DEFAULT_INDUSTRY_NAME,
        },
        sales_path=sales_path,
        output_path=output_path,
    )


if __name__ == "__main__":
    df, counts, missing = build_all_sales_features()
    print("[sales] row counts by category")
    for label, count in counts.items():
        print(f"- {label}: {count:,} rows")
    if missing:
        print("[sales] missing categories")
        for category in missing:
            print(f"- {category['category_label']} ({category['category_name']})")
    else:
        print("[sales] missing categories: none")
    print(f"saved {SALES_OUTPUT} ({len(df):,} rows)")
