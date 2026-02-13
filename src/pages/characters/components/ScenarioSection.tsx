import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useMemo, useRef, useState } from 'react';

import { useCreateScenario, useUpdateScenario } from '@/app/characters';
import {
  addScenarioStageGift,
  createScenario as createScenarioApi,
  updateScenarioStage as updateScenarioStageApi,
} from '@/app/characters/charactersApi';
import { copyFile } from '@/app/files/filesApi';
import { getGifts } from '@/app/gifts';
import { notifyError, notifySuccess } from '@/app/toast';
import { DownloadIcon, PlusIcon, UploadIcon } from '@/assets/icons';
import {
  Button,
  ButtonGroup,
  EmptyState,
  Field,
  FormRow,
  IconButton,
  Input,
  Skeleton,
  Stack,
  Tabs,
  Textarea,
  Typography,
} from '@/atoms';
import {
  FileDir,
  type ICharacterDetails,
  type IFile,
  type StageDirectives,
  STAGES_IN_ORDER,
} from '@/common/types';
import { Drawer, FileUpload } from '@/components/molecules';

import s from '../CharacterDetailsPage.module.scss';
import { ScenarioDetails } from './ScenarioDetails';
import {
  buildScenarioTransferFileName,
  buildScenarioTransferPayload,
  downloadScenarioTransferFile,
  parseScenarioTransferFile,
} from './scenarioTransfer';

type ScenarioSectionProps = {
  characterId: string | null;
  characterName: string;
  scenarios: ICharacterDetails['scenarios'];
  selectedScenarioId: string | null;
  onSelectScenario: (id: string) => void;
  isLoading: boolean;
  formatDate: (value: string | null | undefined) => string;
};

function isStageDirectivesEmpty(stage: StageDirectives) {
  return (
    !stage.toneAndBehavior.trim() &&
    !stage.restrictions.trim() &&
    !stage.environment.trim() &&
    !stage.characterLook.trim() &&
    !stage.goal.trim() &&
    !stage.escalationTrigger.trim()
  );
}

