import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Button, Card, CardBody, CardHeader, CardTitle, Input } from '../ui';
import { isUnlocked, tryUnlock } from '../lib/auth';

export interface AccessGateProps {
  children: ReactNode;
}

/**
 * Wraps the app behind the shared-token check. When the gate is disabled or the
 * browser has already unlocked, children render straight through; otherwise a
 * token entry screen stands in until the correct token is provided.
 */
export function AccessGate({ children }: AccessGateProps) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string>();
  const [checking, setChecking] = useState(false);

  if (unlocked) return <>{children}</>;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setChecking(true);
    setError(undefined);
    const ok = await tryUnlock(token);
    setChecking(false);
    if (ok) {
      setUnlocked(true);
    } else {
      setError('That token is not correct.');
      setToken('');
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-surface-muted px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Stock &amp; Logistics</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input
              label="Access token"
              type="password"
              autoFocus
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              error={error}
              hint="Enter the shared token to open this demo."
            />
            <Button type="submit" loading={checking} disabled={token.length === 0}>
              Unlock
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
