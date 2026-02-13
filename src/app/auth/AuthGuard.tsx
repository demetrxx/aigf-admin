import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Container, Stack, Typography } from '@/atoms';

import { useAuth } from './AuthProvider';

export function AuthGuard() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <Container size="narrow">
        <Stack gap="12px">
          <Typography variant="h2">Checking your session</Typography>
          <Typography variant="body" tone="muted">
            Preparing your workspace.
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
