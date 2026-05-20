import { ReactNode } from 'react';

interface MessageBubbleProps {
  icon?: string;
  /** Blue circle step number (replaces icon when set) */
  step?: number;
  children: ReactNode;
}

export function MessageBubble({ icon = '👇', step, children }: MessageBubbleProps) {
  return (
    <div className="message-bubble">
      <div className="message-bubble__header">
        {step != null ? (
          <span className="step-item__num message-bubble__step">{step}</span>
        ) : (
          icon && <span className="message-bubble__icon">{icon}</span>
        )}
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
