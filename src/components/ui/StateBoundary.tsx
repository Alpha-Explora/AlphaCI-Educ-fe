// ============================================================================
// VIEW LAYER — StateBoundary
// Uniform loading / error / network / empty handling driven by ViewModel state.
// Views wrap their content in this so degraded backends render cleanly instead
// of crashing.
// ============================================================================
import type { ReactNode } from "react";
import type { PresentableError } from "@/viewmodels/errors";
import { Banner } from "./Banner";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { brand } from "@/config/brand";

export function StateBoundary({
  isLoading,
  error,
  isEmpty,
  onRetry,
  loadingFallback,
  emptyFallback,
  children,
}: {
  isLoading: boolean;
  error: PresentableError | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingFallback: ReactNode;
  emptyFallback?: ReactNode;
  children: ReactNode;
}) {
  if (isLoading) return <>{loadingFallback}</>;

  if (error) {
    if (error.isNetworkError) {
      return (
        <Banner
          tone="network"
          title="Backend not reachable"
          action={
            onRetry && (
              <Button size="sm" variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            )
          }
        >
          Could not reach the {brand.name} API at <code className="font-mono">{error.baseUrl}</code>.
          Start the backend (<code className="font-mono">AlphaCI-Educ-be</code>) on port 4000,
          then retry.
        </Banner>
      );
    }
    return (
      <Banner
        tone="error"
        title="Something went wrong"
        action={
          onRetry && (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        {error.message}
      </Banner>
    );
  }

  if (isEmpty) {
    return <>{emptyFallback ?? <EmptyState title="Nothing here yet" />}</>;
  }

  return <>{children}</>;
}
