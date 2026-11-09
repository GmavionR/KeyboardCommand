export interface ActivationRequest {
  route: string | null;
  error: string | null;
}

let activationNotice: string | null = null;
const noticeListeners = new Set<() => void>();

export function getActivationNotice() {
  return activationNotice;
}

export function subscribeActivationNotice(listener: () => void) {
  noticeListeners.add(listener);
  return () => noticeListeners.delete(listener);
}

export function setActivationNotice(message: string | null) {
  activationNotice = message;
  for (const listener of noticeListeners) listener();
}
