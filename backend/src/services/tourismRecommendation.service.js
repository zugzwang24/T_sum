const TOURISM_SAMPLE_NOTICE =
  "이 추천은 실제 관광 API 조회 결과가 아닌 MVP 샘플 데이터입니다. 방문 전 운영 일정과 행사 개최 여부를 직접 확인해주세요.";

const TOURISM_EMPTY_MESSAGE =
  "입력한 업종과 상권에 맞는 MVP 샘플 관광 자원이 없습니다. 다른 업종이나 상권으로 다시 검색해주세요.";

const SCORE_WEIGHTS = {
  businessTypeExact: 40,
  businessTypeKeyword: 32,
  tourismNameArea: 55,
  tourismNameAreaPartial: 50,
  areaKeywordExact: 42,
  areaKeywordSpecific: 34,
  areaKeywordBroad: 18,
};

const SAMPLE_TOURISM_RESOURCES = [
  {
    id: "jochiwon-station",
    tourismName: "조치원역",
    tourismType: "교통 거점",
    location: "세종특별자치시 조치원읍",
    recommendedBusinessTypes: [
      "카페·음료",
      "베이커리·디저트",
      "간편식·음식점",
    ],
    recommendationReason:
      "이동 전후 대기 시간과 짧은 휴식 수요를 매장 방문으로 연결하기 좋습니다.",
    promotionIdea:
      "기차 대기 시간을 활용한 음료·쿠키 세트와 빠른 포장 가능 여부를 안내해보세요.",
    businessKeywords: [
      "카페·음료",
      "커피-음료",
      "카페",
      "커피",
      "음료",
      "베이커리",
      "디저트",
      "제과점",
      "음식점",
      "분식",
      "패스트푸드",
    ],
    areaKeywords: ["조치원역", "역전", "조치원읍", "조치원"],
    priorityBoost: 4,
  },
  {
    id: "jochiwon-peach-festival",
    tourismName: "조치원 복숭아 축제",
    tourismType: "지역 축제",
    location: "세종특별자치시 조치원 일대",
    recommendedBusinessTypes: [
      "카페·음료",
      "베이커리·디저트",
      "음식점",
      "소매·쇼핑",
    ],
    recommendationReason:
      "지역 축제 방문객의 식음료·간식·기념 상품 수요와 연계할 수 있습니다.",
    promotionIdea:
      "축제 방문 전후에 이용하기 좋은 메뉴나 포장 구성을 안내하고, 실제 행사 일정은 별도로 확인해주세요.",
    businessKeywords: [
      "카페·음료",
      "커피-음료",
      "카페",
      "커피",
      "음료",
      "베이커리",
      "디저트",
      "제과점",
      "음식점",
      "한식",
      "분식",
      "소매",
      "쇼핑",
      "기념품",
    ],
    areaKeywords: [
      "조치원 복숭아 축제",
      "복숭아 축제",
      "조치원읍",
      "조치원",
    ],
    priorityBoost: 3,
  },
  {
    id: "sejong-culture-arts-center",
    tourismName: "세종문화예술회관",
    tourismType: "문화시설",
    location: "세종특별자치시 조치원읍",
    recommendedBusinessTypes: ["카페·음료", "음식점", "문화·체험"],
    recommendationReason:
      "공연·문화시설 이용 전후의 식사와 휴식 수요를 주변 매장 이용으로 연결하기 좋습니다.",
    promotionIdea:
      "관람 전후에 이용할 수 있는 메뉴, 예상 이용 시간, 운영 시간을 함께 안내해보세요.",
    businessKeywords: [
      "카페·음료",
      "커피-음료",
      "카페",
      "커피",
      "음료",
      "음식점",
      "한식",
      "양식",
      "문화",
      "체험",
      "공방",
    ],
    areaKeywords: [
      "세종문화예술회관",
      "문화예술회관",
      "문예회관",
      "조치원읍",
      "조치원",
    ],
    priorityBoost: 2,
  },
  {
    id: "sejong-traditional-market",
    tourismName: "세종전통시장",
    tourismType: "전통시장",
    location: "세종특별자치시 조치원읍",
    recommendedBusinessTypes: [
      "음식점",
      "소매·쇼핑",
      "카페·음료",
      "베이커리·디저트",
    ],
    recommendationReason:
      "시장 방문객의 식사, 간식, 장보기 동선과 주변 매장의 상품을 함께 소개하기 좋습니다.",
    promotionIdea:
      "시장 방문 전후에 들르기 좋은 위치와 대표 메뉴·상품, 포장 가능 여부를 함께 홍보해보세요.",
    businessKeywords: [
      "음식점",
      "한식",
      "분식",
      "소매",
      "쇼핑",
      "기념품",
      "카페·음료",
      "커피-음료",
      "카페",
      "커피",
      "음료",
      "베이커리",
      "디저트",
      "제과점",
    ],
    areaKeywords: [
      "세종전통시장",
      "조치원전통시장",
      "전통시장",
      "조치원읍",
      "조치원",
    ],
    priorityBoost: 1,
  },
];

