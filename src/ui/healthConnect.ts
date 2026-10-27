import { Capacitor, registerPlugin } from '@capacitor/core';
import type { HealthWeighing } from '@/domain/healthWeights';

/** Native side: android/app/src/main/java/fr/trainerr/app/HealthWeightPlugin.kt. */
interface HealthWeightPlugin {
  availability(): Promise<{ status: 'available' | 'updateRequired' | 'unavailable' }>;
  requestPermission(): Promise<{ granted: boolean }>;
  readWeights(options: { since: string }): Promise<{ weighings: HealthWeighing[] }>;
}

const HealthWeight = registerPlugin<HealthWeightPlugin>('HealthWeight');

/** Health Connect is Android's: elsewhere the button is not shown. */
export const healthConnectSupported = () => Capacitor.getPlatform() === 'android';

/** Where to install or update Health Connect. */
export const HEALTH_CONNECT_STORE =
  'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

export type HealthImport =
  | { kind: 'done'; weighings: HealthWeighing[] }
  | { kind: 'unavailable' | 'updateRequired' | 'denied' };

/** Asks for the permission if needed, then reads the weighings since a day. */
export async function readHealthWeighings(since: string): Promise<HealthImport> {
  const { status } = await HealthWeight.availability();
  if (status !== 'available') return { kind: status };
  const { granted } = await HealthWeight.requestPermission();
  if (!granted) return { kind: 'denied' };
  const { weighings } = await HealthWeight.readWeights({ since });
  return { kind: 'done', weighings };
}
