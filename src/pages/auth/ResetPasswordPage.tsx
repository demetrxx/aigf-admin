import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button, Container, Field, Input, Stack, Typography } from '@/atoms';
import { useAuth } from '@/app/auth';
import { toast } from '@/app/toast';

import s from './AuthFormPage.module.scss';

type ResetState = 'idle' | 'submitting' | 'error';

export function ResetPasswordPage() {
  const { confirmPasswordReset } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<ResetState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token');
  }, [location.search]);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setMessage(null);
    setStatus('submitting');
    try {
      await confirmPasswordReset({ token, newPassword });
      navigate('/auth', { replace: true });
    } catch (error) {
      setStatus('error');
      setMessage('Unable to reset your password.');
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to reset your password.',
      );
    }
  };

  return (
    <div className={s.page}>
      <Container size="narrow" className={s.container}>
        <div className={s.panel}>
          <Stack gap="16px">
            <div>
              <Typography variant="h2">Set a new password</Typography>
              <Typography variant="body" tone="muted">
                Choose a password you haven’t used before.
              </Typography>
            </div>
            {token ? (
              <form className={s.form} onSubmit={handleSubmit}>
                <Field label="New password" labelFor="reset-password" required>
                  <Input
                    id="reset-password"
                    type="password"
                    placeholder="Create a new password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    fullWidth
                  />
                </Field>
                {status === 'error' && message ? (
                  <Typography variant="meta" tone="muted">
                    {message}
                  </Typography>
                ) : null}
                <div className={s.actions}>
                  <Button type="submit" loading={status === 'submitting'}>
                    Update password
                  </Button>
                  <Button as={Link} to="/auth" variant="ghost">
                    Back to sign in
                  </Button>
                </div>
              </form>
            ) : (
              <Stack gap="12px">
                <Typography variant="body" tone="muted">
                  {message ?? 'Missing reset token.'}
                </Typography>
                <div className={s.actions}>
                  <Button as={Link} to="/auth" variant="secondary">
                    Back to sign in
                  </Button>
                </div>
              </Stack>
            )}
          </Stack>
        </div>
      </Container>
    </div>
  );
}
