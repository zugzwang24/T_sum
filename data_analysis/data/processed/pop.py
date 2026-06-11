from pathlib import Path

import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "raw"
PROCESSED_DIR = BASE_DIR / "processed"

POP_INPUT = RAW_DIR / "유동인구.csv"
POP_OUTPUT = PROCESSED_DIR / "pop_features.csv"

TARGET_QUARTERS = [20251, 20252, 20253, 20254]

AGE_POP_COLS = [
    "연령대_10_유동인구_수",
    "연령대_20_유동인구_수",
    "연령대_30_유동인구_수",
    "연령대_40_유동인구_수",
    "연령대_50_유동인구_수",
    "연령대_60_이상_유동인구_수",
]

TIME_POP_COLS = {
    "새벽": "시간대_00_06_유동인구_수",
    "오전": "시간대_06_11_유동인구_수",
    "점심": "시간대_11_14_유동인구_수",
    "오후": "시간대_14_17_유동인구_수",
    "저녁": "시간대_17_21_유동인구_수",
    "심야": "시간대_21_24_유동인구_수",
}


def safe_divide(numerator, denominator):
    denominator = denominator.replace(0, np.nan)
    return numerator / denominator


def build_pop_features(pop_path=POP_INPUT, output_path=POP_OUTPUT):
    pop = pd.read_csv(pop_path, encoding="cp949")
    pop_2025 = pop[pop["기준_년분기_코드"].isin(TARGET_QUARTERS)].copy()

    agg_dict = {"총_유동인구_수": ("총_유동인구_수", "mean")}

    for col in AGE_POP_COLS:
        agg_dict[col] = (col, "mean")

    for source_col in TIME_POP_COLS.values():
        agg_dict[source_col] = (source_col, "mean")

    pop_features = (
        pop_2025.groupby(["행정동_코드", "행정동_코드_명"], as_index=False)
        .agg(**agg_dict)
    )

    pop_features["2030_유동인구"] = (
        pop_features["연령대_20_유동인구_수"]
        + pop_features["연령대_30_유동인구_수"]
    )
    pop_features["2030_유동인구비율"] = safe_divide(
        pop_features["2030_유동인구"].astype(float),
        pop_features["총_유동인구_수"].astype(float),
    )

    for label, source_col in TIME_POP_COLS.items():
        pop_features[f"{label}_유동인구비중"] = safe_divide(
            pop_features[source_col].astype(float),
            pop_features["총_유동인구_수"].astype(float),
        )

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pop_features.to_csv(output_path, index=False, encoding="utf-8-sig")
    return pop_features


if __name__ == "__main__":
    df = build_pop_features()
    print(f"saved {POP_OUTPUT} ({len(df):,} rows)")
