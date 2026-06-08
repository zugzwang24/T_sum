from pathlib import Path

import numpy as np
import pandas as pd

from pop import build_pop_features
from sales import build_all_sales_features, build_cafe_sales_features


PROCESSED_DIR = Path(__file__).resolve().parent
FINAL_OUTPUT = PROCESSED_DIR / "area_features.csv"
CAFE_OUTPUT = PROCESSED_DIR / "cafe_area_features.csv"
WEEKS_PER_MONTH = 365.25 / 12 / 7


def safe_divide(numerator, denominator):
    denominator = denominator.replace(0, np.nan)
    return numerator / denominator


def add_conversion_features(frame):
    frame = frame.copy()
    frame["월_유동인구추정"] = frame["총_유동인구_수"] * WEEKS_PER_MONTH
    frame["업종전환효율"] = safe_divide(
        frame["당월_매출_건수"].astype(float),
        frame["월_유동인구추정"].astype(float),
    )
    frame["2030_업종전환효율"] = safe_divide(
        frame["2030_매출건수"].astype(float),
        frame["2030_유동인구"].astype(float) * WEEKS_PER_MONTH,
    )

    # Backward-compatible aliases used by the existing cafe service.
    frame["카페전환효율"] = frame["업종전환효율"]
    frame["2030_카페전환효율"] = frame["2030_업종전환효율"]
    return frame


def merge_with_population(sales_features, pop_features):
    merged = sales_features.merge(
        pop_features,
        on=["행정동_코드", "행정동_코드_명"],
        how="left",
    )
    return add_conversion_features(merged)


def log_category_summary(row_counts, missing_categories):
    print("[process] row counts by category")
    for label, count in row_counts.items():
        print(f"- {label}: {count:,} rows")

    if missing_categories:
        print("[process] missing categories")
        for category in missing_categories:
            print(f"- {category['category_label']} ({category['category_name']})")
    else:
        print("[process] missing categories: none")


def build_processed_features(
    output_path=FINAL_OUTPUT,
    cafe_output_path=CAFE_OUTPUT,
):
    pop_features = build_pop_features()
    sales_features, row_counts, missing_categories = build_all_sales_features(output_path=None)
    final = merge_with_population(sales_features, pop_features)

    cafe_sales_features = build_cafe_sales_features(output_path=None)
    cafe_final = merge_with_population(cafe_sales_features, pop_features)

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    final.to_csv(output_path, index=False, encoding="utf-8-sig")

    cafe_output_path = Path(cafe_output_path)
    cafe_output_path.parent.mkdir(parents=True, exist_ok=True)
    cafe_final.to_csv(cafe_output_path, index=False, encoding="utf-8-sig")

    log_category_summary(row_counts, missing_categories)
    print(f"[process] saved {output_path} ({len(final):,} rows)")
    print(f"[process] saved {cafe_output_path} ({len(cafe_final):,} rows)")

    return final


if __name__ == "__main__":
    build_processed_features()
