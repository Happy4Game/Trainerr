import { describe, expect, it } from 'vitest';
import { templateName } from '@/domain/templateName';

const translate = (key: string) => (key === 'templates.pushA' ? 'Push A' : `?${key}`);
const custom = [{ id: 'abc', name: 'Bras du vendredi', exerciseIds: [] }];

describe('session names', () => {
  it('translates the built-in templates', () => {
    expect(templateName('pushA', { translate, custom, fallback: 'Ma séance' })).toBe('Push A');
  });

  it('uses the name given by the user for a custom session', () => {
    expect(templateName('custom:abc', { translate, custom, fallback: 'Ma séance' })).toBe(
      'Bras du vendredi',
    );
  });

  it('falls back to a generic name when the custom session was deleted', () => {
    expect(templateName('custom:old', { translate, custom, fallback: 'Ma séance' })).toBe(
      'Ma séance',
    );
  });

  it('names a ready-made session from its translation', () => {
    expect(templateName('preset:pull', { translate, custom, fallback: 'Ma séance' })).toBe(
      '?presets.sessions.pull',
    );
  });
});
