import { useMemo, useState } from 'react';

import {
  useCreateScenarioStageGift,
  useDeleteScenarioStageGift,
  useUpdateScenarioStage,
  useUpdateScenarioStageGift,
} from '@/app/characters';
import { useGifts } from '@/app/gifts';
import { PencilLineIcon } from '@/assets/icons';
import {
  Button,
  Field,
  IconButton,
  Select,
  Stack,
  Textarea,
  Typography,
} from '@/atoms';
import {
  type ICharacterDetails,
  RoleplayStage,
  type StageDirectives,
  STAGES_IN_ORDER,
} from '@/common/types';
import { ConfirmModal, Drawer } from '@/components/molecules';

import s from '../CharacterDetailsPage.module.scss';

type ScenarioDetailsProps = {
  characterId: string | null;
  scenario: ICharacterDetails['scenarios'][number];
  formatDate: (value: string | null | undefined) => string;
  onEdit: () => void;
  canEdit: boolean;
};

const EMPTY_STAGE: StageDirectives = {
  toneAndBehavior: '',
  restrictions: '',
  environment: '',
  characterLook: '',
  goal: '',
  escalationTrigger: '',
};

const STAGE_LABELS: Record<RoleplayStage, string> = {
  [RoleplayStage.Acquaintance]: 'Acquaintance',
  [RoleplayStage.Flirting]: 'Flirting',
  [RoleplayStage.Seduction]: 'Seduction',
  [RoleplayStage.Resistance]: 'Resistance',
  [RoleplayStage.Undressing]: 'Undressing',
  [RoleplayStage.Prelude]: 'Prelude',
  [RoleplayStage.Sex]: 'Sex',
  [RoleplayStage.Aftercare]: 'Aftercare',
};

