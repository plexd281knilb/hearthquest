/**
 * HearthQuest Build & Release Channel Metadata
 * Automatically synchronized by `scripts/release-verify.ts`
 */

export type ReleaseChannel = "dev" | "beta" | "main";

export interface BuildMetadata {
  version: string;
  buildNumber: number;
  channel: ReleaseChannel;
  updatedAt: string;
  badgeText: string;
}

export const APP_VERSION = "0.1.10";
export const BUILD_NUMBER = 11;
export const BUILD_UPDATED_AT = "2026-11-15T02:15:15.569Z";

export function getReleaseChannel(envChannel?: string): ReleaseChannel {
  const raw = (envChannel || process.env.HEARTHQUEST_CHANNEL || process.env.GIT_BRANCH || "dev")
    .trim()
    .toLowerCase();
  if (raw === "main" || raw === "production" || raw === "prod") {
    return "main";
  }
  if (raw === "beta" || raw === "staging") {
    return "beta";
  }
  return "dev";
}

export function getBuildMetadata(envChannel?: string): BuildMetadata {
  const channel = getReleaseChannel(envChannel);
  const channelLabel = channel.toUpperCase();
  return {
    version: APP_VERSION,
    buildNumber: BUILD_NUMBER,
    channel,
    updatedAt: BUILD_UPDATED_AT,
    badgeText: `v${APP_VERSION} • ${channelLabel} (Build #${BUILD_NUMBER})`,
  };
}
