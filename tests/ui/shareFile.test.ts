import { describe, expect, it } from 'vitest';
import { toBase64 } from '@/ui/shareFile';

describe('toBase64', () => {
  it('encodes text, accents included, as the Android side decodes it', async () => {
    const text = 'séance;charge\nDéveloppé couché;67,5';
    const encoded = await toBase64(new Blob([text]));
    expect(Buffer.from(encoded, 'base64').toString('utf8')).toBe(text);
  });

  it('encodes a file larger than one chunk', async () => {
    const bytes = new Uint8Array(100_000).map((_, i) => i % 256);
    const encoded = await toBase64(new Blob([bytes]));
    expect(new Uint8Array(Buffer.from(encoded, 'base64'))).toEqual(bytes);
  });
});
