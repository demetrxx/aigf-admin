import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/app/auth';
import { toast } from '@/app/toast';
import {
  Button,
  Container,
  Divider,
  Field,
  FormRow,
  Input,
  Stack,
  Typography,
} from '@/atoms';
import { AppShell } from '@/components/templates';

import s from './ProfilePage.module.scss';

type ProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
};

type ProfileFormErrors = {
  firstName?: string;
  lastName?: string;
};

const emptyProfile: ProfileFormValues = {
  firstName: '',
  lastName: '',
  email: '',
};

function validateProfile(values: ProfileFormValues): ProfileFormErrors {
  const errors: ProfileFormErrors = {};
  if (!values.firstName.trim()) {
    errors.firstName = 'Please enter your first name.';
  }
  if (!values.lastName.trim()) {
    errors.lastName = 'Please enter your last name.';
  }
  return errors;
}

export function ProfilePage() {
  const { user, userStatus, signOut, updateProfile, changePassword } =
    useAuth();
  const [formValues, setFormValues] = useState<ProfileFormValues>(emptyProfile);
  const [initialValues, setInitialValues] =
    useState<ProfileFormValues>(emptyProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<
    'idle' | 'saving' | 'success' | 'error'
  >('idle');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const nextValues: ProfileFormValues = {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
    };
    setFormValues(nextValues);
    setInitialValues(nextValues);
  }, [user]);

  const isDirty = useMemo(
    () =>
      formValues.firstName !== initialValues.firstName ||
      formValues.lastName !== initialValues.lastName,
    [formValues, initialValues],
  );

  const validationErrors = useMemo(
    () => (showErrors ? validateProfile(formValues) : {}),
    [formValues, showErrors],
  );

  const isValid = Object.keys(validationErrors).length === 0;

  const handleSave = async () => {
    setSaveError(null);
    const errors = validateProfile(formValues);
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    setIsSaving(true);
    try {
      const nextValues = {
        firstName: formValues.firstName.trim(),
        lastName: formValues.lastName.trim(),
      };
      await updateProfile(nextValues);
      setInitialValues((prev) => ({ ...prev, ...nextValues }));
      toast.success('Changes saved.');
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Unable to save changes.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMessage(null);
    if (!passwordValues.currentPassword || !passwordValues.newPassword) {
      setPasswordStatus('error');
      setPasswordMessage('Enter your current and new password.');
      return;
    }
    setPasswordStatus('saving');
    try {
      await changePassword({
        oldPassword: passwordValues.currentPassword,
        newPassword: passwordValues.newPassword,
      });
      setPasswordStatus('success');
      setPasswordMessage('Password updated.');
      setPasswordValues({ currentPassword: '', newPassword: '' });
      setIsPasswordFormOpen(false);
    } catch (error) {
      setPasswordStatus('error');
      setPasswordMessage(
        error instanceof Error ? error.message : 'Unable to change password.',
      );
    }
  };

  return (
    <AppShell>
      <Container size="narrow" className={s.page}>
        <div className={s.header}>
          <Typography variant="h2">Profile</Typography>
          <Typography variant="body" tone="muted">
            Manage your account.
          </Typography>
        </div>

        <Stack gap="24px">
          <section className={s.section}>
            <div className={s.sectionHeader}>
              <div>
                <Typography variant="h3">Account</Typography>
                <Typography className={s.sectionDescription} variant="meta">
                  Your personal information.
                </Typography>
              </div>
              <Button
                variant="secondary"
                disabled={
                  !isDirty ||
                  userStatus !== 'success' ||
                  isSaving ||
                  (showErrors && !isValid)
                }
                loading={isSaving}
                onClick={handleSave}
              >
                Save changes
              </Button>
            </div>
            <Stack gap="16px">
              <FormRow columns={2}>
                <Field
                  label="First name"
                  labelFor="profile-first-name"
                  error={validationErrors.firstName}
                >
                  <Input
                    id="profile-first-name"
                    placeholder="Ava"
                    value={formValues.firstName}
                    onChange={(event) =>
                      setFormValues((values) => ({
                        ...values,
                        firstName: event.target.value,
                      }))
                    }
                    fullWidth
                    disabled={userStatus !== 'success'}
                  />
                </Field>
                <Field
                  label="Last name"
                  labelFor="profile-last-name"
                  error={validationErrors.lastName}
                >
                  <Input
                    id="profile-last-name"
                    placeholder="Brooks"
                    value={formValues.lastName}
                    onChange={(event) =>
                      setFormValues((values) => ({
                        ...values,
                        lastName: event.target.value,
                      }))
                    }
                    fullWidth
                    disabled={userStatus !== 'success'}
                  />
                </Field>
              </FormRow>
              <Field
                label="Email"
                labelFor="profile-email"
              >
                <Input
                  id="profile-email"
                  value={formValues.email}
                  fullWidth
                  disabled
                />
              </Field>
              {userStatus === 'loading' ? (
                <Typography variant="meta" tone="muted">
                  Loading profile details.
                </Typography>
              ) : null}
              {userStatus === 'error' ? (
                <Typography variant="meta" tone="muted">
                  We could not load your profile yet.
                </Typography>
              ) : null}
              {saveError ? (
                <Typography variant="meta" tone="muted">
                  {saveError}
                </Typography>
              ) : null}
            </Stack>
          </section>

          <Divider />

          <section className={s.section}>
            <div className={s.sectionHeader}>
              <div>
                <Typography variant="h3">Security</Typography>
                <Typography className={s.sectionDescription} variant="meta">
                  Keep your account secure.
                </Typography>
              </div>
            </div>
            <Stack gap="12px">
              {isPasswordFormOpen ? (
                <Stack gap="16px">
                  <FormRow columns={2}>
                    <Field label="Current password" labelFor="current-password">
                      <Input
                        id="current-password"
                        type="password"
                        placeholder="Current password"
                        autoComplete="current-password"
                        value={passwordValues.currentPassword}
                        onChange={(event) =>
                          setPasswordValues((values) => ({
                            ...values,
                            currentPassword: event.target.value,
                          }))
                        }
                        fullWidth
                      />
                    </Field>
                    <Field label="New password" labelFor="new-password">
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="New password"
                        autoComplete="new-password"
                        value={passwordValues.newPassword}
                        onChange={(event) =>
                          setPasswordValues((values) => ({
                            ...values,
                            newPassword: event.target.value,
                          }))
                        }
                        fullWidth
                      />
                    </Field>
                  </FormRow>
                  {passwordMessage ? (
                    <Typography variant="meta" tone="muted">
                      {passwordMessage}
                    </Typography>
                  ) : null}
                  <div className={s.buttonRow}>
                    <Button
                      variant="secondary"
                      onClick={handleChangePassword}
                      loading={passwordStatus === 'saving'}
                    >
                      Change password
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsPasswordFormOpen(false);
                        setPasswordStatus('idle');
                        setPasswordMessage(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </Stack>
              ) : (
                <div className={s.buttonRow}>
                  <Button
                    variant="secondary"
                    onClick={() => setIsPasswordFormOpen(true)}
                  >
                    Change password
                  </Button>
                  <Button variant="outline" onClick={() => signOut()}>
                    Log out
                  </Button>
                </div>
              )}
              <Typography variant="caption" tone="muted">
                Sessions are secured with httpOnly cookies.
              </Typography>
            </Stack>
          </section>
        </Stack>
      </Container>
    </AppShell>
  );
}
