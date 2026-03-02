import { ReloadIcon } from '@radix-ui/react-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useCreateDatasetItem,
  useDatasetDetails,
  useDeleteDataset,
  useDeleteDatasetItem,
  useDownloadDatasetZip,
  useRegenerateDatasetItem,
  useUpdateDataset,
} from '@/app/datasets';
import { DownloadIcon, PencilLineIcon, TrashIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  Grid,
  IconButton,
  Input,
  Modal,
  Skeleton,
  Stack,
  Typography,
} from '@/atoms';
import type { DatasetItemPrompt, IDatasetItem } from '@/common/types';
import { DatasetItemStatus } from '@/common/types';
import { ConfirmModal } from '@/components/molecules/confirm-modal/ConfirmModal';
import { Drawer } from '@/components/molecules/drawer/Drawer';
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

function formatStyle(value: string | null | undefined) {
  if (!value) return '-';
  return value
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatPrompt(prompt: DatasetItemPrompt | null | undefined) {
  if (!prompt) return '-';
  try {
    return JSON.stringify(prompt, null, 2);
  } catch {
    return '-';
  }
}

function getStatusTone(status: DatasetItemStatus) {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'in_progress') return 'warning';
  return 'accent';
}

function getStatusLabel(status: DatasetItemStatus) {
  if (status === 'in_progress') return 'In progress';
  if (status === 'completed') return 'Completed';
  if (status === 'failed') return 'Failed';
  return 'Pending';
}