function normalizeForMatch(value) {
  return String(value || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function unique(values) {
  return [...new Set(values)];
}

function findBusinessMatch(resource, businessType) {
  if (!businessType) {
    return { matched: true, score: 0, keywords: [] };
  }

  const normalizedQuery = normalizeForMatch(businessType);
  const candidates = unique([
    ...resource.recommendedBusinessTypes,
    ...resource.businessKeywords,
  ]);
  const matches = candidates.filter((candidate) => {
    const normalizedCandidate = normalizeForMatch(candidate);
    return (
      normalizedCandidate.length >= 2 &&
      (normalizedQuery === normalizedCandidate ||
        normalizedQuery.includes(normalizedCandidate) ||
        normalizedCandidate.includes(normalizedQuery))
    );
  });
  const hasExactMatch = matches.some(
    (candidate) => normalizeForMatch(candidate) === normalizedQuery
  );

  return {
    matched: matches.length > 0,
    score: hasExactMatch
      ? SCORE_WEIGHTS.businessTypeExact
      : matches.length > 0
        ? SCORE_WEIGHTS.businessTypeKeyword
        : 0,
    keywords: matches.slice(0, 4),
  };
}

function getAreaKeywordScore(normalizedQuery, normalizedKeyword) {
  if (normalizedQuery === normalizedKeyword) {
    return SCORE_WEIGHTS.areaKeywordExact;
  }
  if (
    !normalizedQuery.includes(normalizedKeyword) &&
    !normalizedKeyword.includes(normalizedQuery)
  ) {
    return 0;
  }

  return normalizedKeyword.length <= 3
    ? SCORE_WEIGHTS.areaKeywordBroad
    : SCORE_WEIGHTS.areaKeywordSpecific;
}

function findAreaMatch(resource, area) {
  if (!area) {
    return { matched: true, score: 0, keywords: [] };
  }

  const normalizedQuery = normalizeForMatch(area);
  const normalizedName = normalizeForMatch(resource.tourismName);
  let score = 0;
  const matches = [];

  if (normalizedQuery === normalizedName) {
    score = SCORE_WEIGHTS.tourismNameArea;
    matches.push(resource.tourismName);
  } else if (
    normalizedQuery.includes(normalizedName) ||
    normalizedName.includes(normalizedQuery)
  ) {
    score = SCORE_WEIGHTS.tourismNameAreaPartial;
    matches.push(resource.tourismName);
  }

  resource.areaKeywords.forEach((keyword) => {
    const keywordScore = getAreaKeywordScore(
      normalizedQuery,
      normalizeForMatch(keyword)
    );
    if (keywordScore > 0) {
      score = Math.max(score, keywordScore);
      matches.push(keyword);
    }
  });

  return {
    matched: matches.length > 0,
    score,
    keywords: unique(matches).slice(0, 4),
  };
}

function toPublicItem(resource, businessMatch, areaMatch) {
  return {
    id: resource.id,
    tourismName: resource.tourismName,
    tourismType: resource.tourismType,
    location: resource.location,
    recommendedBusinessTypes: [...resource.recommendedBusinessTypes],
    recommendationReason: resource.recommendationReason,
    promotionIdea: resource.promotionIdea,
    score: Math.min(
      100,
      businessMatch.score + areaMatch.score + resource.priorityBoost
    ),
    matchedBy: {
      businessType: businessMatch.keywords,
      area: areaMatch.keywords,
    },
  };
}

function recommendTourismResources({ businessType = null, area = null, limit = 4 }) {
  const items = SAMPLE_TOURISM_RESOURCES.map((resource) => {
    const businessMatch = findBusinessMatch(resource, businessType);
    const areaMatch = findAreaMatch(resource, area);

    if (
      (businessType && !businessMatch.matched) ||
      (area && !areaMatch.matched)
    ) {
      return null;
    }

    return toPublicItem(resource, businessMatch, areaMatch);
  })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.tourismName.localeCompare(right.tourismName, "ko")
    )
    .slice(0, limit);

  return {
    sourceType: "mvp-sample",
    notice: TOURISM_SAMPLE_NOTICE,
    criteria: {
      businessType,
      area,
      limit,
      matchPolicy:
        "입력된 업종과 상권 조건을 모두 만족하는 샘플만 반환하고, 업종 일치도와 관광지명·상권 키워드 일치도를 합산해 정렬합니다.",
      scoreWeights: {
        ...SCORE_WEIGHTS,
        samplePriorityBoost: "1~4점",
      },
    },
    items,
    emptyMessage: items.length === 0 ? TOURISM_EMPTY_MESSAGE : null,
  };
}

module.exports = {
  SAMPLE_TOURISM_RESOURCES,
  SCORE_WEIGHTS,
  TOURISM_EMPTY_MESSAGE,
  TOURISM_SAMPLE_NOTICE,
  normalizeForMatch,
  recommendTourismResources,
};
