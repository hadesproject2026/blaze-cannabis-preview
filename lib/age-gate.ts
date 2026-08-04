export const AGE_STORAGE_KEY = 'blaze.age-verified.v1';

export function readAgeVerified(): boolean {
  try {
    return window.localStorage.getItem(AGE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeAgeVerified(): void {
  try {
    window.localStorage.setItem(AGE_STORAGE_KEY, 'true');
  } catch {
    // Storage blocked — the gate simply reappears next visit.
  }
}
