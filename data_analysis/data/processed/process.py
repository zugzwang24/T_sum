from pathlib import Path

import numpy as np
import pandas as pd

from pop import build_pop_features
from sales import build_sales_features


PROCESSED_DIR = Path(__file__).resolve().parent
FINAL_OUTPUT = PROCESSED_DIR / "cafe_area_features.csv"


def safe_divide(numerator, denominator):
    denominator = denominator.replace(0, np.nan)
    return numerator / denominator


def build_processed_features(
    output_path=FINAL_OUTPUT,
    industry_name="커피-음료",
):
    pop_features = build_pop_features()
    sales_features = build_sales_features(industry_name=industry_name)

    final = sales_features.merge(
        pop_features,
        on=["행정동_코드", "행정동_코드_명"],
        how="left",
    )

    final["업종명"] = industry_name
    final["월_유동인구추정"] = final["총_유동인구_수"] * 30
    final["카페전환효율"] = safe_divide(
        final["당월_매출_건수"].astype(float),
        final["월_유동인구추정"].astype(float),
    )
    final["2030_카페전환효율"] = safe_divide(
        final["2030_매출건수"].astype(float),
        final["2030_유동인구"].astype(float) * 30,
    )

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    final.to_csv(output_path, index=False, encoding="utf-8-sig")
    return final


if __name__ == "__main__":
    df = build_processed_features()
    print(f"saved {FINAL_OUTPUT} ({len(df):,} rows)")
