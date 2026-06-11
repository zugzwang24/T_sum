const COMPARE_CODES_KEY = "goldenCafe.compareCodes";

export function readCompareCodes() {
  try {
    return JSON.parse(localStorage.getItem(COMPARE_CODES_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function writeCompareCodes(codes: string[]) {
  localStorage.setItem(COMPARE_CODES_KEY, JSON.stringify(codes.slice(0, 2)));
}

