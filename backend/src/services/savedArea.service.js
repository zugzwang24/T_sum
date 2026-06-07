const { createHttpError } = require("../schemas/query.schema");
const {
  AREA_FEATURE_INCLUDE,
  findAreaFeature,
  serializeAreaFeature,
} = require("./areaFeature.service");
const prisma = require("./prisma.service");

function serializeSavedArea(savedArea) {
  return {
    id: savedArea.id,
    createdAt: savedArea.createdAt,
    updatedAt: savedArea.updatedAt,
    ...serializeAreaFeature(savedArea.areaFeature),
  };
}

async function listSavedAreas(userId) {
  const savedAreas = await prisma.savedArea.findMany({
    where: { userId },
    include: {
      areaFeature: {
        include: AREA_FEATURE_INCLUDE,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    items: savedAreas.map(serializeSavedArea),
  };
}

async function saveArea(userId, { areaFeatureId, areaCode }) {
  const areaFeature = await findAreaFeature({ areaFeatureId, areaCode });

  if (!areaFeature) {
    throw createHttpError(404, "저장할 상권 데이터를 찾을 수 없습니다.");
  }

  const savedArea = await prisma.savedArea.upsert({
    where: {
      saved_area_identity: {
        userId,
        areaFeatureId: areaFeature.id,
      },
    },
    update: {},
    create: {
      userId,
      areaFeatureId: areaFeature.id,
    },
    include: {
      areaFeature: {
        include: AREA_FEATURE_INCLUDE,
      },
    },
  });

  return {
    item: serializeSavedArea(savedArea),
  };
}

async function deleteSavedArea(userId, savedAreaId) {
  const result = await prisma.savedArea.deleteMany({
    where: {
      id: savedAreaId,
      userId,
    },
  });

  if (result.count === 0) {
    throw createHttpError(404, "삭제할 저장 상권을 찾을 수 없습니다.");
  }

  return {
    deleted: true,
    id: savedAreaId,
  };
}

module.exports = {
  deleteSavedArea,
  listSavedAreas,
  saveArea,
};
