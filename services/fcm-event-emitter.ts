export type NotificationEventPayload = {
  kind?: "gempa_dirasakan" | "tsunami_alert";
  title: string;
  body: string;
  data?: Record<string, unknown>;
  subject?: string;
  headline?: string;
  description?: string;
  level?: string;
  message?: string;
};

type Listener = (payload: NotificationEventPayload) => void;

class NotificationEventEmitter {
  private listeners: Listener[] = [];

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(payload: NotificationEventPayload) {
    this.listeners.forEach((listener) => listener(payload));
  }
}

export const notificationEmitter = new NotificationEventEmitter();
