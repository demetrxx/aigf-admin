import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAdmins, useInviteAdmin, useUpdateAdminStatus } from '@/app/admins';
import { UserCogIcon } from '@/assets/icons';
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
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import { AdminStatus, type IAdmin, UserRole } from '@/common/types';
import { capitalize } from '@/common/utils';
import { AppShell } from '@/components/templates';

import s from './AdminsPage.module.scss';

type QueryUpdate = {
  search?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

const ORDER_OPTIONS = [
  { label: 'Ascending', value: 'ASC' },
  { label: 'Descending', value: 'DESC' },
];

const ORDER_VALUES = new Set(ORDER_OPTIONS.map((option) => option.value));
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_ORDER = 'DESC';
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;
const ROLE_OPTIONS = [
  { label: 'Owner', value: UserRole.Owner },
  { label: 'Moderator', value: UserRole.Moderator },
  { label: 'Developer', value: UserRole.Developer },
];

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return dateTimeFormatter.format(parsed);
}

function parsePositiveNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parsePageSize(value: string | null) {
  const parsed = parsePositiveNumber(value, DEFAULT_PAGE_SIZE);
  return PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

function formatAdminName(admin: IAdmin) {
  const fullName = `${admin.firstName ?? ''} ${admin.lastName ?? ''}`.trim();
  return fullName || admin.email || 'Unknown admin';
}

export function AdminsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();

  const order = ORDER_VALUES.has(rawOrder ?? '') ? rawOrder! : DEFAULT_ORDER;
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      if (update.search !== undefined) {
        const nextSearch = update.search.trim();
        if (nextSearch) {
          next.set('search', nextSearch);
        } else {
          next.delete('search');
        }
      }

      if (update.order !== undefined) {
        if (update.order && update.order !== DEFAULT_ORDER) {
          next.set('order', update.order);
        } else {
          next.delete('order');
        }
      }

      if (update.page !== undefined) {
        if (update.page > 1) {
          next.set('page', String(update.page));
        } else {
          next.delete('page');
        }
      }

      if (update.pageSize !== undefined) {
        if (update.pageSize !== DEFAULT_PAGE_SIZE) {
          next.set('pageSize', String(update.pageSize));
        } else {
          next.delete('pageSize');
        }
      }

      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    setSearchInput(rawSearch);
  }, [rawSearch]);

  useEffect(() => {
    if (normalizedSearch === rawSearch) return;
    updateSearchParams({ search: normalizedSearch, page: 1 }, true);
  }, [normalizedSearch, rawSearch, updateSearchParams]);

  const queryParams = useMemo(
    () => ({
      search: normalizedSearch || undefined,
      order,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [normalizedSearch, order, page, pageSize],
  );

  const { data, error, isLoading, refetch } = useAdmins(queryParams);
  const updateStatusMutation = useUpdateAdminStatus();
  const inviteMutation = useInviteAdmin();
  const [toggleTarget, setToggleTarget] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteValues, setInviteValues] = useState({
    fullName: '',
    email: '',
    password: '',
    role: UserRole.Moderator,
  });
  const [inviteShowErrors, setInviteShowErrors] = useState(false);

  const admins = data?.data ?? [];
  const total = data?.total ?? 0;
  const effectiveTake = data?.take ?? pageSize;
  const effectiveSkip = data?.skip ?? (page - 1) * pageSize;
  const totalPages = total > 0 ? Math.ceil(total / effectiveTake) : 1;

  useEffect(() => {
    if (!data || total === 0) return;
    if (page > totalPages) {
      updateSearchParams({ page: totalPages }, true);
    }
  }, [data, page, total, totalPages, updateSearchParams]);

  const handleToggleStatus = async (admin: IAdmin) => {
    const nextStatus =
      admin.status === AdminStatus.Active
        ? AdminStatus.Inactive
        : AdminStatus.Active;
    setToggleTarget(admin.id);
    try {
      await updateStatusMutation.mutateAsync({
        id: admin.id,
        status: nextStatus,
      });
    } finally {
      setToggleTarget(null);
    }
  };

  const inviteErrors = useMemo(() => {
    if (!inviteShowErrors) return {};
    const errors: {
      fullName?: string;
      email?: string;
      password?: string;
    } = {};
    if (!inviteValues.fullName.trim()) {
      errors.fullName = 'Enter a full name.';
    }
    if (!inviteValues.email.trim()) {
      errors.email = 'Enter an email.';
    }
    if (!inviteValues.password.trim()) {
      errors.password = 'Enter a password.';
    }
    return errors;
  }, [
    inviteShowErrors,
    inviteValues.email,
    inviteValues.fullName,
    inviteValues.password,
  ]);

  const inviteIsValid = useMemo(
    () =>
      Boolean(
        inviteValues.fullName.trim() &&
        inviteValues.email.trim() &&
        inviteValues.password.trim() &&
        inviteValues.role,
      ),
    [
      inviteValues.email,
      inviteValues.fullName,
      inviteValues.password,
      inviteValues.role,
    ],
  );

  const openInviteModal = () => {
    setInviteValues({
      fullName: '',
      email: '',
      password: '',
      role: UserRole.Moderator,
    });
    setInviteShowErrors(false);
    setIsInviteOpen(true);
  };

  const closeInviteModal = () => {
    if (inviteMutation.isPending) return;
    setIsInviteOpen(false);
  };

  const handleInvite = async () => {
    const errors = {
      fullName: inviteValues.fullName.trim() ? undefined : 'Enter a full name.',
      email: inviteValues.email.trim() ? undefined : 'Enter an email.',
      password: inviteValues.password.trim() ? undefined : 'Enter a password.',
    };
    if (errors.fullName || errors.email || errors.password) {
      setInviteShowErrors(true);
      return;
    }
    await inviteMutation.mutateAsync({
      fullName: inviteValues.fullName.trim(),
      email: inviteValues.email.trim(),
      password: inviteValues.password,
      role: inviteValues.role,
    });
    setIsInviteOpen(false);
  };

  const columns = useMemo(
    () => [
      { key: 'admin', label: 'Admin' },
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'Status' },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
      { key: 'actions', label: '' },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      admins.map((admin) => {
        const isToggling =
          updateStatusMutation.isPending && toggleTarget === admin.id;
        return {
          admin: (
            <div className={s.adminCell}>
              <Typography variant="body">{formatAdminName(admin)}</Typography>
              <Typography variant="caption" tone="muted">
                {admin.email}
              </Typography>
            </div>
          ),
          role: (
            <Typography variant="body" tone="muted">
              {capitalize(admin.role)}
            </Typography>
          ),
          status:
            admin.status === AdminStatus.Active ? (
              <Badge tone="success">Active</Badge>
            ) : (
              <Badge tone="warning" outline>
                Inactive
              </Badge>
            ),
          updated: (
            <Typography variant="caption" tone="muted" className={s.alignRight}>
              {formatDate(admin.updatedAt)}
            </Typography>
          ),
          actions: (
            <div className={s.actionsCell}>
              <Button
                size="sm"
                variant="outline"
                tone={
                  admin.status === AdminStatus.Active ? 'warning' : 'success'
                }
                onClick={() => handleToggleStatus(admin)}
                loading={isToggling}
                disabled={updateStatusMutation.isPending}
              >
                {admin.status === AdminStatus.Active
                  ? 'Deactivate'
                  : 'Activate'}
              </Button>
            </div>
          ),
        };
      }),
    [admins, toggleTarget, updateStatusMutation.isPending],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        admin: (
          <div className={s.adminCell} key={`admin-skel-${index}`}>
            <Skeleton width={160} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        role: <Skeleton width={80} height={12} />,
        status: <Skeleton width={80} height={20} />,
        updated: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
        actions: (
          <div className={s.actionsCell}>
            <Skeleton width={90} height={28} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && admins.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Admins</Typography>
          </div>
          <Button
            variant="secondary"
            iconLeft={<UserCogIcon />}
            onClick={openInviteModal}
          >
            Invite admin
          </Button>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              className={s.filterField}
              label="Search"
              labelFor="admins-search"
            >
              <Input
                id="admins-search"
                placeholder="Search by name or email"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>
            <Field label="Order" labelFor="admins-order">
              <Select
                id="admins-order"
                options={ORDER_OPTIONS}
                value={order}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({ order: value, page: 1 })
                }
              />
            </Field>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load admins"
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
          <EmptyState
            title="No admins found"
            description="Try adjusting your search."
          />
        ) : null}

        {showTable ? (
          <div className={s.tableWrap}>
            <Table
              columns={columns}
              rows={showSkeleton ? skeletonRows : rows}
            />

            {showFooter ? (
              <div className={s.footer}>
                <Typography variant="meta" tone="muted">
                  {total === 0
                    ? 'No results'
                    : `Showing ${rangeStart}-${rangeEnd} of ${total.toLocaleString()}`}
                </Typography>
                <div className={s.paginationRow}>
                  <Select
                    options={PAGE_SIZE_OPTIONS.map((size) => ({
                      label: `${size} / page`,
                      value: String(size),
                    }))}
                    size="sm"
                    variant="ghost"
                    value={String(pageSize)}
                    onChange={(value) =>
                      updateSearchParams({
                        pageSize: Number(value),
                        page: 1,
                      })
                    }
                    fitContent
                  />
                  {totalPages > 1 ? (
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onChange={(nextPage) =>
                        updateSearchParams({ page: nextPage })
                      }
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Container>

      <Modal
        open={isInviteOpen}
        title="Invite admin"
        onClose={closeInviteModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeInviteModal}
              disabled={inviteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              loading={inviteMutation.isPending}
              disabled={
                !inviteIsValid ||
                inviteMutation.isPending ||
                Boolean(
                  inviteErrors.fullName ||
                  inviteErrors.email ||
                  inviteErrors.password,
                )
              }
            >
              Send invite
            </Button>
          </div>
        }
      >
        <Stack gap="16px">
          <FormRow columns={2}>
            <Field
              label="Full name"
              labelFor="admin-invite-name"
              error={inviteErrors.fullName}
            >
              <Input
                id="admin-invite-name"
                size="sm"
                value={inviteValues.fullName}
                onChange={(event) =>
                  setInviteValues((prev) => ({
                    ...prev,
                    fullName: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
            <Field
              label="Email"
              labelFor="admin-invite-email"
              error={inviteErrors.email}
            >
              <Input
                id="admin-invite-email"
                size="sm"
                type="email"
                value={inviteValues.email}
                onChange={(event) =>
                  setInviteValues((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
          </FormRow>

          <FormRow columns={2}>
            <Field label="Role" labelFor="admin-invite-role">
              <Select
                id="admin-invite-role"
                size="sm"
                options={ROLE_OPTIONS}
                value={inviteValues.role}
                onChange={(value) =>
                  setInviteValues((prev) => ({
                    ...prev,
                    role: value as UserRole,
                  }))
                }
                fullWidth
              />
            </Field>
            <Field
              label="Password"
              labelFor="admin-invite-password"
              error={inviteErrors.password}
            >
              <Input
                id="admin-invite-password"
                size="sm"
                type="password"
                value={inviteValues.password}
                onChange={(event) =>
                  setInviteValues((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
          </FormRow>
        </Stack>
      </Modal>
    </AppShell>
  );
}