export function DatasetDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const datasetId = id ?? '';

  const { data, error, isLoading, refetch } = useDatasetDetails(
    datasetId || null,
    null,
    {
      refetchInterval: (current) => {
        if (!current?.items?.length) return false;
        const hasActive = current.items.some(
          (item) =>
            item.status === DatasetItemStatus.Pending ||
            item.status === DatasetItemStatus.InProgress,
        );
        return hasActive ? 5000 : false;
      },
    },
  );
  const updateMutation = useUpdateDataset();
  const createItemMutation = useCreateDatasetItem();
  const downloadZipMutation = useDownloadDatasetZip();
  const deleteMutation = useDeleteDataset();
  const regenerateItemMutation = useRegenerateDatasetItem();
  const deleteItemMutation = useDeleteDatasetItem();

  const [activeItem, setActiveItem] = useState<IDatasetItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<IDatasetItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editShowErrors, setEditShowErrors] = useState(false);
  const [editName, setEditName] = useState('');
  const [regeneratingItemId, setRegeneratingItemId] = useState<string | null>(
    null,
  );
  const itemsEndRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToItemsEndRef = useRef(false);

  const editValidationError = useMemo(() => {
    if (!editShowErrors) return undefined;
    if (!editName.trim()) return 'Enter a name.';
    return undefined;
  }, [editShowErrors, editName]);

  const items = data?.items ?? [];
  const refImgs = data?.refImgs ?? [];
  const itemsLabel = data
    ? `Generated items (${items.length})`
    : 'Generated items';
  const refsLabel = data
    ? `Reference images (${refImgs.length})`
    : 'Reference images';

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && !data;

  const scrollToItemsEnd = () => {
    itemsEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  };

  useEffect(() => {
    if (!shouldScrollToItemsEndRef.current) return;
    scrollToItemsEnd();
    shouldScrollToItemsEndRef.current = false;
  }, [items.length]);

  const closeItemModal = () => setActiveItem(null);

  const openEditModal = () => {
    if (!data) return;
    setEditName(data.name ?? '');
    setEditShowErrors(false);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (updateMutation.isPending) return;
    setIsEditOpen(false);
  };

  const handleEdit = async () => {
    if (!datasetId) return;
    if (!editName.trim()) {
      setEditShowErrors(true);
      return;
    }

    await updateMutation.mutateAsync({
      id: datasetId,
      payload: {
        name: editName.trim(),
      },
    });
    setIsEditOpen(false);
  };

  const handleAddItem = async () => {
    if (!datasetId) return;
    shouldScrollToItemsEndRef.current = true;
    await createItemMutation.mutateAsync({ id: datasetId });
    scrollToItemsEnd();
  };

  const handleDelete = async () => {
    if (!datasetId) return;
    await deleteMutation.mutateAsync(datasetId);
    navigate('/datasets');
  };

  const handleDownloadZip = async () => {
    if (!datasetId) return;
    const fallbackName = data?.name ? `${data.name}.zip` : undefined;
    await downloadZipMutation.mutateAsync({ id: datasetId, fallbackName });
  };

  const handleRegenerateItem = async (item: IDatasetItem) => {
    if (!datasetId) return;
    setRegeneratingItemId(item.id);
    try {
      await regenerateItemMutation.mutateAsync({
        id: datasetId,
        itemId: item.id,
      });
    } finally {
      setRegeneratingItemId((prev) => (prev === item.id ? null : prev));
    }
  };

  const handleDeleteItem = async () => {
    if (!datasetId || !itemToDelete) return;
    await deleteItemMutation.mutateAsync({
      id: datasetId,
      itemId: itemToDelete.id,
    });
    if (activeItem?.id === itemToDelete.id) {
      setActiveItem(null);
    }
    setItemToDelete(null);
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
              variant="outline"
              onClick={handleAddItem}
              loading={createItemMutation.isPending}
              disabled={!data || createItemMutation.isPending}
            >
              Add item
            </Button>
            <IconButton
              aria-label="Edit dataset"
              icon={<PencilLineIcon />}
              tooltip="Edit dataset"
              variant="text"
              onClick={openEditModal}
              disabled={!data || updateMutation.isPending}
            />
            <IconButton
              aria-label="Download dataset"
              variant="text"
              icon={<DownloadIcon />}
              tooltip="Download dataset"
              onClick={handleDownloadZip}
              loading={downloadZipMutation.isPending}
              disabled={!data || downloadZipMutation.isPending}
            />
            <IconButton
              aria-label="Delete dataset"
              icon={<TrashIcon />}
              tooltip="Delete dataset"
              variant="ghost"
              tone="danger"
              onClick={() => setIsDeleteOpen(true)}
              disabled={!data || deleteMutation.isPending}
            />
            <Button variant="ghost" onClick={() => navigate('/datasets')}>
              Back
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
              <Skeleton width={120} height={12} />
              <Skeleton width={200} height={16} />
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
              <Field label="LoRA trigger word">
                <Typography variant="body" tone="muted">
                  {data.loraTriggerWord || '-'}
                </Typography>
              </Field>
              <Field label="Style">
                <Typography variant="body" tone="muted">
                  {formatStyle(data.style)}
                </Typography>
              </Field>
              <Field label="Resolution">
                <Typography variant="body" tone="muted">
                  {data.resolution || '-'}
                </Typography>
              </Field>
              <Field label="Items count">
                <Typography variant="body">
                  {data.itemsCount.toLocaleString()}
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
              <Typography variant="h3">{refsLabel}</Typography>
            </div>

            {refImgs.length === 0 ? (
              <EmptyState
                title="No reference images"
                description="This dataset has no reference images."
              />
            ) : (
              <Grid columns={3} gap={16}>
                {refImgs.map((file) => (
                  <div
                    key={file.id}
                    className={[s.itemCard, s.staticCard].join(' ')}
                  >
                    <div className={s.itemMedia}>
                      {file.url ? (
                        <img
                          className={s.itemImage}
                          src={file.url}
                          alt={file.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className={s.itemPlaceholder}>
                          <Typography variant="caption" tone="muted">
                            No image
                          </Typography>
                        </div>
                      )}
                      {file.url ? (
                        <div className={s.itemActions}>
                          <IconButton
                            as="a"
                            href={file.url}
                            download={file.name}
                            rel="noopener"
                            aria-label="Download reference image"
                            tooltip="Download"
                            size="sm"
                            variant="ghost"
                            icon={<DownloadIcon />}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </Grid>
            )}

            <div className={s.itemsHeader}>
              <Typography variant="h3">{itemsLabel}</Typography>
            </div>

            {items.length === 0 ? (
              <EmptyState
                title="No generated items"
                description="Use Add item to generate the first item."
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
                            {[
                              DatasetItemStatus.Pending,
                              DatasetItemStatus.InProgress,
                            ].includes(item.status)
                              ? 'Generating...'
                              : 'No image'}
                          </Typography>
                        </div>
                      )}
                      <div className={s.itemActions}>
                        {item.file?.url ? (
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
                        ) : null}
                        <IconButton
                          aria-label="Regenerate item"
                          tooltip="Regenerate item"
                          size="sm"
                          variant="ghost"
                          icon={<ReloadIcon />}
                          loading={
                            regenerateItemMutation.isPending &&
                            regeneratingItemId === item.id
                          }
                          disabled={
                            regenerateItemMutation.isPending ||
                            deleteItemMutation.isPending
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRegenerateItem(item);
                          }}
                        />
                        <IconButton
                          aria-label="Delete item"
                          tooltip="Delete item"
                          size="sm"
                          variant="ghost"
                          tone="danger"
                          icon={<TrashIcon />}
                          disabled={
                            deleteItemMutation.isPending ||
                            regenerateItemMutation.isPending
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            setItemToDelete(item);
                          }}
                        />
                      </div>
                    </div>
                    <div className={s.itemMeta}>
                      <Badge tone={getStatusTone(item.status)}>
                        {getStatusLabel(item.status)}
                      </Badge>
                      <Typography variant="caption" tone="muted">
                        {formatDate(item.createdAt)}
                      </Typography>
                    </div>
                  </div>
                ))}
              </Grid>
            )}
            <div ref={itemsEndRef} className={s.itemsEndAnchor} />
          </div>
        ) : null}
      </Container>

      <Drawer
        open={Boolean(activeItem)}
        title="Item details"
        className={s.itemDrawer}
        onOpenChange={(open) => {
          if (!open) {
            closeItemModal();
          }
        }}
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
                  {[
                    DatasetItemStatus.Pending,
                    DatasetItemStatus.InProgress,
                  ].includes(activeItem.status)
                    ? 'Generating...'
                    : 'No image available.'}
                </Typography>
              )}
            </div>
            <Field label="Status">
              <Badge tone={getStatusTone(activeItem.status)}>
                {getStatusLabel(activeItem.status)}
              </Badge>
            </Field>
            <Field label="Prompt">
              <Typography as="pre" variant="caption" className={s.promptText}>
                {formatPrompt(activeItem.prompt)}
              </Typography>
            </Field>
            <Field label="Created">
              <Typography variant="body">
                {formatDate(activeItem.createdAt)}
              </Typography>
            </Field>
            <div className={s.modalActions}>
              <Button variant="secondary" onClick={closeItemModal}>
                Close
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  handleRegenerateItem(activeItem);
                }}
                loading={
                  regenerateItemMutation.isPending &&
                  regeneratingItemId === activeItem.id
                }
                disabled={regenerateItemMutation.isPending}
              >
                Regenerate item
              </Button>
              <Button
                variant="ghost"
                tone="danger"
                onClick={() => setItemToDelete(activeItem)}
                disabled={deleteItemMutation.isPending}
              >
                Delete item
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>

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
              disabled={!editName.trim() || updateMutation.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <Field
          label="Name"
          labelFor="dataset-edit-name"
          error={editValidationError}
        >
          <Input
            id="dataset-edit-name"
            size="sm"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            placeholder="Dataset name"
            fullWidth
          />
        </Field>
      </Modal>

      <ConfirmModal
        open={isDeleteOpen}
        title="Delete dataset?"
        description="This will permanently remove the dataset and all generated items."
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setIsDeleteOpen(false);
        }}
      />

      <ConfirmModal
        open={Boolean(itemToDelete)}
        title="Delete item?"
        description="This will permanently remove this generated item."
        confirmLabel="Delete item"
        tone="danger"
        isConfirming={deleteItemMutation.isPending}
        onConfirm={handleDeleteItem}
        onClose={() => {
          if (deleteItemMutation.isPending) return;
          setItemToDelete(null);
        }}
      />
    </AppShell>
  );
}
