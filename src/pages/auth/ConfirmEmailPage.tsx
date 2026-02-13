import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button, Container, Stack, Typography } from '@/atoms';
import { useAuth } from '@/app/auth';
import { toast } from '@/app/toast';

import s from './AuthFormPage.module.scss';

type ConfirmState = 'loading' | 'error';

export function ConfirmEmailPage() {
  const { confirmEmail } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<ConfirmState>('loading');
  const [message, setMessage] = useState('Confirming your email.');

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token');
  }, [location.search]);

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Missing confirmation token.');
      return;
    }

    confirmEmail({ token })
      .then(() => {
        navigate('/', { replace: true });
      })
      .catch((error: Error) => {
        setState('error');
        setMessage('Unable to confirm your email.');
        toast.error(error.message || 'Unable to confirm your email.');
      });
  }, [confirmEmail, token, navigate]);

  return (
    <div className={s.page}>
      <Container size="narrow" className={s.container}>
        <div className={s.panel}>
          <Stack gap="12px">
            <Typography variant="h2">
              {state === 'loading' ? 'Confirming email' : 'Confirmation failed'}
            </Typography>
            <Typography variant="body" tone="muted">
              {message}
            </Typography>
            {state === 'error' ? (
              <div className={s.actions}>
                <Button as={Link} to="/auth" variant="secondary">
                  Back to sign in
                </Button>
              </div>
            ) : null}
          </Stack>
        </div>
      </Container>
    </div>
  );
}
