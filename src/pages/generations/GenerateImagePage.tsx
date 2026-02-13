import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCharacterDetails, useCharacters } from '@/app/characters';
import { useCreateImgGeneration } from '@/app/img-generations';
import { useLoras } from '@/app/loras';
import {
  Alert,
  Button,
  Container,
  Field,
  FormRow,
  Input,
  Select,
  Stack,
  Textarea,
  Typography,
} from '@/atoms';
import { AppShell } from '@/components/templates';

import { SearchSelect } from './components/SearchSelect';
import s from './GenerateImagePage.module.scss';

const PAGE_SIZE = 50;

const SEARCH_DEBOUNCE_MS = 300;

function resolveSeed(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed);
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function GenerateImagePage() {
  const navigate = useNavigate();
  const createMutation = useCreateImgGeneration();

  const [values, setValues] = useState({
    characterId: '',
    scenarioId: '',
    loraId: '',
    seed: '',
    userRequest: '',
  });
  const [showErrors, setShowErrors] = useState(false);
  const [characterSearch, setCharacterSearch] = useState('');
  const [loraSearch, setLoraSearch] = useState('');
  const debouncedCharacterSearch = useDebouncedValue(
    characterSearch,
    SEARCH_DEBOUNCE_MS,
  );
  const debouncedLoraSearch = useDebouncedValue(loraSearch, SEARCH_DEBOUNCE_MS);

  const {
    data: characterData,
    error: characterError,
    isLoading: isCharactersLoading,
  } = useCharacters({
    search: debouncedCharacterSearch || undefined,
    order: 'ASC',
    skip: 0,
    take: PAGE_SIZE,
  });
  const {
    data: loraData,
    error: loraError,
    isLoading: isLorasLoading,
  } = useLoras({
    search: debouncedLoraSearch || undefined,
    order: 'DESC',
    skip: 0,
    take: PAGE_SIZE,
  });
  const { data: characterDetails, error: detailsError } = useCharacterDetails(
    values.characterId || null,
  );

  useEffect(() => {
    if (!values.characterId) return;
    setValues((prev) => ({
      ...prev,
      scenarioId: '',
    }));
  }, [values.characterId]);

  const scenarios = useMemo(
    () => (characterDetails ? characterDetails.scenarios : []),
    [characterDetails],
  );

  const errors = useMemo(() => {
    if (!showErrors) return {};
    const result: {
      characterId?: string;
      scenarioId?: string;
      loraId?: string;
      seed?: string;
      userRequest?: string;
    } = {};
    if (!values.characterId) result.characterId = 'Select a character.';
    if (!values.scenarioId) result.scenarioId = 'Select a scenario.';
    if (!values.loraId) result.loraId = 'Select a LoRA.';
    if (resolveSeed(values.seed) === null) result.seed = 'Enter a seed.';
    if (!values.userRequest.trim()) result.userRequest = 'Enter a request.';
    return result;
  }, [showErrors, values]);

  const isValid = useMemo(
    () =>
      Boolean(
        values.characterId &&
        values.scenarioId &&
        values.loraId &&
        resolveSeed(values.seed) !== null &&
        values.userRequest.trim(),
      ),
    [values],
  );

  const handleSubmit = async () => {
    if (!isValid) {
      setShowErrors(true);
      return;
    }
    const seedValue = resolveSeed(values.seed);
    if (seedValue === null) return;
    const response = await createMutation.mutateAsync({
      characterId: values.characterId,
      scenarioId: values.scenarioId,
      loraId: values.loraId,
      seed: seedValue,
      userRequest: values.userRequest.trim(),
    });
    if (response?.id) {
      navigate(`/generations/${response.id}`);
    }
  };

  const blockingError = characterError || loraError || detailsError;
  const errorMessage =
    blockingError instanceof Error
      ? blockingError.message
      : 'Unable to load generation data.';

  const characterOptions = (characterData?.data ?? []).map((character) => ({
    id: character.id,
    label: character.name,
    meta: character.id,
  }));
  const loraOptions = (loraData?.data ?? []).map((lora) => ({
    id: lora.id,
    label: lora.fileName,
    meta: lora.id,
  }));

  const loraSeedMap = useMemo(() => {
    const map = new Map<string, number>();
    (loraData?.data ?? []).forEach((lora) => {
      map.set(lora.id, lora.seed);
    });
    return map;
  }, [loraData?.data]);
  const scenarioOptions = scenarios.map((scenario) => ({
    label: scenario.name,
    value: scenario.id,
  }));

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Generate image</Typography>
          </div>
          <Button variant="secondary" onClick={() => navigate('/generations')}>
            Cancel
          </Button>
        </div>

        {blockingError ? (
          <Alert title="Unable to load data" description={errorMessage} />
        ) : null}

        <Stack gap="16px">
          <FormRow columns={2}>
            <Field
              label="Character"
              labelFor="generation-character"
              error={errors.characterId}
            >
              <SearchSelect
                id="generation-character"
                options={characterOptions}
                value={values.characterId}
                search={characterSearch}
                onSearchChange={setCharacterSearch}
                onSelect={(value) =>
                  setValues((prev) => ({ ...prev, characterId: value }))
                }
                placeholder="Select character"
                disabled={createMutation.isPending}
                loading={isCharactersLoading}
                invalid={Boolean(errors.characterId)}
              />
            </Field>
            <Field
              label="LoRA"
              labelFor="generation-lora"
              error={errors.loraId}
            >
              <SearchSelect
                id="generation-lora"
                options={loraOptions}
                value={values.loraId}
                search={loraSearch}
                onSearchChange={setLoraSearch}
                onSelect={(value) =>
                  setValues((prev) => ({
                    ...prev,
                    loraId: value,
                    seed:
                      loraSeedMap.get(value) !== undefined
                        ? String(loraSeedMap.get(value))
                        : prev.seed,
                  }))
                }
                placeholder="Select LoRA"
                disabled={createMutation.isPending}
                loading={isLorasLoading}
                invalid={Boolean(errors.loraId)}
              />
            </Field>
          </FormRow>

          <Field
            label="Scenario"
            labelFor="generation-scenario"
            error={errors.scenarioId}
          >
            <Select
              id="generation-scenario"
              size="sm"
              options={scenarioOptions}
              value={values.scenarioId}
              placeholder={
                values.characterId ? 'Select scenario' : 'Select character first'
              }
              onChange={(value) =>
                setValues((prev) => ({ ...prev, scenarioId: value }))
              }
              fullWidth
              disabled={!values.characterId || createMutation.isPending}
              invalid={Boolean(errors.scenarioId)}
            />
          </Field>

          <FormRow columns={2}>
            <Field label="Seed" labelFor="generation-seed" error={errors.seed}>
              <Input
                id="generation-seed"
                size="sm"
                type="number"
                value={values.seed}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, seed: event.target.value }))
                }
                fullWidth
                disabled={createMutation.isPending}
                invalid={Boolean(errors.seed)}
              />
            </Field>
          </FormRow>

          <Field
            label="User request"
            labelFor="generation-request"
            error={errors.userRequest}
          >
            <Textarea
              id="generation-request"
              invalid={Boolean(errors.userRequest)}
              value={values.userRequest}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  userRequest: event.target.value,
                }))
              }
              placeholder="Describe what to generate..."
              fullWidth
              disabled={createMutation.isPending}
            />
          </Field>
        </Stack>

        <div className={s.actions}>
          <Button
            onClick={handleSubmit}
            loading={createMutation.isPending}
            disabled={!isValid || createMutation.isPending}
          >
            Generate
          </Button>
        </div>
      </Container>
    </AppShell>
  );
}
