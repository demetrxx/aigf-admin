import {
  FileDir,
  FileStatus,
  type ICharacterDetails,
  type RoleplayStage,
  type StageDirectives,
  STAGES_IN_ORDER,
} from '@/common/types';

const SCENARIO_TRANSFER_SCHEMA = 'aigf-scenario';
const SCENARIO_TRANSFER_VERSION = 1;

type ScenarioTransferCharacter = {
  id: string;
  name: string;
};

export type ScenarioTransferFile = {
  id: string;
  name: string;
  dir: FileDir;
  path: string;
  status: FileStatus;
  mime: string;
  url?: string | null;
};

export type ScenarioTransferGift = {
  stage: RoleplayStage;
  giftName: string;
  reason: string;
  buyText: string;
};

type ScenarioTransferScenario = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  personality: string;
  messagingStyle: string;
  appearance: string;
  situation: string;
  openingMessage: string;
  openingImage: ScenarioTransferFile;
  stages: Record<RoleplayStage, StageDirectives>;
  gifts: ScenarioTransferGift[];
};

export type ScenarioTransferPayload = {
  schema: typeof SCENARIO_TRANSFER_SCHEMA;
  version: typeof SCENARIO_TRANSFER_VERSION;
  exportedAt: string;
  character: ScenarioTransferCharacter;
  scenario: ScenarioTransferScenario;
};

