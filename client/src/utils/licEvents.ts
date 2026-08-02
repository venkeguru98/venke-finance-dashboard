export const LIC_UPDATED_EVENT = 'lic:updated';

export function emitLicUpdated() {
  window.dispatchEvent(new CustomEvent(LIC_UPDATED_EVENT));
}

export function subscribeLicUpdates(callback: () => void) {
  const handler = () => callback();
  window.addEventListener(LIC_UPDATED_EVENT, handler);
  return () => {
    window.removeEventListener(LIC_UPDATED_EVENT, handler);
  };
}
