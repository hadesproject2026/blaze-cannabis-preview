export const ADMIN_STORAGE_KEY = 'blaze.admin.v1';

// Intentionally plain. This is a pitch-demo gate, not a real login — see the
// notice rendered on the gate screen itself (AdminGate.tsx).
export const ADMIN_PASSCODE = 'blaze';

export function readAdminUnlocked(): boolean {
  try {
    return window.localStorage.getItem(ADMIN_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeAdminUnlocked(): void {
  try {
    window.localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
  } catch {
    // Storage blocked — the gate simply reappears next visit.
  }
}
