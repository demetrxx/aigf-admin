import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useDeletePrompt,
  usePromptDetails,
  useUpdatePrompt,
} from '@/app/prompts';
import {
  Alert,
  Button,
  Container,
  Field,
  FormRow,
  Input,
  Select,
  Skeleton,
  Stack,
  Switch,
  Textarea,
  Typography,
} from '@/atoms';
import { PromptType } from '@/common/types';
import { ConfirmModal } from '@/components/molecules/confirm-modal/ConfirmModal';
import { AppShell } from '@/components/templates';

import s from './PromptFormPage.module.scss';

const TYPE_OPTIONS = [
  { label: 'Chat', value: PromptType.Chat },
  { label: 'Image', value: PromptType.Image },
];

export function PromptUpdatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const promptId = id ?? '';
  const {
    data,
    error,
    isLoading,
    refetch: refetchDetails,
  } = usePromptDetails(promptId, Boolean(promptId));
  const updateMutation = useUpdatePrompt();
  const deleteMutation = useDeletePrompt();

  const [values, setValues] = useState({
    name: '',
    text: '',
    isActive: true,
  });
  const [showErrors, setShowErrors] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    setValues({
      name: data.name ?? '',
      text: data.text ?? '',
      isActive: data.isActive,
    });
    setShowErrors(false);
  }, [data]);

  const errors = useMemo(() => {
    if (!showErrors) return {};
    const next: { name?: string; text?: string } = {};
    if (!values.name.trim()) {
      next.name = 'Enter a name.';
    }
    if (!values.text.trim()) {
      next.text = 'Enter prompt text.';
    }
    return next;
  }, [showErrors, values.name, values.text]);

  const isValid = useMemo(
    () => Boolean(values.name.trim() && values.text.trim()),
    [values.name, values.text],
  );

  const handleUpdate = async () => {
    if (!data) return;
    const name = values.name.trim();
    const text = values.text.trim();
    const nextErrors = {
      name: name ? undefined : 'Enter a name.',
      text: text ? undefined : 'Enter prompt text.',
    };
    if (nextErrors.name || nextErrors.text) {
      setShowErrors(true);
      return;
    }
    await updateMutation.mutateAsync({
      id: data.id,
      payload: {
        name,
        text,
        isActive: values.isActive,
      },
    });
  };

  const handleDelete = async () => {
    if (!data) return;
    await deleteMutation.mutateAsync(data.id);
    setIsDeleteOpen(false);
    navigate('/prompts');
  };

  const handleUseAsTemplate = () => {
    if (!data) return;
    navigate('/prompts/new', {
      state: {
        template: {
          name: values.name,
          text: values.text,
          type: data.type,
          isActive: values.isActive,
        },
      },
    });
  };

  const isReady = Boolean(data);

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Update prompt</Typography>
            {data ? (
              <Typography variant="meta" tone="muted">
                {data.type}:v{data.version}
              </Typography>
            ) : null}
          </div>
          <Button variant="secondary" onClick={() => navigate('/prompts')}>
            Back to prompts
          </Button>
        </div>

        {error ? (
          <Alert
            title="Unable to load prompt"
            description={
              error instanceof Error ? error.message : 'Please try again.'
            }
            tone="warning"
          />
        ) : null}

        {!isReady && isLoading ? (
          <Stack gap="16px" className={s.form}>
            <FormRow columns={2}>
              <Skeleton width={220} height={36} />
              <Skeleton width={220} height={36} />
            </FormRow>
            <Skeleton width={640} height={180} />
            <Skeleton width={160} height={28} />
            <Skeleton width={220} height={20} />
          </Stack>
        ) : (
          <Stack gap="16px" className={s.form}>
            <FormRow columns={3}>
              <Field
                label="Name"
                labelFor="prompt-edit-name"
                error={errors.name}
              >
                <Input
                  id="prompt-edit-name"
                  size="sm"
                  value={values.name}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  disabled={!isReady || updateMutation.isPending}
                  fullWidth
                />
              </Field>
              <Field label="Type" labelFor="prompt-edit-type">
                <Select
                  id="prompt-edit-type"
                  size="sm"
                  options={TYPE_OPTIONS}
                  value={data?.type ?? PromptType.Chat}
                  disabled
                  fullWidth
                />
              </Field>
              <Field label="Status" labelFor="prompt-edit-status">
                <Switch
                  id="prompt-edit-status"
                  checked={values.isActive}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      isActive: event.target.checked,
                    }))
                  }
                  disabled={!isReady || updateMutation.isPending}
                  label={values.isActive ? 'Active' : 'Inactive'}
                />
              </Field>
            </FormRow>

            <Field label="Text" labelFor="prompt-edit-text" error={errors.text}>
              <Textarea
                id="prompt-edit-text"
                size="sm"
                value={values.text}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    text: event.target.value,
                  }))
                }
                rows={19}
                disabled={!isReady || updateMutation.isPending}
                fullWidth
              />
            </Field>

            <div className={s.actions}>
              <Button
                variant="text"
                onClick={handleUseAsTemplate}
                disabled={!isReady || updateMutation.isPending}
              >
                Use as template
              </Button>
              <Button
                variant="ghost"
                tone="danger"
                onClick={() => setIsDeleteOpen(true)}
                disabled={!isReady || deleteMutation.isPending}
              >
                Delete
              </Button>
              <Button
                onClick={handleUpdate}
                loading={updateMutation.isPending}
                disabled={
                  !isValid ||
                  updateMutation.isPending ||
                  Boolean(errors.name || errors.text) ||
                  !isReady ||
                  deleteMutation.isPending
                }
              >
                Save changes
              </Button>
              {error ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => refetchDetails()}
                >
                  Retry
                </Button>
              ) : null}
            </div>
          </Stack>
        )}
      </Container>
      <ConfirmModal
        open={isDeleteOpen}
        title="Delete prompt"
        description={
          data
            ? `Delete ${data.name}? This cannot be undone.`
            : 'Delete this prompt? This cannot be undone.'
        }
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setIsDeleteOpen(false)}
      />
    </AppShell>
  );
}
