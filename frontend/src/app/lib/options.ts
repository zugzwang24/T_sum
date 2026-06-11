import type { TimeValue } from "./api";

export const TIME_OPTIONS: Array<{ value: TimeValue; label: string; range: string }> = [
  { value: "dawn", label: "새벽", range: "00~06" },
  { value: "morning", label: "오전", range: "06~11" },
  { value: "lunch", label: "점심", range: "11~14" },
  { value: "afternoon", label: "오후", range: "14~17" },
  { value: "evening", label: "저녁", range: "17~21" },
  { value: "night", label: "심야", range: "21~24" },
];

export const AGE_OPTIONS = [
  { value: "10", label: "10대" },
  { value: "20", label: "20대" },
  { value: "30", label: "30대" },
  { value: "40", label: "40대" },
  { value: "50", label: "50대" },
  { value: "60", label: "60대+" },
];

export function getTimeLabel(value: TimeValue) {
  const option = TIME_OPTIONS.find((item) => item.value === value);
  return option ? `${option.label} ${option.range}` : value;
}

