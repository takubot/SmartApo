// lib/setupStatus.ts
// セットアップ状態の管理

const SETUP_KEY = "dialer_setup_status";

export interface SetupStepStatus {
  pbxConnected: boolean;
  sipTrunkConfigured: boolean;
  userRegistered: boolean;
  contactImported: boolean;
  campaignCreated: boolean;
}

const DEFAULT_STATUS: SetupStepStatus = {
  pbxConnected: false,
  sipTrunkConfigured: false,
  userRegistered: false,
  contactImported: false,
  campaignCreated: false,
};

export function getSetupStatus(): SetupStepStatus {
  if (typeof window === "undefined") return DEFAULT_STATUS;
  const raw = localStorage.getItem(SETUP_KEY);
  if (!raw) return DEFAULT_STATUS;
  try {
    return { ...DEFAULT_STATUS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATUS;
  }
}

export function updateSetupStatus(
  partial: Partial<SetupStepStatus>,
): SetupStepStatus {
  const current = getSetupStatus();
  const updated = { ...current, ...partial };
  localStorage.setItem(SETUP_KEY, JSON.stringify(updated));
  return updated;
}

export function isSetupComplete(status: SetupStepStatus): boolean {
  return Object.values(status).every(Boolean);
}

export function getCompletedCount(status: SetupStepStatus): number {
  return Object.values(status).filter(Boolean).length;
}

export function getTotalSteps(): number {
  return Object.keys(DEFAULT_STATUS).length;
}

export function resetSetupStatus(): void {
  localStorage.removeItem(SETUP_KEY);
}
