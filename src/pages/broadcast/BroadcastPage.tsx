import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useEffect, useMemo, useState } from 'react';

import { useCreateBroadcast } from '@/app/broadcast';
import { notifyError } from '@/app/toast';
import { useUsers } from '@/app/users';
import { SendIcon } from '@/assets/icons';
import {
  Button,
  Checkbox,
  Container,
  Field,
  FormRow,
  Input,
  Modal,
  Popover,
  Select,
  Stack,
  Switch,
  Tag,
  Textarea,
  Typography,
} from '@/atoms';
import type {
  BroadcastDto,
  BroadcastFilters,
  IFile,
  ITgUser,
} from '@/common/types';
import { FileDir, MessageActionType } from '@/common/types';
import { FileUpload } from '@/components/molecules';
import { AppShell } from '@/components/templates';

import s from './BroadcastPage.module.scss';

type AudienceMode = 'all' | 'filters' | 'users';
type SubscriptionFilter = 'any' | 'subscribed' | 'unsubscribed';

type ValidationErrors = {
  audience?: string;
  messageText?: string;
  lastVisitedAfter?: string;
  lastVisitedBefore?: string;
  actionText?: string;
  actionValue?: string;
};

const USER_SEARCH_DEBOUNCE_MS = 300;

const audienceOptions = [
  { label: 'All users', value: 'all' },
  { label: 'Users by filters', value: 'filters' },
  { label: 'Specific users', value: 'users' },
];

const subscriptionOptions = [
  { label: 'Any', value: 'any' },
  { label: 'Subscribed only', value: 'subscribed' },
  { label: 'Not subscribed', value: 'unsubscribed' },
];

const actionTypeOptions = [
  { label: 'Callback', value: MessageActionType.Callback },
  { label: 'URL', value: MessageActionType.Url },
  { label: 'Open app', value: MessageActionType.App },
];

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function formatUserName(user: ITgUser) {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) return fullName;
  const username = user.username?.trim();
  if (username) return `@${username}`;
  return 'Unknown user';
}

function formatUserMeta(user: ITgUser) {
  const username = user.username?.trim();
  if (username) {
    return `@${username} / ${user.id}`;
  }
  return user.id;
}

function parseDateValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseUserIds(value: string) {
  const ids = value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function BroadcastPage() {
  const createMutation = useCreateBroadcast();

  const [audienceMode, setAudienceMode] = useState<AudienceMode>('all');
  const [subscriptionFilter, setSubscriptionFilter] =
    useState<SubscriptionFilter>('any');
  const [lastVisitedAfter, setLastVisitedAfter] = useState('');
  const [lastVisitedBefore, setLastVisitedBefore] = useState('');

  const [userSearch, setUserSearch] = useState('');
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUsersMeta, setSelectedUsersMeta] = useState<
    Record<string, { label: string; meta: string }>
  >({});
  const [bulkUserIds, setBulkUserIds] = useState('');

  const [messageText, setMessageText] = useState('');
  const [imageFile, setImageFile] = useState<IFile | null>(null);

  const [isActionEnabled, setIsActionEnabled] = useState(false);
  const [actionText, setActionText] = useState('');
  const [actionType, setActionType] = useState<MessageActionType>(
    MessageActionType.Callback,
  );
  const [actionValue, setActionValue] = useState('');

  const [showErrors, setShowErrors] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [allUsersConfirmed, setAllUsersConfirmed] = useState(false);

  const debouncedUserSearch = useDebouncedValue(
    userSearch,
    USER_SEARCH_DEBOUNCE_MS,
  );
  const usersQueryParams = useMemo(
    () => ({
      search: debouncedUserSearch.trim() || undefined,
      order: 'DESC',
      skip: 0,
      take: 20,
    }),
    [debouncedUserSearch],
  );
  const { data: usersData, isLoading: isUsersLoading } = useUsers(
    usersQueryParams,
    audienceMode === 'users',
  );
  const userOptions = useMemo(() => usersData?.data ?? [], [usersData?.data]);

  const selectedUserIdSet = useMemo(
    () => new Set(selectedUserIds),
    [selectedUserIds],
  );
  const availableUserOptions = useMemo(
    () => userOptions.filter((user) => !selectedUserIdSet.has(user.id)),
    [userOptions, selectedUserIdSet],
  );

  const parsedBulkUserIds = useMemo(
    () => parseUserIds(bulkUserIds),
    [bulkUserIds],
  );
  const selectedUsers = useMemo(
    () =>
      selectedUserIds.map((id) => ({
        id,
        label: selectedUsersMeta[id]?.label ?? id,
        meta: selectedUsersMeta[id]?.meta ?? 'Manual ID',
      })),
    [selectedUserIds, selectedUsersMeta],
  );

  const handleUserPickerOpenChange = (open: boolean) => {
    setIsUserPickerOpen(open);
    if (!open) {
      setUserSearch('');
    }
  };

  const validationErrors = useMemo<ValidationErrors>(() => {
    const errors: ValidationErrors = {};

    if (!messageText.trim()) {
      errors.messageText = 'Enter message text.';
    }

    if (audienceMode === 'users' && selectedUserIds.length === 0) {
      errors.audience = 'Select at least one user.';
    }

    if (audienceMode === 'filters') {
      const hasSubscriptionFilter = subscriptionFilter !== 'any';
      const hasAfterInput = Boolean(lastVisitedAfter.trim());
      const hasBeforeInput = Boolean(lastVisitedBefore.trim());

      const parsedAfter = parseDateValue(lastVisitedAfter);
      const parsedBefore = parseDateValue(lastVisitedBefore);

      if (hasAfterInput && !parsedAfter) {
        errors.lastVisitedAfter = 'Invalid date and time.';
      }
      if (hasBeforeInput && !parsedBefore) {
        errors.lastVisitedBefore = 'Invalid date and time.';
      }
      if (
        parsedAfter &&
        parsedBefore &&
        parsedAfter.getTime() > parsedBefore.getTime()
      ) {
        errors.lastVisitedBefore =
          '"Last visited before" must be after "Last visited after".';
      }
      if (!hasSubscriptionFilter && !hasAfterInput && !hasBeforeInput) {
        errors.audience = 'Set at least one filter or choose all users.';
      }
    }

    if (isActionEnabled) {
      const nextActionText = actionText.trim();
      const nextActionValue = actionValue.trim();

      if (!nextActionText) {
        errors.actionText = 'Enter action text.';
      }
      if (!nextActionValue) {
        errors.actionValue = 'Enter action value.';
      } else if (
        actionType === MessageActionType.Url &&
        !isHttpUrl(nextActionValue)
      ) {
        errors.actionValue = 'Enter a valid http/https URL.';
      }
    }

    return errors;
  }, [
    actionText,
    actionType,
    actionValue,
    audienceMode,
    isActionEnabled,
    lastVisitedAfter,
    lastVisitedBefore,
    messageText,
    selectedUserIds.length,
    subscriptionFilter,
  ]);

  const errors = showErrors ? validationErrors : {};
  const isValid = Object.keys(validationErrors).length === 0;

  const closeConfirmModal = () => {
    if (createMutation.isPending) return;
    setIsConfirmOpen(false);
  };

  const resetForm = () => {
    setAudienceMode('all');
    setSubscriptionFilter('any');
    setLastVisitedAfter('');
    setLastVisitedBefore('');
    setUserSearch('');
    setIsUserPickerOpen(false);
    setSelectedUserIds([]);
    setSelectedUsersMeta({});
    setBulkUserIds('');
    setMessageText('');
    setImageFile(null);
    setIsActionEnabled(false);
    setActionText('');
    setActionType(MessageActionType.Callback);
    setActionValue('');
    setShowErrors(false);
    setIsConfirmOpen(false);
    setAllUsersConfirmed(false);
  };

  const addSelectedUser = (user: ITgUser) => {
    setSelectedUserIds((prev) =>
      prev.includes(user.id) ? prev : [...prev, user.id],
    );
    setSelectedUsersMeta((prev) => ({
      ...prev,
      [user.id]: {
        label: formatUserName(user),
        meta: formatUserMeta(user),
      },
    }));
    setUserSearch('');
    setIsUserPickerOpen(false);
  };

  const addBulkUsers = () => {
    if (parsedBulkUserIds.length === 0) return;
    setSelectedUserIds((prev) =>
      Array.from(new Set([...prev, ...parsedBulkUserIds])),
    );
    setSelectedUsersMeta((prev) => {
      const next = { ...prev };
      for (const userId of parsedBulkUserIds) {
        if (!next[userId]) {
          next[userId] = { label: userId, meta: 'Manual ID' };
        }
      }
      return next;
    });
    setBulkUserIds('');
  };

  const removeSelectedUser = (id: string) => {
    setSelectedUserIds((prev) => prev.filter((userId) => userId !== id));
  };

  const openConfirmModal = () => {
    setShowErrors(true);
    if (!isValid) return;
    setAllUsersConfirmed(false);
    setIsConfirmOpen(true);
  };

  const buildFilters = (): BroadcastFilters => {
    if (audienceMode === 'all') {
      return {};
    }

    if (audienceMode === 'users') {
      return { userIds: selectedUserIds };
    }

    const filters: BroadcastFilters = {};
    if (subscriptionFilter === 'subscribed') {
      filters.subscribed = true;
    } else if (subscriptionFilter === 'unsubscribed') {
      filters.subscribed = false;
    }

    const parsedAfter = parseDateValue(lastVisitedAfter);
    if (parsedAfter) {
      filters.lastVisitedAfter = parsedAfter;
    }

    const parsedBefore = parseDateValue(lastVisitedBefore);
    if (parsedBefore) {
      filters.lastVisitedBefore = parsedBefore;
    }

    return filters;
  };

  const sendBroadcast = async () => {
    if (audienceMode === 'all' && !allUsersConfirmed) return;

    const payload: BroadcastDto = {
      message: {
        text: messageText.trim(),
        imgId: imageFile?.id || undefined,
        action: isActionEnabled
          ? {
              text: actionText.trim(),
              value: actionValue.trim(),
              type: actionType,
            }
          : undefined,
      },
      filters: buildFilters(),
    };

    try {
      await createMutation.mutateAsync(payload);
      resetForm();
    } catch {
      // Errors are handled in mutation callbacks.
    }
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Broadcast</Typography>
            <Typography variant="meta" tone="muted">
              Send one message to a specific audience segment.
            </Typography>
          </div>

          <div className={s.headerActions}>
            <Button
              iconLeft={<SendIcon />}
              onClick={openConfirmModal}
              loading={createMutation.isPending}
              disabled={createMutation.isPending}
            >
              Review and send
            </Button>
            <Button
              variant="secondary"
              onClick={resetForm}
              disabled={createMutation.isPending}
            >
              Reset
            </Button>
          </div>
        </div>

        <Stack gap="16px" className={s.form}>
          <div className={s.panel}>
            <div className={s.panelHeader}>
              <Typography variant="h3">Audience</Typography>
              <Typography variant="caption" tone="muted">
                Choose who should receive this broadcast.
              </Typography>
            </div>

            <Stack gap="12px">
              <Field label="Send to" error={errors.audience}>
                <Select
                  size="sm"
                  value={audienceMode}
                  options={audienceOptions}
                  onChange={(value) => setAudienceMode(value as AudienceMode)}
                  disabled={createMutation.isPending}
                  fullWidth
                />
              </Field>

              {audienceMode === 'filters' ? (
                <FormRow columns={3}>
                  <Field label="Subscription status">
                    <Select
                      value={subscriptionFilter}
                      options={subscriptionOptions}
                      onChange={(value) =>
                        setSubscriptionFilter(value as SubscriptionFilter)
                      }
                      disabled={createMutation.isPending}
                      fullWidth
                    />
                  </Field>
                  <Field
                    label="Last visited after"
                    error={errors.lastVisitedAfter}
                  >
                    <Input
                      type="datetime-local"
                      size="sm"
                      value={lastVisitedAfter}
                      onChange={(event) =>
                        setLastVisitedAfter(event.target.value)
                      }
                      disabled={createMutation.isPending}
                      invalid={Boolean(errors.lastVisitedAfter)}
                      fullWidth
                    />
                  </Field>
                  <Field
                    label="Last visited before"
                    error={errors.lastVisitedBefore}
                  >
                    <Input
                      type="datetime-local"
                      size="sm"
                      value={lastVisitedBefore}
                      onChange={(event) =>
                        setLastVisitedBefore(event.target.value)
                      }
                      disabled={createMutation.isPending}
                      invalid={Boolean(errors.lastVisitedBefore)}
                      fullWidth
                    />
                  </Field>
                </FormRow>
              ) : null}

              {audienceMode === 'users' ? (
                <Stack gap="12px">
                  <Field
                    label="Find users"
                    hint="Search by name, username, or ID."
                  >
                    <Popover
                      open={isUserPickerOpen}
                      onOpenChange={handleUserPickerOpenChange}
                      disableTriggerToggle
                      trigger={
                        <div className={s.userPickerTrigger}>
                          <Input
                            size="sm"
                            value={userSearch}
                            onFocus={() => setIsUserPickerOpen(true)}
                            onChange={(event) => {
                              setUserSearch(event.target.value);
                              if (!isUserPickerOpen) setIsUserPickerOpen(true);
                            }}
                            iconLeft={<MagnifyingGlassIcon />}
                            placeholder="Start typing a user..."
                            disabled={createMutation.isPending}
                            fullWidth
                          />
                        </div>
                      }
                      content={
                        <div className={s.userPickerMenu}>
                          {isUsersLoading ? (
                            <Typography variant="caption" tone="muted">
                              Loading users...
                            </Typography>
                          ) : availableUserOptions.length === 0 ? (
                            <Typography variant="caption" tone="muted">
                              No users found.
                            </Typography>
                          ) : (
                            <div className={s.userPickerList}>
                              {availableUserOptions.map((user) => {
                                const userName = formatUserName(user);
                                const userMeta = formatUserMeta(user);
                                return (
                                  <Button
                                    key={user.id}
                                    variant="ghost"
                                    size="sm"
                                    className={s.userOption}
                                    onClick={() => addSelectedUser(user)}
                                    fullWidth
                                  >
                                    <span className={s.userOptionContent}>
                                      <Typography as="span" variant="control">
                                        {userName}
                                      </Typography>
                                      <Typography
                                        as="span"
                                        variant="caption"
                                        tone="muted"
                                      >
                                        {userMeta}
                                      </Typography>
                                    </span>
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      }
                    />
                  </Field>

                  <Field
                    label="Paste user IDs"
                    hint="Use spaces, commas, or new lines as separators."
                  >
                    <Stack gap="8px">
                      <Textarea
                        size="sm"
                        rows={2}
                        value={bulkUserIds}
                        onChange={(event) => setBulkUserIds(event.target.value)}
                        placeholder="123456789&#10;987654321"
                        disabled={createMutation.isPending}
                        fullWidth
                      />
                      <div className={s.inlineActions}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={addBulkUsers}
                          disabled={
                            createMutation.isPending ||
                            parsedBulkUserIds.length === 0
                          }
                        >
                          Add IDs
                        </Button>
                        <Typography variant="caption" tone="muted">
                          {parsedBulkUserIds.length > 0
                            ? `${parsedBulkUserIds.length} IDs ready`
                            : 'No IDs parsed'}
                        </Typography>
                      </div>
                    </Stack>
                  </Field>

                  {selectedUsers.length > 0 ? (
                    <div className={s.selectedUsers}>
                      {selectedUsers.map((user) => (
                        <Tag
                          key={user.id}
                          onRemove={() => removeSelectedUser(user.id)}
                        >
                          {`${user.label} (${user.id})`}
                        </Tag>
                      ))}
                    </div>
                  ) : null}
                </Stack>
              ) : null}
            </Stack>
          </div>

          <div className={s.panel}>
            <div className={s.panelHeader}>
              <Typography variant="h3">Message</Typography>
              <Typography variant="caption" tone="muted">
                Compose the broadcast message payload.
              </Typography>
            </div>

            <Stack gap="12px">
              <Field
                label="Text"
                error={errors.messageText}
                labelFor="broadcast-message-text"
              >
                <Textarea
                  id="broadcast-message-text"
                  size="sm"
                  rows={3}
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  invalid={Boolean(errors.messageText)}
                  disabled={createMutation.isPending}
                  fullWidth
                />
              </Field>

              <FileUpload
                label="Image file (optional)"
                folder={FileDir.Public}
                value={imageFile}
                disabled={createMutation.isPending}
                onChange={(file) => setImageFile(file)}
                onError={(message) =>
                  notifyError(new Error(message), 'Unable to upload image.')
                }
              />

              <Field label="Action button">
                <Switch
                  checked={isActionEnabled}
                  onChange={(event) => setIsActionEnabled(event.target.checked)}
                  label={isActionEnabled ? 'Enabled' : 'Disabled'}
                  disabled={createMutation.isPending}
                />
              </Field>

              {isActionEnabled ? (
                <FormRow columns={3}>
                  <Field
                    label="Action text"
                    error={errors.actionText}
                    labelFor="broadcast-action-text"
                  >
                    <Input
                      id="broadcast-action-text"
                      size="sm"
                      value={actionText}
                      onChange={(event) => setActionText(event.target.value)}
                      invalid={Boolean(errors.actionText)}
                      disabled={createMutation.isPending}
                      fullWidth
                    />
                  </Field>
                  <Field label="Action type" labelFor="broadcast-action-type">
                    <Select
                      id="broadcast-action-type"
                      value={actionType}
                      options={actionTypeOptions}
                      onChange={(value) =>
                        setActionType(value as MessageActionType)
                      }
                      disabled={createMutation.isPending}
                      fullWidth
                    />
                  </Field>
                  <Field
                    label="Action value"
                    error={errors.actionValue}
                    labelFor="broadcast-action-value"
                  >
                    <Input
                      id="broadcast-action-value"
                      size="sm"
                      value={actionValue}
                      onChange={(event) => setActionValue(event.target.value)}
                      invalid={Boolean(errors.actionValue)}
                      disabled={createMutation.isPending}
                      fullWidth
                    />
                  </Field>
                </FormRow>
              ) : null}
            </Stack>
          </div>
        </Stack>
      </Container>

      <Modal
        open={isConfirmOpen}
        title="Confirm broadcast"
        onClose={closeConfirmModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeConfirmModal}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              iconLeft={<SendIcon />}
              onClick={sendBroadcast}
              loading={createMutation.isPending}
              disabled={
                createMutation.isPending ||
                (audienceMode === 'all' && !allUsersConfirmed)
              }
            >
              Send broadcast
            </Button>
          </div>
        }
      >
        <Stack gap="12px">
          <Typography variant="body">
            This action sends the broadcast immediately and cannot be undone.
          </Typography>
          {audienceMode === 'all' ? (
            <Checkbox
              checked={allUsersConfirmed}
              onChange={(event) => setAllUsersConfirmed(event.target.checked)}
              label="I understand this message will be sent to all users."
              disabled={createMutation.isPending}
            />
          ) : null}
        </Stack>
      </Modal>
    </AppShell>
  );
}
