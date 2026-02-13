import '@radix-ui/themes/styles.css';
import './index.scss';

import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from '@/App';
import { AuthProvider } from '@/app/auth';
import { Toaster } from '@/app/toast';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Theme accentColor="teal" grayColor="slate" radius="large">
            <App />
          </Theme>
          <Toaster
            position="top-right"
            richColors
            closeButton
            duration={3000}
            theme="light"
            className="echo-toaster"
            toastOptions={{ className: 'echo-toast', closeButton: false }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
