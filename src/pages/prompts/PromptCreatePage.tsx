import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useCreatePrompt } from '@/app/prompts';
import { PlusIcon } from '@/assets/icons';
import {
  Button,
  Container,
  Field,
  FormRow,
  Input,
  Select,
  Stack,
  Switch,
  Textarea,
  Typography,
} from '@/atoms';
import { PromptType } from '@/common/types';
import { AppShell } from '@/components/templates';

import s from './PromptFormPage.module.scss';

const TYPE_OPTIONS = [
  { label: 'Chat', value: PromptType.Chat },
  { label: 'Image', value: PromptType.Image },
];

export function PromptCreatePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const createMutation = useCreatePrompt();
  const template = (
    location.state as
      | {
          template?: {
            name: string;
            text: string;
            type: PromptType;
            isActive: boolean;
          };
        }
      | null
  )?.template;
  const initialValues = useMemo(
    () => ({
      name: template?.name ?? '',
      text: template?.text ?? '',
      type: template?.type ?? PromptType.Chat,
      isActive: template?.isActive ?? false,
    }),
    [template],
  );
  const [values, setValues] = useState(initialValues);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    setValues(initialValues);
    setShowErrors(false);
  }, [initialValues]);

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

  const handleCreate = async () => {
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
    await createMutation.mutateAsync({
      name,
      text,
      type: values.type,
      isActive: values.isActive,
    });
    navigate('/prompts');
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Create prompt</Typography>
          </div>
          <Button variant="ghost" onClick={() => navigate('/prompts')}>
            Back to prompts
          </Button>
        </div>

        <Stack gap="16px" className={s.form}>
          <FormRow columns={3}>
            <Field
              label="Name"
              labelFor="prompt-create-name"
              error={errors.name}
            >
              <Input
                id="prompt-create-name"
                size="sm"
                value={values.name}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>

            <Field label="Type" labelFor="prompt-create-type">
              <Select
                id="prompt-create-type"
                size="sm"
                options={TYPE_OPTIONS}
                value={values.type}
                onChange={(value) =>
                  setValues((prev) => ({
                    ...prev,
                    type: value as PromptType,
                  }))
                }
                fullWidth
              />
            </Field>

            <Field label="Status" labelFor="prompt-create-status">
              <Switch
                id="prompt-create-status"
                checked={values.isActive}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    isActive: event.target.checked,
                  }))
                }
                label={values.isActive ? 'Active' : 'Inactive'}
              />
            </Field>
          </FormRow>

          <Field label="Text" labelFor="prompt-create-text" error={errors.text}>
            <Textarea
              id="prompt-create-text"
              size="sm"
              autoComplete="off"
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              dataGramm="false"
              dataGramm_editor="false"
              spellcheck="false"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              value={values.text}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  text: event.target.value,
                }))
              }
              rows={20}
              fullWidth
            />
          </Field>

          <div className={s.actions}>
            <Button
              variant="secondary"
              onClick={() => navigate('/prompts')}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              iconLeft={<PlusIcon />}
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={
                !isValid ||
                createMutation.isPending ||
                Boolean(errors.name || errors.text)
              }
            >
              Create prompt
            </Button>
          </div>
        </Stack>
      </Container>
    </AppShell>
  );
}