export function ScenarioSection({
  characterId,
  characterName,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  isLoading,
  formatDate,
}: ScenarioSectionProps) {
  const queryClient = useQueryClient();
  const createMutation = useCreateScenario();
  const updateMutation = useUpdateScenario();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [editShowErrors, setEditShowErrors] = useState(false);
  const [formValues, setFormValues] = useState({
    name: '',
    emoji: '',
    description: '',
    personality: '',
    messagingStyle: '',
    appearance: '',
    situation: '',
    openingMessage: '',
    openingImageId: '',
  });
  const [editValues, setEditValues] = useState(formValues);
  const [openingFile, setOpeningFile] = useState<IFile | null>(null);
  const [editOpeningFile, setEditOpeningFile] = useState<IFile | null>(null);

  const scenarioTabs = scenarios.map((scenario) => ({
    value: scenario.id,
    label: scenario.name || 'Untitled',
  }));
  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null;

  const getErrors = (values: typeof formValues) => {
    const errors: Record<string, string> = {};
    if (!values.name.trim()) errors.name = 'Enter a name.';
    if (!values.emoji.trim()) errors.emoji = 'Enter an emoji.';
    if (!values.description.trim()) errors.description = 'Enter a description.';
    if (!values.personality.trim()) errors.personality = 'Enter a personality.';
    if (!values.messagingStyle.trim())
      errors.messagingStyle = 'Enter a messaging style.';
    if (!values.appearance.trim()) errors.appearance = 'Enter an appearance.';
    if (!values.situation.trim()) errors.situation = 'Enter a situation.';
    if (!values.openingMessage.trim())
      errors.openingMessage = 'Enter an opening message.';
    if (!values.openingImageId) errors.openingImageId = 'Upload an image.';
    return errors;
  };

  const validationErrors = useMemo(
    () => (showErrors ? getErrors(formValues) : {}),
    [formValues, showErrors],
  );
  const editValidationErrors = useMemo(
    () => (editShowErrors ? getErrors(editValues) : {}),
    [editShowErrors, editValues],
  );

  const isValid = useMemo(
    () => Object.keys(getErrors(formValues)).length === 0,
    [formValues],
  );
  const isEditValid = useMemo(
    () => Object.keys(getErrors(editValues)).length === 0,
    [editValues],
  );

  const openCreateModal = () => {
    setFormValues({
      name: '',
      emoji: '',
      description: '',
      personality: '',
      messagingStyle: '',
      appearance: '',
      situation: '',
      openingMessage: '',
      openingImageId: '',
    });
    setOpeningFile(null);
    setShowErrors(false);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (createMutation.isPending) return;
    setIsCreateOpen(false);
  };

  const openEditModal = () => {
    if (!selectedScenario) return;
    setEditValues({
      name: selectedScenario.name ?? '',
      emoji: selectedScenario.emoji ?? '',
      description: selectedScenario.description ?? '',
      personality: selectedScenario.personality ?? '',
      messagingStyle: selectedScenario.messagingStyle ?? '',
      appearance: selectedScenario.appearance ?? '',
      situation: selectedScenario.situation ?? '',
      openingMessage: selectedScenario.openingMessage ?? '',
      openingImageId: selectedScenario.openingImage?.id ?? '',
    });
    setEditOpeningFile(selectedScenario.openingImage ?? null);
    setEditShowErrors(false);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (updateMutation.isPending) return;
    setIsEditOpen(false);
  };

  const handleCreate = async () => {
    if (!characterId) return;
    const errors = {
      name: formValues.name.trim() ? undefined : 'Enter a name.',
      emoji: formValues.emoji.trim() ? undefined : 'Enter an emoji.',
      description: formValues.description.trim()
        ? undefined
        : 'Enter a description.',
      personality: formValues.personality.trim()
        ? undefined
        : 'Enter a personality.',
      messagingStyle: formValues.messagingStyle.trim()
        ? undefined
        : 'Enter a messaging style.',
      appearance: formValues.appearance.trim()
        ? undefined
        : 'Enter an appearance.',
      situation: formValues.situation.trim() ? undefined : 'Enter a situation.',
      openingMessage: formValues.openingMessage.trim()
        ? undefined
        : 'Enter an opening message.',
      openingImageId: formValues.openingImageId
        ? undefined
        : 'Upload an image.',
    };
    if (Object.values(errors).some(Boolean)) {
      setShowErrors(true);
      return;
    }
    const result = await createMutation.mutateAsync({
      characterId,
      payload: {
        name: formValues.name.trim(),
        emoji: formValues.emoji.trim(),
        description: formValues.description.trim(),
        personality: formValues.personality.trim(),
        messagingStyle: formValues.messagingStyle.trim(),
        appearance: formValues.appearance.trim(),
        situation: formValues.situation.trim(),
        openingMessage: formValues.openingMessage.trim(),
        openingImageId: formValues.openingImageId,
      },
    });
    setIsCreateOpen(false);
    if (result?.id) {
      onSelectScenario(result.id);
    }
  };

  const handleEdit = async () => {
    if (!characterId || !selectedScenario) return;
    const errors = getErrors(editValues);
    if (Object.values(errors).some(Boolean)) {
      setEditShowErrors(true);
      return;
    }
    await updateMutation.mutateAsync({
      characterId,
      scenarioId: selectedScenario.id,
      payload: {
        name: editValues.name.trim(),
        emoji: editValues.emoji.trim(),
        description: editValues.description.trim(),
        personality: editValues.personality.trim(),
        messagingStyle: editValues.messagingStyle.trim(),
        appearance: editValues.appearance.trim(),
        situation: editValues.situation.trim(),
        openingMessage: editValues.openingMessage.trim(),
        openingImageId: editValues.openingImageId,
      },
    });
    setIsEditOpen(false);
  };

  const resolveGiftIdsByName = async (giftNames: string[]) => {
    const requiredNames = Array.from(
      new Set(giftNames.map((name) => name.trim()).filter(Boolean)),
    );
    if (requiredNames.length === 0) {
      return new Map<string, string>();
    }

    const giftsByName = new Map<string, string[]>();
    for (const name of requiredNames) {
      giftsByName.set(name, []);
    }

    let skip = 0;
    const take = 200;
    while (true) {
      const page = await getGifts({
        order: 'ASC',
        skip,
        take,
      });

      for (const gift of page.data) {
        const trimmedName = gift.name.trim();
        if (!trimmedName || !giftsByName.has(trimmedName)) {
          continue;
        }
        giftsByName.get(trimmedName)?.push(gift.id);
      }

      skip += page.data.length;
      if (skip >= page.total || page.data.length === 0) {
        break;
      }
    }

    const missing: string[] = [];
    const ambiguous: string[] = [];
    const resolved = new Map<string, string>();

    for (const name of requiredNames) {
      const ids = giftsByName.get(name) ?? [];
      if (ids.length === 0) {
        missing.push(name);
        continue;
      }
      if (ids.length > 1) {
        ambiguous.push(name);
        continue;
      }
      resolved.set(name, ids[0]);
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing gifts in target environment: ${missing.join(', ')}.`,
      );
    }
    if (ambiguous.length > 0) {
      throw new Error(
        `Gift names are not unique in target environment: ${ambiguous.join(', ')}.`,
      );
    }

    return resolved;
  };

  console.log('file', selectedScenario?.openingImage);

  const handleExportScenario = async () => {
    if (!characterId || !selectedScenario) return;

    try {
      setIsExporting(true);
      const payload = buildScenarioTransferPayload({
        characterId,
        characterName,
        scenario: selectedScenario,
      });
      const fileName = buildScenarioTransferFileName(
        characterName,
        selectedScenario.name,
      );
      downloadScenarioTransferFile(payload, fileName);
      notifySuccess('Scenario exported.', 'Scenario exported.');
    } catch (error) {
      notifyError(error, 'Unable to export scenario.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportButtonClick = () => {
    if (!characterId || isImporting) return;
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file || !characterId) return;

    setIsImporting(true);
    try {
      const imported = await parseScenarioTransferFile(file);
      const scenarioPayload = imported.scenario;
      const requiredFields: Array<[string, string]> = [
        ['name', scenarioPayload.name],
        ['emoji', scenarioPayload.emoji],
        ['description', scenarioPayload.description],
        ['personality', scenarioPayload.personality],
        ['messagingStyle', scenarioPayload.messagingStyle],
        ['appearance', scenarioPayload.appearance],
        ['situation', scenarioPayload.situation],
        ['openingMessage', scenarioPayload.openingMessage],
      ];
      for (const [field, value] of requiredFields) {
        if (!value.trim()) {
          throw new Error(
            `Invalid import file: "scenario.${field}" must not be empty.`,
          );
        }
      }

      const giftIdsByName = await resolveGiftIdsByName(
        scenarioPayload.gifts.map((gift) => gift.giftName),
      );

      await copyFile({
        id: scenarioPayload.openingImage.id,
        name: scenarioPayload.openingImage.name,
        dir: scenarioPayload.openingImage.dir,
        path: scenarioPayload.openingImage.path,
        status: scenarioPayload.openingImage.status,
        mime: scenarioPayload.openingImage.mime,
        url: scenarioPayload.openingImage.url ?? undefined,
      });

      const createdScenario = await createScenarioApi(characterId, {
        name: scenarioPayload.name.trim(),
        emoji: scenarioPayload.emoji.trim(),
        description: scenarioPayload.description.trim(),
        personality: scenarioPayload.personality.trim(),
        messagingStyle: scenarioPayload.messagingStyle.trim(),
        appearance: scenarioPayload.appearance.trim(),
        situation: scenarioPayload.situation.trim(),
        openingMessage: scenarioPayload.openingMessage.trim(),
        openingImageId: scenarioPayload.openingImage.id,
      });

      for (const stage of STAGES_IN_ORDER) {
        const stagePayload = scenarioPayload.stages[stage];
        if (isStageDirectivesEmpty(stagePayload)) {
          continue;
        }
        await updateScenarioStageApi(
          characterId,
          createdScenario.id,
          stage,
          stagePayload,
        );
      }

      for (const gift of scenarioPayload.gifts) {
        const resolvedGiftId = giftIdsByName.get(gift.giftName.trim());
        if (!resolvedGiftId) {
          throw new Error(`Gift "${gift.giftName}" was not resolved.`);
        }
        await addScenarioStageGift(
          characterId,
          createdScenario.id,
          gift.stage,
          {
            giftId: resolvedGiftId,
            reason: gift.reason.trim(),
            buyText: gift.buyText,
          },
        );
      }

      await queryClient.invalidateQueries({
        queryKey: ['character', characterId],
      });
      onSelectScenario(createdScenario.id);
      notifySuccess('Scenario imported.', 'Scenario imported.');
    } catch (error) {
      notifyError(error, 'Unable to import scenario.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <Typography variant="h3">Scenarios</Typography>
        <ButtonGroup>
          <IconButton
            aria-label="Export scenario"
            tooltip="Export scenario"
            icon={<DownloadIcon />}
            variant="ghost"
            size="sm"
            onClick={handleExportScenario}
            loading={isExporting}
            disabled={!characterId || !selectedScenario || isImporting}
          />
          <IconButton
            aria-label="Import scenario"
            tooltip="Import scenario"
            icon={<UploadIcon />}
            variant="ghost"
            size="sm"
            onClick={handleImportButtonClick}
            loading={isImporting}
            disabled={
              !characterId ||
              isExporting ||
              createMutation.isPending ||
              updateMutation.isPending
            }
          />
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<PlusIcon />}
            onClick={openCreateModal}
            disabled={!characterId || isImporting}
          >
            New scenario
          </Button>
        </ButtonGroup>
        <input
          ref={importInputRef}
          className={s.hiddenInput}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFileChange}
        />
      </div>
      {isLoading ? (
        <Stack gap="16px">
          <Skeleton width="100%" height={160} />
        </Stack>
      ) : scenarios.length === 0 ? (
        <EmptyState
          title="No scenarios"
          description="This character has no scenarios yet."
        />
      ) : (
        <Stack gap="24px">
          <div className={s.scenarioTabs}>
            <Tabs
              items={scenarioTabs}
              value={selectedScenarioId ?? scenarioTabs[0]?.value ?? ''}
              onChange={onSelectScenario}
            />
          </div>

          {selectedScenario ? (
            <ScenarioDetails
              characterId={characterId}
              scenario={selectedScenario}
              formatDate={formatDate}
              onEdit={openEditModal}
              canEdit={Boolean(characterId)}
            />
          ) : null}
        </Stack>
      )}

      <Drawer
        open={isCreateOpen}
        title="New scenario"
        className={s.scenarioDrawer}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateModal();
          } else {
            setIsCreateOpen(true);
          }
        }}
      >
        <Stack gap="16px">
          <FormRow columns={2}>
            <Field
              label="Name"
              labelFor="scenario-create-name"
              error={validationErrors.name}
            >
              <Input
                id="scenario-create-name"
                size="sm"
                value={formValues.name}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
            <Field
              label="Emoji"
              labelFor="scenario-create-emoji"
              error={validationErrors.emoji}
            >
              <Input
                id="scenario-create-emoji"
                size="sm"
                value={formValues.emoji}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    emoji: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
          </FormRow>

          <Field
            label="Description"
            labelFor="scenario-create-description"
            error={validationErrors.description}
          >
            <Textarea
              id="scenario-create-description"
              value={formValues.description}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Personality"
            labelFor="scenario-create-personality"
            error={validationErrors.personality}
          >
            <Textarea
              id="scenario-create-personality"
              value={formValues.personality}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  personality: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Messaging style"
            labelFor="scenario-create-messaging-style"
            error={validationErrors.messagingStyle}
          >
            <Textarea
              id="scenario-create-messaging-style"
              value={formValues.messagingStyle}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  messagingStyle: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Appearance"
            labelFor="scenario-create-appearance"
            error={validationErrors.appearance}
          >
            <Textarea
              id="scenario-create-appearance"
              value={formValues.appearance}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  appearance: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Situation"
            labelFor="scenario-create-situation"
            error={validationErrors.situation}
          >
            <Textarea
              id="scenario-create-situation"
              value={formValues.situation}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  situation: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Opening message"
            labelFor="scenario-create-opening-message"
            error={validationErrors.openingMessage}
          >
            <Textarea
              id="scenario-create-opening-message"
              value={formValues.openingMessage}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  openingMessage: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <div>
            <FileUpload
              label="Opening image"
              folder={FileDir.Public}
              value={openingFile}
              onChange={(file) => {
                setOpeningFile(file);
                setFormValues((prev) => ({
                  ...prev,
                  openingImageId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload image.')
              }
            />
            {validationErrors.openingImageId ? (
              <Typography variant="caption" tone="warning">
                {validationErrors.openingImageId}
              </Typography>
            ) : null}
          </div>

          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeCreateModal}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={!isValid || createMutation.isPending}
            >
              Create
            </Button>
          </div>
        </Stack>
      </Drawer>

      <Drawer
        open={isEditOpen}
        title="Edit scenario"
        className={s.scenarioDrawer}
        onOpenChange={(open) => {
          if (!open) {
            closeEditModal();
          } else {
            setIsEditOpen(true);
          }
        }}
      >
        <Stack gap="16px">
          <FormRow columns={2}>
            <Field
              label="Name"
              labelFor="scenario-edit-name"
              error={editValidationErrors.name}
            >
              <Input
                id="scenario-edit-name"
                size="sm"
                value={editValues.name}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
            <Field
              label="Emoji"
              labelFor="scenario-edit-emoji"
              error={editValidationErrors.emoji}
            >
              <Input
                id="scenario-edit-emoji"
                size="sm"
                value={editValues.emoji}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    emoji: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
          </FormRow>

          <Field
            label="Description"
            labelFor="scenario-edit-description"
            error={editValidationErrors.description}
          >
            <Textarea
              id="scenario-edit-description"
              value={editValues.description}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Personality"
            labelFor="scenario-edit-personality"
            error={editValidationErrors.personality}
          >
            <Textarea
              id="scenario-edit-personality"
              value={editValues.personality}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  personality: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Messaging style"
            labelFor="scenario-edit-messaging-style"
            error={editValidationErrors.messagingStyle}
          >
            <Textarea
              id="scenario-edit-messaging-style"
              value={editValues.messagingStyle}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  messagingStyle: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Appearance"
            labelFor="scenario-edit-appearance"
            error={editValidationErrors.appearance}
          >
            <Textarea
              id="scenario-edit-appearance"
              value={editValues.appearance}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  appearance: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Situation"
            labelFor="scenario-edit-situation"
            error={editValidationErrors.situation}
          >
            <Textarea
              id="scenario-edit-situation"
              value={editValues.situation}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  situation: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Opening message"
            labelFor="scenario-edit-opening-message"
            error={editValidationErrors.openingMessage}
          >
            <Textarea
              id="scenario-edit-opening-message"
              value={editValues.openingMessage}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  openingMessage: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <div>
            <FileUpload
              label="Opening image"
              folder={FileDir.Public}
              value={editOpeningFile}
              onChange={(file) => {
                setEditOpeningFile(file);
                setEditValues((prev) => ({
                  ...prev,
                  openingImageId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload image.')
              }
            />
            {editValidationErrors.openingImageId ? (
              <Typography variant="caption" tone="warning">
                {editValidationErrors.openingImageId}
              </Typography>
            ) : null}
          </div>

          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeEditModal}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              loading={updateMutation.isPending}
              disabled={!isEditValid || updateMutation.isPending}
            >
              Save
            </Button>
          </div>
        </Stack>
      </Drawer>
    </div>
  );
}
