import { DownloadIcon } from '@radix-ui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import {
  useCreateDatasetItem,
  useDatasetDetails,
  useDeleteDataset,
  useUpdateDataset,
} from '@/app/datasets';
import { notifyError } from '@/app/toast';
import {
  Alert,
  Button,
  Container,
  EmptyState,
  Field,
  FormRow,
  Grid,
  IconButton,
  Input,
  Modal,
  Select,
  Skeleton,
  Stack,
  Textarea,
  Typography,
} from '@/atoms';
import {
  DatasetType,
  FileDir,
  type IDatasetDetails,
  type IDatasetItem,
  type IFile,
} from '@/common/types';
import { capitalize } from '@/common/utils';
import { ConfirmModal } from '@/components/molecules/confirm-modal/ConfirmModal';
import { FileUpload } from '@/components/molecules/file-upload/FileUpload';
import { AppShell } from '@/components/templates';

import s from './DatasetDetailsPage.module.scss';

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return dateTimeFormatter.format(parsed);
}

type LocationState = {
  dataset?: IDatasetDetails;
};

export function DatasetDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const datasetId = id ?? '';
  const location = useLocation();
  const state = location.state as LocationState | null;
  const initialDataset =
    state?.dataset?.id === datasetId ? state.dataset : null;

  const { data, error, isLoading, refetch } = useDatasetDetails(
    datasetId,
    initialDataset ?? undefined,
  );

  const updateMutation = useUpdateDataset();
  const deleteMutation = useDeleteDataset();
  const createItemMutation = useCreateDatasetItem();

  const [activeItem, setActiveItem] = useState<IDatasetItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editShowErrors, setEditShowErrors] = useState(false);
  const [addItemShowErrors, setAddItemShowErrors] = useState(false);
  const [addItemFile, setAddItemFile] = useState<IFile | null>(null);

  const [editValues, setEditValues] = useState({
    name: '',
    type: DatasetType.Character,
    description: '',
  });
  const [addItemValues, setAddItemValues] = useState({
    prompt: '',
    fileId: '',
  });

  useEffect(() => {
    if (!data) return;
    setEditValues({
      name: data.name ?? '',
      type: data.type ?? DatasetType.Character,
      description: data.description ?? '',
    });
  }, [data]);

  const editValidationErrors = useMemo(() => {
    if (!editShowErrors) return {};
    const errors: { name?: string; type?: string } = {};
    if (!editValues.name.trim()) {
      errors.name = 'Enter a name.';
    }
    if (!editValues.type) {
      errors.type = 'Select a type.';
    }
    return errors;
  }, [editShowErrors, editValues.name, editValues.type]);

  const editIsValid = useMemo(
    () => Boolean(editValues.name.trim() && editValues.type),
    [editValues.name, editValues.type],
  );

  const addItemValidationErrors = useMemo(() => {
    if (!addItemShowErrors) return {};
    const errors: { prompt?: string; fileId?: string } = {};
    if (!addItemValues.prompt.trim()) {
      errors.prompt = 'Enter a prompt.';
    }
    if (!addItemValues.fileId) {
      errors.fileId = 'Upload an image.';
    }
    return errors;
  }, [addItemShowErrors, addItemValues.fileId, addItemValues.prompt]);

  const addItemIsValid = useMemo(
    () => Boolean(addItemValues.prompt.trim() && addItemValues.fileId),
    [addItemValues.fileId, addItemValues.prompt],
  );

  const items = data?.items ?? [];
  const itemsLabel = useMemo(() => {
    if (!data) return 'Items';
    return `Items (${items.length})`;
  }, [data, items.length]);

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && !data;

  const closeModal = () => setActiveItem(null);

  const openEditModal = () => {
    if (!data) return;
    setEditValues({
      name: data.name ?? '',
      type: data.type ?? DatasetType.Character,
      description: data.description ?? '',
    });
    setEditShowErrors(false);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (updateMutation.isPending) return;
    setIsEditOpen(false);
  };

  const openAddItemModal = () => {
    setAddItemValues({ prompt: '', fileId: '' });
    setAddItemFile(null);
    setAddItemShowErrors(false);
    setIsAddItemOpen(true);
  };

  const closeAddItemModal = () => {
    if (createItemMutation.isPending) return;
    setIsAddItemOpen(false);
  };

  const handleEdit = async () => {
    if (!datasetId) return;
    const errors = {
      name: editValues.name.trim() ? undefined : 'Enter a name.',
      type: editValues.type ? undefined : 'Select a type.',
    };
    if (errors.name || errors.type) {
      setEditShowErrors(true);
      return;
    }
    await updateMutation.mutateAsync({
      id: datasetId,
      payload: {
        name: editValues.name.trim(),
        type: editValues.type,
        description: editValues.description.trim() || undefined,
      },
    });
    setIsEditOpen(false);
  };

  const handleAddItem = async () => {
    if (!datasetId) return;
    const errors = {
      prompt: addItemValues.prompt.trim() ? undefined : 'Enter a prompt.',
      fileId: addItemValues.fileId ? undefined : 'Upload an image.',
    };
    if (errors.prompt || errors.fileId) {
      setAddItemShowErrors(true);
      return;
    }
    await createItemMutation.mutateAsync({
      id: datasetId,
      payload: {
        prompt: addItemValues.prompt.trim(),
        fileId: addItemValues.fileId,
      },
    });
    setIsAddItemOpen(false);
  };

  const handleDelete = async () => {
    if (!datasetId) return;
    await deleteMutation.mutateAsync(datasetId);
    navigate('/datasets');
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Dataset details</Typography>
            {data ? (
              <Typography variant="caption" tone="muted">
                {data.id}
              </Typography>
            ) : null}
          </div>
          <div className={s.headerActions}>
            <Button
              variant="secondary"
              onClick={openEditModal}
              disabled={!data}
            >
              Edit
            </Button>
            <Button
              variant="secondary"
              onClick={openAddItemModal}
              disabled={!data}
            >
              Add item
            </Button>
            <Button
              variant="ghost"
              tone="danger"
              onClick={() => setIsDeleteOpen(true)}
              disabled={!data || deleteMutation.isPending}
            >
              Delete
            </Button>
            <Button variant="secondary" onClick={() => navigate('/datasets')}>
              Back to datasets
            </Button>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load dataset"
              description={
                error instanceof Error ? error.message : 'Please try again.'
              }
              tone="warning"
            />
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </Stack>
        ) : null}

        {showEmpty ? (
          <EmptyState title="Dataset not found" description="Check the ID." />
        ) : null}

        {showSkeleton ? (
          <Stack className={s.content} gap="24px">
            <div className={s.detailsGrid}>
              <Skeleton width={160} height={12} />
              <Skeleton width={220} height={16} />
              <Skeleton width={140} height={12} />
              <Skeleton width={180} height={16} />
            </div>
            <Grid columns={3} gap={16}>
              {Array.from({ length: 6 }).map((_, index) => (
                <div className={s.itemCard} key={`item-skel-${index}`}>
                  <Skeleton height={180} />
                </div>
              ))}
            </Grid>
          </Stack>
        ) : null}

        {data ? (
          <div className={s.content}>
            <div className={s.detailsGrid}>
              <Field label="Name">
                <Typography variant="body">{data.name}</Typography>
              </Field>
              <Field label="Type">
                <Typography variant="body" tone="muted">
                  {capitalize(data.type)}
                </Typography>
              </Field>
              <Field label="Description" className={s.fullWidth}>
                <Typography variant="body">
                  {data.description || '-'}
                </Typography>
              </Field>
              <Field label="Updated">
                <Typography variant="body">
                  {formatDate(data.updatedAt)}
                </Typography>
              </Field>
              <Field label="Created">
                <Typography variant="body">
                  {formatDate(data.createdAt)}
                </Typography>
              </Field>
            </div>

            <div className={s.itemsHeader}>
              <Typography variant="h3">{itemsLabel}</Typography>
            </div>

            {items.length === 0 ? (
              <EmptyState
                title="No items"
                description="This dataset does not have any items yet."
              />
            ) : (
              <Grid columns={3} gap={16}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={s.itemCard}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveItem(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveItem(item);
                      }
                    }}
                  >
                    <div className={s.itemMedia}>
                      {item.file?.url ? (
                        <img
                          className={s.itemImage}
                          src={item.file.url}
                          alt={item.file.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className={s.itemPlaceholder}>
                          <Typography variant="caption" tone="muted">
                            No image
                          </Typography>
                        </div>
                      )}
                      {item.file?.url ? (
                        <div className={s.itemActions}>
                          <IconButton
                            as="a"
                            href={item.file.url}
                            download={item.file.name}
                            rel="noopener"
                            aria-label="Download image"
                            tooltip="Download"
                            size="sm"
                            variant="ghost"
                            icon={<DownloadIcon />}
                            // @ts-expect-error Radix types are wrong
                            onClick={(event) => event.stopPropagation()}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </Grid>
            )}
          </div>
        ) : null}
      </Container>

      <Modal
        open={Boolean(activeItem)}
        title="Item details"
        onClose={closeModal}
        actions={
          <Button variant="secondary" onClick={closeModal}>
            Close
          </Button>
        }
      >
        {activeItem ? (
          <div className={s.modalContent}>
            <div className={s.previewFrame}>
              {activeItem.file?.url ? (
                <img
                  className={s.preview}
                  src={activeItem.file.url}
                  alt={activeItem.file.name}
                />
              ) : (
                <Typography variant="caption" tone="muted">
                  No image available.
                </Typography>
              )}
            </div>
            <Field label="Prompt">
              <Typography variant="body" className={s.promptText}>
                {activeItem.prompt || '-'}
              </Typography>
            </Field>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={isEditOpen}
        title="Edit dataset"
        onClose={closeEditModal}
        actions={
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
              disabled={
                !editIsValid ||
                updateMutation.isPending ||
                Boolean(editValidationErrors.name || editValidationErrors.type)
              }
            >
              Save
            </Button>
          </div>
        }
      >
        <Stack gap="16px">
          <FormRow columns={2}>
            <Field
              label="Name"
              labelFor="dataset-edit-name"
              error={editValidationErrors.name}
            >
              <Input
                id="dataset-edit-name"
                size="sm"
                value={editValues.name}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Dataset name"
                fullWidth
              />
            </Field>
            <Field
              label="Type"
              labelFor="dataset-edit-type"
              error={editValidationErrors.type}
            >
              <Select
                id="dataset-edit-type"
                size="sm"
                options={Object.values(DatasetType).map((value) => ({
                  label: capitalize(value),
                  value,
                }))}
                value={editValues.type}
                onChange={(value) =>
                  setEditValues((prev) => ({
                    ...prev,
                    type: value as DatasetType,
                  }))
                }
                fullWidth
              />
            </Field>
          </FormRow>

          <Field label="Description" labelFor="dataset-edit-description">
            <Textarea
              id="dataset-edit-description"
              value={editValues.description}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder="Optional description"
              rows={4}
              fullWidth
            />
          </Field>
        </Stack>
      </Modal>

      <Modal
        open={isAddItemOpen}
        title="Add item"
        onClose={closeAddItemModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeAddItemModal}
              disabled={createItemMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              loading={createItemMutation.isPending}
              disabled={
                !addItemIsValid ||
                createItemMutation.isPending ||
                Boolean(
                  addItemValidationErrors.prompt ||
                  addItemValidationErrors.fileId,
                )
              }
            >
              Add item
            </Button>
          </div>
        }
      >
        <Stack gap="16px">
          <Field
            label="Prompt"
            labelFor="dataset-item-prompt"
            error={addItemValidationErrors.prompt}
          >
            <Textarea
              id="dataset-item-prompt"
              value={addItemValues.prompt}
              onChange={(event) =>
                setAddItemValues((prev) => ({
                  ...prev,
                  prompt: event.target.value,
                }))
              }
              rows={5}
              fullWidth
            />
          </Field>
          <div>
            <FileUpload
              label="Image file"
              folder={FileDir.Public}
              value={addItemFile}
              onChange={(file) => {
                setAddItemFile(file);
                setAddItemValues((prev) => ({
                  ...prev,
                  fileId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload image.')
              }
            />
            {addItemValidationErrors.fileId ? (
              <Typography
                variant="caption"
                tone="warning"
                className={s.fileError}
              >
                {addItemValidationErrors.fileId}
              </Typography>
            ) : null}
          </div>
        </Stack>
      </Modal>

      <ConfirmModal
        open={isDeleteOpen}
        title="Delete dataset?"
        description="This will permanently remove the dataset and its items."
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setIsDeleteOpen(false);
        }}
      />
    </AppShell>
  );
}
