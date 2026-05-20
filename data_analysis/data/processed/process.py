from pathlib import Path

import numpy as np
import pandas as pd

from pop import build_pop_features
from sales import build_cafe_sales_features


PROCESSED_DIR = Path(__file__).resolve().parent
FINAL_OUTPUT = PROCESSED_DIR / "cafe_area_features.csv"


def safe_divide(numerator, denominator):
    denominator = denominator.replace(0, np.nan)
    return numerator / denominator


def build_processed_features(output_path=FINAL_OUTPUT):
    pop_features = build_pop_features()
    cafe_features = build_cafe_sales_features()

    final = cafe_features.merge(
        pop_features,
        on=["행정동_코드", "행정동_코드_명"],
        how="left",
    )

    final["월_유동인구추정"] = (
    final["총_유동인구_수"] * 30
)

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

def minmax_score(series):
    min_value = series.min()
    max_value = series.max()

    if pd.isna(min_value) or pd.isna(max_value) or min_value == max_value:
        return pd.Series(0.0, index=series.index)

    return (series - min_value) / (max_value - min_value)

def add_final_score(final, selected_time="저녁"):
    final = final.copy()

    time_col = f"{selected_time}_매출비중"

    if time_col not in final.columns:
        raise ValueError(f"존재하지 않는 시간대입니다: {selected_time}")

    final["선택시간대_매출비중"] = final[time_col]

    score_weights = {
        "카페전환효율": 0.35,
        "2030_매출비율": 0.30,
        "선택시간대_매출비중": 0.25,
        "객단가": 0.10,
    }

    for col in score_weights:
        final[f"{col}_점수"] = minmax_score(final[col].fillna(0))

    final["MZ카페_추천점수"] = 0

    for col, weight in score_weights.items():
        final["MZ카페_추천점수"] += final[f"{col}_점수"] * weight

    return final

if __name__ == "__main__":
    df = build_processed_features()
    df = add_final_score(df, selected_time="저녁")
    print(f"saved {FINAL_OUTPUT} ({len(df):,} rows)")