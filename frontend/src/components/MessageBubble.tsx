import { ReactNode } from 'react';

interface MessageBubbleProps {
  icon?: string;
  children: ReactNode;
}

export function MessageBubble({ icon = '👇', children }: MessageBubbleProps) {
  return (
    <div className="message-bubble">
      <div className="message-bubble__header">
        {icon && <span className="message-bubble__icon">{icon}</span>}
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}