import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { Alert, Button, Card, Skeleton } from '../../components/ui';
import { post } from '../../api/client';
import { useAuth } from '../../lib/auth';

export default function VerifyEmail() {
  const { token } = useParams();
  const { setUser } = useAuth();
  const [state, setState] = useState({ status: 'loading' });
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    post('/auth/verify', { token })
      .then((d) => {
        setUser(d.user);
        setState({ status: 'ok' });
      })
      .catch((e) => setState({ status: 'error', message: e.message }));
  }, [token, setUser]);

  return (
    <AuthLayout>
      {state.status === 'loading' && <Skeleton className="h-56 w-full" />}
      {state.status === 'ok' && (
        <Card className="flex flex-col gap-3 border-success/50 bg-success-soft p-6">
          <p className="eyebrow text-success-ink">After clicking the link</p>
          <h1 className="text-[26px] font-bold">Email verified</h1>
          <p className="text-[15px] leading-6 text-muted">
            Your account is active. You can now post reviews, rate mid-terms and finals, and download resources.
          </p>
          <Button to="/" size="lg" className="mt-1 h-12">
            Continue to CourseLens
          </Button>
        </Card>
      )}
      {state.status === 'error' && (
        <div className="flex flex-col gap-4">
          <Alert>{state.message}</Alert>
          <Button to="/login" variant="secondary">
            Back to log in
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