type BuildScenarioTransferPayloadParams = {
  characterId: string;
  characterName: string;
  scenario: ICharacterDetails['scenarios'][number];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureRecord(value: unknown, path: string) {
  if (!isRecord(value)) {
    throw new Error(`Invalid import file: "${path}" must be an object.`);
  }
  return value;
}

function ensureString(value: unknown, path: string) {
  if (typeof value !== 'string') {
    throw new Error(`Invalid import file: "${path}" must be a string.`);
  }
  return value;
}

function ensureNonEmptyString(value: unknown, path: string) {
  const parsed = ensureString(value, path).trim();
  if (!parsed) {
    throw new Error(`Invalid import file: "${path}" must not be empty.`);
  }
  return parsed;
}

function ensureStage(value: unknown, path: string): RoleplayStage {
  const stage = ensureString(value, path);
  if (!STAGES_IN_ORDER.includes(stage as RoleplayStage)) {
    throw new Error(
      `Invalid import file: "${path}" has unknown stage "${stage}".`,
    );
  }
  return stage as RoleplayStage;
}

function sanitizeString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function sanitizeStageDirectives(
  value:
    | ICharacterDetails['scenarios'][number]['stages'][RoleplayStage]
    | undefined,
): StageDirectives {
  return {
    toneAndBehavior: sanitizeString(value?.toneAndBehavior),
    restrictions: sanitizeString(value?.restrictions),
    environment: sanitizeString(value?.environment),
    characterLook: sanitizeString(value?.characterLook),
    goal: sanitizeString(value?.goal),
    escalationTrigger: sanitizeString(value?.escalationTrigger),
  };
}

function parseStageDirectives(value: unknown, path: string): StageDirectives {
  const obj = ensureRecord(value, path);
  return {
    toneAndBehavior: ensureString(
      obj.toneAndBehavior,
      `${path}.toneAndBehavior`,
    ),
    restrictions: ensureString(obj.restrictions, `${path}.restrictions`),
    environment: ensureString(obj.environment, `${path}.environment`),
    characterLook: ensureString(obj.characterLook, `${path}.characterLook`),
    goal: ensureString(obj.goal, `${path}.goal`),
    escalationTrigger: ensureString(
      obj.escalationTrigger,
      `${path}.escalationTrigger`,
    ),
  };
}

function parseTransferFile(value: unknown, path: string): ScenarioTransferFile {
  const obj = ensureRecord(value, path);
  const dir = ensureString(obj.dir, `${path}.dir`);
  const status = ensureString(obj.status, `${path}.status`);

  if (!Object.values(FileDir).includes(dir as FileDir)) {
    throw new Error(
      `Invalid import file: "${path}.dir" has unsupported value.`,
    );
  }
  if (!Object.values(FileStatus).includes(status as FileStatus)) {
    throw new Error(
      `Invalid import file: "${path}.status" has unsupported value.`,
    );
  }

  const urlValue = obj.url;
  if (
    urlValue !== undefined &&
    urlValue !== null &&
    typeof urlValue !== 'string'
  ) {
    throw new Error(
      `Invalid import file: "${path}.url" must be a string, null, or omitted.`,
    );
  }

  return {
    id: ensureNonEmptyString(obj.id, `${path}.id`),
    name: ensureNonEmptyString(obj.name, `${path}.name`),
    dir: dir as FileDir,
    path: ensureNonEmptyString(obj.path, `${path}.path`),
    status: status as FileStatus,
    mime: ensureNonEmptyString(obj.mime, `${path}.mime`),
    url: (urlValue as string | null | undefined) ?? undefined,
  };
}

function parseTransferGift(value: unknown, path: string): ScenarioTransferGift {
  const obj = ensureRecord(value, path);
  const reason = ensureString(obj.reason, `${path}.reason`);
  if (!reason.trim()) {
    throw new Error(`Invalid import file: "${path}.reason" must not be empty.`);
  }

  return {
    stage: ensureStage(obj.stage, `${path}.stage`),
    giftName: ensureNonEmptyString(obj.giftName, `${path}.giftName`),
    reason,
    buyText: typeof obj.buyText === 'string' ? obj.buyText : '',
  };
}

export function buildScenarioTransferPayload({
  characterId,
  characterName,
  scenario,
}: BuildScenarioTransferPayloadParams): ScenarioTransferPayload {
  const openingImage = scenario.openingImage;
  if (!openingImage?.id || !openingImage?.name || !openingImage?.mime) {
    throw new Error(
      'Unable to export scenario: opening image metadata is missing.',
    );
  }

  const gifts = scenario.gifts.map((gift, index) => {
    const giftName = gift.gift?.name?.trim();
    if (!giftName) {
      throw new Error(
        `Unable to export scenario: gift #${index + 1} is missing its name.`,
      );
    }
    return {
      stage: gift.stage,
      giftName,
      reason: gift.reason ?? '',
      buyText: gift.buyText ?? '',
    };
  });

  const stageGiftMap = new Set<RoleplayStage>();
  for (const gift of gifts) {
    if (stageGiftMap.has(gift.stage)) {
      throw new Error(
        `Unable to export scenario: stage "${gift.stage}" contains multiple gifts.`,
      );
    }
    stageGiftMap.add(gift.stage);
  }

  const stages = STAGES_IN_ORDER.reduce(
    (acc, stage) => {
      acc[stage] = sanitizeStageDirectives(scenario.stages?.[stage]);
      return acc;
    },
    {} as Record<RoleplayStage, StageDirectives>,
  );

  return {
    schema: SCENARIO_TRANSFER_SCHEMA,
    version: SCENARIO_TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    character: {
      id: characterId,
      name: characterName || 'Character',
    },
    scenario: {
      id: scenario.id,
      name: sanitizeString(scenario.name),
      emoji: sanitizeString(scenario.emoji),
      description: sanitizeString(scenario.description),
      personality: sanitizeString(scenario.personality),
      messagingStyle: sanitizeString(scenario.messagingStyle),
      appearance: sanitizeString(scenario.appearance),
      situation: sanitizeString(scenario.situation),
      openingMessage: sanitizeString(scenario.openingMessage),
      openingImage: {
        id: openingImage.id,
        name: openingImage.name,
        dir: openingImage.dir,
        path: openingImage.path,
        status: openingImage.status,
        mime: openingImage.mime,
        url: openingImage.url ?? undefined,
      },
      stages,
      gifts,
    },
  };
}

function sanitizeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildScenarioTransferFileName(
  characterName: string,
  scenarioName: string,
) {
  const characterPart = sanitizeFilePart(characterName) || 'character-name';
  const scenarioPart = sanitizeFilePart(scenarioName) || 'scenario-name';

  return `${characterPart}-${scenarioPart}.json`;
}

export function downloadScenarioTransferFile(
  payload: ScenarioTransferPayload,
  fileName: string,
) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function parseScenarioTransferFile(file: File) {
  const text = await file.text();
  let rawPayload: unknown;

  try {
    rawPayload = JSON.parse(text) as unknown;
  } catch (_error) {
    throw new Error('Invalid JSON file.');
  }

  const payloadObj = ensureRecord(rawPayload, 'root');
  const schema = ensureString(payloadObj.schema, 'schema');
  const version = payloadObj.version;

  if (schema !== SCENARIO_TRANSFER_SCHEMA) {
    throw new Error(
      `Invalid import file: unsupported schema "${schema}". Expected "${SCENARIO_TRANSFER_SCHEMA}".`,
    );
  }
  if (version !== SCENARIO_TRANSFER_VERSION) {
    throw new Error(
      `Invalid import file: unsupported version "${String(version)}".`,
    );
  }

  const characterObj = ensureRecord(payloadObj.character, 'character');
  const scenarioObj = ensureRecord(payloadObj.scenario, 'scenario');
  const stagesObj = ensureRecord(scenarioObj.stages, 'scenario.stages');

  const stages = STAGES_IN_ORDER.reduce(
    (acc, stage) => {
      acc[stage] = parseStageDirectives(
        stagesObj[stage],
        `scenario.stages.${stage}`,
      );
      return acc;
    },
    {} as Record<RoleplayStage, StageDirectives>,
  );

  const giftsValue = scenarioObj.gifts;
  if (!Array.isArray(giftsValue)) {
    throw new Error('Invalid import file: "scenario.gifts" must be an array.');
  }

  const gifts = giftsValue.map((gift, index) =>
    parseTransferGift(gift, `scenario.gifts[${index}]`),
  );
  const stageGiftSet = new Set<RoleplayStage>();
  for (const gift of gifts) {
    if (stageGiftSet.has(gift.stage)) {
      throw new Error(
        `Invalid import file: duplicate gift mapping for stage "${gift.stage}".`,
      );
    }
    stageGiftSet.add(gift.stage);
  }

  return {
    schema: SCENARIO_TRANSFER_SCHEMA,
    version: SCENARIO_TRANSFER_VERSION,
    exportedAt: ensureString(payloadObj.exportedAt, 'exportedAt'),
    character: {
      id: ensureNonEmptyString(characterObj.id, 'character.id'),
      name: ensureString(characterObj.name, 'character.name'),
    },
    scenario: {
      id: ensureNonEmptyString(scenarioObj.id, 'scenario.id'),
      name: ensureString(scenarioObj.name, 'scenario.name'),
      emoji: ensureString(scenarioObj.emoji, 'scenario.emoji'),
      description: ensureString(
        scenarioObj.description,
        'scenario.description',
      ),
      personality: ensureString(
        scenarioObj.personality,
        'scenario.personality',
      ),
      messagingStyle: ensureString(
        scenarioObj.messagingStyle,
        'scenario.messagingStyle',
      ),
      appearance: ensureString(scenarioObj.appearance, 'scenario.appearance'),
      situation: ensureString(scenarioObj.situation, 'scenario.situation'),
      openingMessage: ensureString(
        scenarioObj.openingMessage,
        'scenario.openingMessage',
      ),
      openingImage: parseTransferFile(
        scenarioObj.openingImage,
        'scenario.openingImage',
      ),
      stages,
      gifts,
    },
  } satisfies ScenarioTransferPayload;
}
