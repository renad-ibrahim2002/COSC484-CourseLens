import { Button, PageTitle } from '../../components/ui';

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <p className="font-display text-7xl font-bold text-brand">404</p>
      <PageTitle>This page doesn't exist</PageTitle>
      <p className="text-muted">The link may be broken, or the page may have been removed.</p>
      <Button to="/">Back to home</Button>
    </div>
  );
}
