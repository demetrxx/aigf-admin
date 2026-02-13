import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button, Container, Field, Input, Stack, Typography } from '@/atoms';
import { useAuth } from '@/app/auth';
import { toast } from '@/app/toast';

import s from './AuthFormPage.module.scss';

type FormState = 'idle' | 'success' | 'error';

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<FormState>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await requestPasswordReset({ email });
      setStatus('success');
    } catch (err) {
      setStatus('idle');
      toast.error(
        err instanceof Error ? err.message : 'Unable to request a reset.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={s.page}>
      <Container size="narrow" className={s.container}>
        <div className={s.panel}>
          <Stack gap="16px">
            <div>
              <Typography variant="h2">Reset password</Typography>
              <Typography variant="body" tone="muted">
                We’ll email you a link to set a new password.
              </Typography>
            </div>

            {status === 'success' ? (
              <Stack gap="12px">
                <Typography variant="body">
                  Check your email for a reset link.
                </Typography>
                <Typography variant="meta" tone="muted">
                  If there’s an account for that email, you’ll receive it
                  shortly.
                </Typography>
                <div className={s.actions}>
                  <Button as={Link} to="/auth" variant="secondary">
                    Back to sign in
                  </Button>
                </div>
              </Stack>
            ) : (
              <form className={s.form} onSubmit={handleSubmit}>
                <Field label="Email" labelFor="forgot-email" required>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@aigfonline.com"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    fullWidth
                  />
                </Field>
                <div className={s.actions}>
                  <Button type="submit" loading={isSubmitting}>
                    Send reset link
                  </Button>
                  <Button as={Link} to="/auth" variant="ghost">
                    Back to sign in
                  </Button>
                </div>
              </form>
            )}
          </Stack>
        </div>
      </Container>
    </div>
  );
}
