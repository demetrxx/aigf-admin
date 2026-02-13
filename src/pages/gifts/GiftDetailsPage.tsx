import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useDeleteGift, useGiftDetails, useUpdateGift } from '@/app/gifts';
import { notifyError } from '@/app/toast';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  FormRow,
  Input,
  Modal,
  Skeleton,
  Stack,
  Switch,
  Textarea,
  Typography,
} from '@/atoms';
import { FileDir, type IFile } from '@/common/types';
import { ConfirmModal, FileUpload } from '@/components/molecules';
import { AppShell } from '@/components/templates';

import s from './GiftDetailsPage.module.scss';

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

export function GiftDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const giftId = id ?? '';
  const { data, error, isLoading, refetch } = useGiftDetails(giftId);
  const updateMutation = useUpdateGift();
  const deleteMutation = useDeleteGift();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editShowErrors, setEditShowErrors] = useState(false);
  const [editFile, setEditFile] = useState<IFile | null>(null);
  const [editValues, setEditValues] = useState({
    name: '',
    description: '',
    price: '',
    isActive: true,
    imgId: '',
  });

  useEffect(() => {
    if (!data) return;
    setEditValues({
      name: data.name ?? '',
      description: data.description ?? '',
      price: String(data.price ?? ''),
      isActive: Boolean(data.isActive),
      imgId: data.img?.id ?? '',
    });
    setEditFile(data.img ?? null);
  }, [data]);

  const editValidationErrors = useMemo(() => {
    if (!editShowErrors) return {};
    const errors: { name?: string; description?: string; price?: string } = {};
    if (!editValues.name.trim()) {
      errors.name = 'Enter a name.';
    }
    if (!editValues.description.trim()) {
      errors.description = 'Enter a description.';
    }
    if (!editValues.price.trim()) {
      errors.price = 'Enter a price.';
    } else if (
      !Number.isFinite(Number(editValues.price)) ||
      Number(editValues.price) <= 0
    ) {
      errors.price = 'Enter a positive number.';
    }
    return errors;
  }, [editShowErrors, editValues.description, editValues.name, editValues.price]);

  const editIsValid = useMemo(
    () =>
      Boolean(
        editValues.name.trim() &&
          editValues.description.trim() &&
          editValues.price.trim() &&
          Number(editValues.price) > 0,
      ),
    [editValues.description, editValues.name, editValues.price],
  );

  const openEditModal = () => {
    if (!data) return;
    setEditValues({
      name: data.name ?? '',
      description: data.description ?? '',
      price: String(data.price ?? ''),
      isActive: Boolean(data.isActive),
      imgId: data.img?.id ?? '',
    });
    setEditFile(data.img ?? null);
    setEditShowErrors(false);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (updateMutation.isPending) return;
    setIsEditOpen(false);
  };

  const handleEdit = async () => {
    if (!giftId) return;
    const errors = {
      name: editValues.name.trim() ? undefined : 'Enter a name.',
      description: editValues.description.trim()
        ? undefined
        : 'Enter a description.',
      price: editValues.price.trim()
        ? Number(editValues.price) > 0
          ? undefined
          : 'Enter a positive number.'
        : 'Enter a price.',
    };
    if (errors.name || errors.description || errors.price) {
      setEditShowErrors(true);
      return;
    }

    const payload = {
      name: editValues.name.trim(),
      description: editValues.description.trim(),
      price: Number(editValues.price),
      isActive: editValues.isActive,
      ...(editValues.imgId && editValues.imgId !== data?.img?.id
        ? { imgId: editValues.imgId }
        : {}),
    };

    await updateMutation.mutateAsync({ id: giftId, payload });
    setIsEditOpen(false);
  };

  const handleDelete = async () => {
    if (!giftId) return;
    await deleteMutation.mutateAsync(giftId);
    navigate('/gifts');
  };

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && !data;

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Gift details</Typography>
            {data ? (
              <Typography variant="caption" tone="muted">
                {data.id}
              </Typography>
            ) : null}
          </div>
          <div className={s.headerActions}>
            <Button variant="secondary" onClick={openEditModal} disabled={!data}>
              Edit
            </Button>
            <Button
              variant="ghost"
              tone="danger"
              onClick={() => setIsDeleteOpen(true)}
              disabled={!data || deleteMutation.isPending}
            >
              Delete
            </Button>
            <Button variant="secondary" onClick={() => navigate('/gifts')}>
              Back to gifts
            </Button>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load gift"
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
          <EmptyState title="Gift not found" description="Check the ID." />
        ) : null}

        {showSkeleton ? (
          <div className={s.content}>
            <div className={s.mediaColumn}>
              <Skeleton width={120} height={12} />
              <div className={s.previewFrame}>
                <Skeleton width="100%" height="100%" />
              </div>
            </div>
            <div className={s.detailsColumn}>
              <Skeleton width={220} height={16} />
              <Skeleton width={320} height={20} />
              <Skeleton width={180} height={16} />
              <Skeleton width={160} height={16} />
            </div>
          </div>
        ) : null}

        {data ? (
          <div className={s.content}>
            <div className={s.mediaColumn}>
              <Typography variant="meta" tone="muted">
                Image
              </Typography>
              <div className={s.previewFrame}>
                {data.img?.url ? (
                  <img
                    className={s.preview}
                    src={data.img.url}
                    alt={data.img.name}
                  />
                ) : (
                  <Typography variant="caption" tone="muted">
                    No image available.
                  </Typography>
                )}
              </div>
            </div>
            <div className={s.detailsColumn}>
              <Field label="Name">
                <Typography variant="body">{data.name}</Typography>
              </Field>
              <Field label="Description">
                <Typography variant="body" className={s.multiline}>
                  {data.description || '-'}
                </Typography>
              </Field>
              <Field label="Price">
                <Typography variant="body">{data.price}</Typography>
              </Field>
              <Field label="Status">
                {data.isActive ? (
                  <Badge tone="success">Active</Badge>
                ) : (
                  <Badge tone="warning" outline>
                    Inactive
                  </Badge>
                )}
              </Field>
              <Field label="Updated">
                <Typography variant="body">{formatDate(data.updatedAt)}</Typography>
              </Field>
              <Field label="Created">
                <Typography variant="body">{formatDate(data.createdAt)}</Typography>
              </Field>
            </div>
          </div>
        ) : null}
      </Container>

      <Modal
        open={isEditOpen}
        title="Edit gift"
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
                Boolean(
                  editValidationErrors.name ||
                    editValidationErrors.description ||
                    editValidationErrors.price,
                )
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
              labelFor="gift-edit-name"
              error={editValidationErrors.name}
            >
              <Input
                id="gift-edit-name"
                size="sm"
                value={editValues.name}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Gift name"
                fullWidth
              />
            </Field>
            <Field
              label="Price"
              labelFor="gift-edit-price"
              error={editValidationErrors.price}
            >
              <Input
                id="gift-edit-price"
                size="sm"
                type="number"
                min={1}
                step={1}
                value={editValues.price}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    price: event.target.value,
                  }))
                }
                placeholder="0"
                fullWidth
              />
            </Field>
          </FormRow>

          <Field
            label="Description"
            labelFor="gift-edit-description"
            error={editValidationErrors.description}
          >
            <Textarea
              id="gift-edit-description"
              value={editValues.description}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={4}
              fullWidth
            />
          </Field>

          <Field label="Status">
            <Switch
              checked={editValues.isActive}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  isActive: event.target.checked,
                }))
              }
              label={editValues.isActive ? 'Active' : 'Inactive'}
            />
          </Field>

          <div>
            <FileUpload
              label="Image file"
              folder={FileDir.Public}
              value={editFile}
              onChange={(file) => {
                setEditFile(file);
                setEditValues((prev) => ({
                  ...prev,
                  imgId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload image.')
              }
            />
          </div>
        </Stack>
      </Modal>

      <ConfirmModal
        open={isDeleteOpen}
        title="Delete gift?"
        description="This will permanently remove the gift."
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