export function ScenarioDetails({
  characterId,
  scenario,
  formatDate,
  onEdit,
  canEdit,
}: ScenarioDetailsProps) {
  const updateStageMutation = useUpdateScenarioStage();
  const createGiftMutation = useCreateScenarioStageGift();
  const updateGiftMutation = useUpdateScenarioStageGift();
  const deleteGiftMutation = useDeleteScenarioStageGift();
  const { data: giftsData, error: giftsError, isLoading: isGiftsLoading } =
    useGifts({
      order: 'ASC',
      skip: 0,
      take: 500,
    });
  const [selectedStage, setSelectedStage] = useState<RoleplayStage>(
    STAGES_IN_ORDER[0] ?? RoleplayStage.Acquaintance,
  );
  const [activeStage, setActiveStage] = useState<RoleplayStage | null>(null);
  const [isStageDrawerOpen, setIsStageDrawerOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [stageValues, setStageValues] = useState<StageDirectives>(EMPTY_STAGE);
  const [isGiftAddDrawerOpen, setIsGiftAddDrawerOpen] = useState(false);
  const [isGiftEditDrawerOpen, setIsGiftEditDrawerOpen] = useState(false);
  const [giftShowErrors, setGiftShowErrors] = useState(false);
  const [giftEditShowErrors, setGiftEditShowErrors] = useState(false);
  const [giftValues, setGiftValues] = useState({
    giftId: '',
    reason: '',
    buyText: '',
  });
  const [giftEditReason, setGiftEditReason] = useState('');
  const [giftEditBuyText, setGiftEditBuyText] = useState('');
  const [giftToEditId, setGiftToEditId] = useState<string | null>(null);
  const [giftToDeleteId, setGiftToDeleteId] = useState<string | null>(null);

  const selectedStageContent = scenario.stages?.[selectedStage] ?? EMPTY_STAGE;
  const stageGift = useMemo(
    () => scenario.gifts.find((gift) => gift.stage === selectedStage) ?? null,
    [scenario.gifts, selectedStage],
  );
  const giftOptions = useMemo(
    () =>
      (giftsData?.data ?? [])
        .filter((gift) => gift.isActive)
        .map((gift) => ({
          label: gift.name,
          value: gift.id,
        })),
    [giftsData?.data],
  );
  const giftValidationErrors = useMemo(() => {
    if (!giftShowErrors) return {};
    const errors: { giftId?: string; reason?: string } = {};
    if (!giftValues.giftId) errors.giftId = 'Select a gift.';
    if (!giftValues.reason.trim()) errors.reason = 'Enter a reason.';
    return errors;
  }, [giftShowErrors, giftValues.giftId, giftValues.reason]);
  const giftEditValidationErrors = useMemo(() => {
    if (!giftEditShowErrors) return {};
    const errors: { reason?: string } = {};
    if (!giftEditReason.trim()) errors.reason = 'Enter a reason.';
    return errors;
  }, [giftEditReason, giftEditShowErrors]);
  const isGiftValid = useMemo(
    () => Boolean(giftValues.giftId && giftValues.reason.trim()),
    [giftValues.giftId, giftValues.reason],
  );
  const isGiftEditValid = useMemo(
    () => Boolean(giftEditReason.trim()),
    [giftEditReason],
  );

  const validationErrors = useMemo(() => {
    if (!showErrors) return {};
    const errors: Partial<Record<keyof StageDirectives, string>> = {};
    if (!stageValues.toneAndBehavior.trim()) {
      errors.toneAndBehavior = 'Enter tone and behavior.';
    }
    if (!stageValues.restrictions.trim()) {
      errors.restrictions = 'Enter restrictions.';
    }
    if (!stageValues.environment.trim()) {
      errors.environment = 'Enter an environment.';
    }
    if (!stageValues.characterLook.trim()) {
      errors.characterLook = 'Enter a character look.';
    }
    if (!stageValues.goal.trim()) {
      errors.goal = 'Enter a goal.';
    }
    if (!stageValues.escalationTrigger.trim()) {
      errors.escalationTrigger = 'Enter an escalation trigger.';
    }
    return errors;
  }, [showErrors, stageValues]);

  const isStageValid = useMemo(
    () =>
      Boolean(
        stageValues.toneAndBehavior.trim() &&
        stageValues.restrictions.trim() &&
        stageValues.environment.trim() &&
        stageValues.characterLook.trim() &&
        stageValues.goal.trim() &&
        stageValues.escalationTrigger.trim(),
      ),
    [stageValues],
  );

  const openStageModal = (stage: RoleplayStage) => {
    const content = scenario.stages?.[stage] ?? EMPTY_STAGE;
    setStageValues({
      toneAndBehavior: content.toneAndBehavior ?? '',
      restrictions: content.restrictions ?? '',
      environment: content.environment ?? '',
      characterLook: content.characterLook ?? '',
      goal: content.goal ?? '',
      escalationTrigger: content.escalationTrigger ?? '',
    });
    setActiveStage(stage);
    setShowErrors(false);
    setIsStageDrawerOpen(true);
  };

  const closeStageDrawer = () => {
    if (updateStageMutation.isPending) return;
    setIsStageDrawerOpen(false);
  };

  const handleStageSave = async () => {
    if (!characterId || !activeStage) return;
    if (!isStageValid) {
      setShowErrors(true);
      return;
    }

    await updateStageMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
      stage: activeStage,
      payload: {
        toneAndBehavior: stageValues.toneAndBehavior.trim(),
        restrictions: stageValues.restrictions.trim(),
        environment: stageValues.environment.trim(),
        characterLook: stageValues.characterLook.trim(),
        goal: stageValues.goal.trim(),
        escalationTrigger: stageValues.escalationTrigger.trim(),
      },
    });

    setIsStageDrawerOpen(false);
  };

  const openGiftAddDrawer = () => {
    setGiftValues({ giftId: '', reason: '', buyText: '' });
    setGiftShowErrors(false);
    setIsGiftAddDrawerOpen(true);
  };

  const closeGiftAddDrawer = () => {
    if (createGiftMutation.isPending) return;
    setIsGiftAddDrawerOpen(false);
  };

  const openGiftEditDrawer = () => {
    if (!stageGift) return;
    setGiftToEditId(stageGift.id);
    setGiftEditReason(stageGift.reason ?? '');
    setGiftEditBuyText(stageGift.buyText ?? '');
    setGiftEditShowErrors(false);
    setIsGiftEditDrawerOpen(true);
  };

  const closeGiftEditDrawer = () => {
    if (updateGiftMutation.isPending) return;
    setIsGiftEditDrawerOpen(false);
  };

  const openGiftDeleteModal = () => {
    if (!stageGift) return;
    setGiftToDeleteId(stageGift.id);
  };

  const closeGiftDeleteModal = () => {
    if (deleteGiftMutation.isPending) return;
    setGiftToDeleteId(null);
  };

  const handleGiftAdd = async () => {
    if (!characterId || !isGiftValid) {
      setGiftShowErrors(true);
      return;
    }

    await createGiftMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
      stage: selectedStage,
      payload: {
        giftId: giftValues.giftId,
        reason: giftValues.reason.trim(),
        buyText: giftValues.buyText.trim(),
      },
    });

    setIsGiftAddDrawerOpen(false);
  };

  const handleGiftEdit = async () => {
    if (!characterId || !giftToEditId || !isGiftEditValid) {
      setGiftEditShowErrors(true);
      return;
    }

    await updateGiftMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
      stage: selectedStage,
      characterGiftId: giftToEditId,
      payload: {
        reason: giftEditReason.trim(),
        buyText: giftEditBuyText.trim(),
      },
    });

    setIsGiftEditDrawerOpen(false);
  };

  const handleGiftDelete = async () => {
    if (!characterId || !giftToDeleteId) return;

    await deleteGiftMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
      stage: selectedStage,
      characterGiftId: giftToDeleteId,
    });

    setGiftToDeleteId(null);
  };

  return (
    <div className={s.detailsCard}>
      <div className={s.detailsHeader}>
        <Typography variant="h3">
          <span className={s.emoji}>{scenario.emoji || ''}</span>
          {scenario.name}
        </Typography>
        <div className={s.detailsActions}>
          <Typography variant="meta" tone="muted">
            {scenario.updatedAt
              ? `Updated ${formatDate(scenario.updatedAt)}`
              : ''}
          </Typography>
          <IconButton
            aria-label="Edit scenario"
            icon={<PencilLineIcon />}
            tooltip="Edit scenario"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            disabled={!canEdit}
          />
        </div>
      </div>

      <Stack gap="16px">
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Opening image
          </Typography>
          {scenario.openingImage?.url ? (
            <img
              className={s.stageOpeningImage}
              src={scenario.openingImage.url}
              alt={`${scenario.name} opening`}
              loading="lazy"
            />
          ) : (
            <div className={s.stageOpeningImagePlaceholder}>
              <Typography variant="caption" tone="muted">
                No image
              </Typography>
            </div>
          )}
        </div>

        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Description
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.description || '-'}
          </Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Personality
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.personality || '-'}
          </Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Messaging style
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.messagingStyle || '-'}
          </Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Appearance
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.appearance || '-'}
          </Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Situation
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.situation || '-'}
          </Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Opening message
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.openingMessage || '-'}
          </Typography>
        </div>

        <div>
          <Typography variant="h3">Stages</Typography>
          <div className={s.stageLayout}>
            <div className={s.stageNav}>
              {STAGES_IN_ORDER.map((stage) => {
                const isActive = selectedStage === stage;
                return (
                  <Button
                    key={stage}
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className={s.stageNavButton}
                    onClick={() => setSelectedStage(stage)}
                  >
                    {STAGE_LABELS[stage]}
                  </Button>
                );
              })}
            </div>

            <div className={s.stageCard}>
              <div className={s.stageHeader}>
                <Typography variant="h3">
                  {STAGE_LABELS[selectedStage]}
                </Typography>
                <span className={s.stageEdit}>
                  <IconButton
                    aria-label={`Edit ${STAGE_LABELS[selectedStage]} stage`}
                    icon={<PencilLineIcon />}
                    tooltip={`Edit ${STAGE_LABELS[selectedStage]} stage`}
                    variant="ghost"
                    size="sm"
                    onClick={() => openStageModal(selectedStage)}
                    disabled={!characterId}
                  />
                </span>
              </div>

              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Tone and behavior
                </Typography>
                <Typography variant="body" className={s.multiline}>
                  {selectedStageContent.toneAndBehavior || '-'}
                </Typography>
              </div>
              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Restrictions
                </Typography>
                <Typography variant="body" className={s.multiline}>
                  {selectedStageContent.restrictions || '-'}
                </Typography>
              </div>
              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Environment
                </Typography>
                <Typography variant="body" className={s.multiline}>
                  {selectedStageContent.environment || '-'}
                </Typography>
              </div>
              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Character look
                </Typography>
                <Typography variant="body" className={s.multiline}>
                  {selectedStageContent.characterLook || '-'}
                </Typography>
              </div>
              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Goal
                </Typography>
                <Typography variant="body" className={s.multiline}>
                  {selectedStageContent.goal || '-'}
                </Typography>
              </div>
              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Escalation trigger
                </Typography>
                <Typography variant="body" className={s.multiline}>
                  {selectedStageContent.escalationTrigger || '-'}
                </Typography>
              </div>
              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Gift
                </Typography>
                <div className={s.stageGiftRow}>
                  <Typography variant="body" className={s.multiline}>
                    {stageGift
                      ? `${stageGift.gift?.name || '-'} - ${stageGift.reason || '-'}`
                      : '-'}
                  </Typography>
                  <Stack direction="horizontal" gap="8px">
                    {stageGift ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={openGiftEditDrawer}
                          disabled={!characterId}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          tone="danger"
                          onClick={openGiftDeleteModal}
                          disabled={!characterId}
                        >
                          Delete
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={openGiftAddDrawer}
                        disabled={!characterId}
                      >
                        Add
                      </Button>
                    )}
                  </Stack>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Stack>

      <Drawer
        open={isStageDrawerOpen}
        title={
          activeStage ? `Edit ${STAGE_LABELS[activeStage]} stage` : 'Edit stage'
        }
        className={s.stageDrawer}
        onOpenChange={(open) => {
          if (!open) {
            closeStageDrawer();
          } else {
            setIsStageDrawerOpen(true);
          }
        }}
      >
        <Stack gap="16px">
          <Field
            label="Tone and behavior"
            labelFor="stage-edit-tone"
            error={validationErrors.toneAndBehavior}
          >
            <Textarea
              id="stage-edit-tone"
              value={stageValues.toneAndBehavior}
              onChange={(event) =>
                setStageValues((prev) => ({
                  ...prev,
                  toneAndBehavior: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Goal"
            labelFor="stage-edit-goal"
            error={validationErrors.goal}
          >
            <Textarea
              id="stage-edit-goal"
              value={stageValues.goal}
              onChange={(event) =>
                setStageValues((prev) => ({
                  ...prev,
                  goal: event.target.value,
                }))
              }
              rows={2}
              fullWidth
            />
          </Field>

          <Field
            label="Restrictions"
            labelFor="stage-edit-restrictions"
            error={validationErrors.restrictions}
          >
            <Textarea
              id="stage-edit-restrictions"
              value={stageValues.restrictions}
              onChange={(event) =>
                setStageValues((prev) => ({
                  ...prev,
                  restrictions: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Environment"
            labelFor="stage-edit-environment"
            error={validationErrors.environment}
          >
            <Textarea
              id="stage-edit-environment"
              value={stageValues.environment}
              onChange={(event) =>
                setStageValues((prev) => ({
                  ...prev,
                  environment: event.target.value,
                }))
              }
              rows={2}
              fullWidth
            />
          </Field>

          <Field
            label="Character look"
            labelFor="stage-edit-look"
            error={validationErrors.characterLook}
          >
            <Textarea
              id="stage-edit-look"
              value={stageValues.characterLook}
              onChange={(event) =>
                setStageValues((prev) => ({
                  ...prev,
                  characterLook: event.target.value,
                }))
              }
              rows={2}
              fullWidth
            />
          </Field>

          <Field
            label="Escalation trigger"
            labelFor="stage-edit-trigger"
            error={validationErrors.escalationTrigger}
          >
            <Textarea
              id="stage-edit-trigger"
              value={stageValues.escalationTrigger}
              onChange={(event) =>
                setStageValues((prev) => ({
                  ...prev,
                  escalationTrigger: event.target.value,
                }))
              }
              rows={2}
              fullWidth
            />
          </Field>

          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeStageDrawer}
              disabled={updateStageMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStageSave}
              loading={updateStageMutation.isPending}
              disabled={!isStageValid || updateStageMutation.isPending}
            >
              Save
            </Button>
          </div>
        </Stack>
      </Drawer>

      <Drawer
        open={isGiftAddDrawerOpen}
        title={`Add gift for ${STAGE_LABELS[selectedStage]}`}
        className={s.giftDrawer}
        onOpenChange={(open) => {
          if (!open) {
            closeGiftAddDrawer();
          } else {
            setIsGiftAddDrawerOpen(true);
          }
        }}
      >
        <Stack gap="16px">
          <Field label="Gift" labelFor="stage-gift-create" error={giftValidationErrors.giftId}>
            <Select
              id="stage-gift-create"
              size="sm"
              options={giftOptions}
              value={giftValues.giftId}
              placeholder={isGiftsLoading ? 'Loading gifts...' : 'Select gift'}
              onChange={(value) =>
                setGiftValues((prev) => ({
                  ...prev,
                  giftId: value,
                }))
              }
              fullWidth
              disabled={isGiftsLoading || createGiftMutation.isPending}
              invalid={Boolean(giftValidationErrors.giftId)}
            />
          </Field>
          {giftsError ? (
            <Typography variant="caption" tone="warning">
              {giftsError instanceof Error
                ? giftsError.message
                : 'Unable to load gifts.'}
            </Typography>
          ) : null}
          <Field
            label="Reason"
            labelFor="stage-gift-create-reason"
            error={giftValidationErrors.reason}
          >
            <Textarea
              id="stage-gift-create-reason"
              value={giftValues.reason}
              onChange={(event) =>
                setGiftValues((prev) => ({
                  ...prev,
                  reason: event.target.value,
                }))
              }
              rows={2}
              fullWidth
              invalid={Boolean(giftValidationErrors.reason)}
            />
          </Field>
          <Field label="Buy text" labelFor="stage-gift-create-buy-text">
            <Textarea
              id="stage-gift-create-buy-text"
              value={giftValues.buyText}
              onChange={(event) =>
                setGiftValues((prev) => ({
                  ...prev,
                  buyText: event.target.value,
                }))
              }
              rows={2}
              fullWidth
            />
          </Field>
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeGiftAddDrawer}
              disabled={createGiftMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGiftAdd}
              loading={createGiftMutation.isPending}
              disabled={!isGiftValid || createGiftMutation.isPending}
            >
              Save
            </Button>
          </div>
        </Stack>
      </Drawer>

      <Drawer
        open={isGiftEditDrawerOpen}
        title={`Edit gift for ${STAGE_LABELS[selectedStage]}`}
        className={s.giftDrawer}
        onOpenChange={(open) => {
          if (!open) {
            closeGiftEditDrawer();
          } else {
            setIsGiftEditDrawerOpen(true);
          }
        }}
      >
        <Stack gap="16px">
          <Field
            label="Reason"
            labelFor="stage-gift-edit-reason"
            error={giftEditValidationErrors.reason}
          >
            <Textarea
              id="stage-gift-edit-reason"
              value={giftEditReason}
              onChange={(event) => setGiftEditReason(event.target.value)}
              rows={2}
              fullWidth
              invalid={Boolean(giftEditValidationErrors.reason)}
            />
          </Field>
          <Field label="Buy text" labelFor="stage-gift-edit-buy-text">
            <Textarea
              id="stage-gift-edit-buy-text"
              value={giftEditBuyText}
              onChange={(event) => setGiftEditBuyText(event.target.value)}
              rows={2}
              fullWidth
            />
          </Field>
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeGiftEditDrawer}
              disabled={updateGiftMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGiftEdit}
              loading={updateGiftMutation.isPending}
              disabled={!isGiftEditValid || updateGiftMutation.isPending}
            >
              Save
            </Button>
          </div>
        </Stack>
      </Drawer>

      <ConfirmModal
        open={Boolean(giftToDeleteId)}
        title="Delete gift?"
        description="This will remove the gift from this stage."
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteGiftMutation.isPending}
        onConfirm={handleGiftDelete}
        onClose={closeGiftDeleteModal}
      />
    </div>
  );
}
