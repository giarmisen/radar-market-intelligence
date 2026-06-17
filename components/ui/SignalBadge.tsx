import { isNewSignal } from "@/lib/format";

interface SignalBadgeProps {
  capturedAt?: string | null;
}

export function SignalBadge({ capturedAt }: SignalBadgeProps) {
  if (!isNewSignal(capturedAt)) {
    return null;
  }

  return <span className="radar-new-badge">New</span>;
}
