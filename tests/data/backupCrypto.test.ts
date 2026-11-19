import { describe, expect, it } from 'vitest';
import { decryptText, encryptText, isEncryptedFile } from '@/data/crypto/backupCrypto';

describe('encrypted backup', () => {
  it('gets the text back with the right password', async () => {
    const file = await encryptText('{"séances": 6}', 'mot de passe solide');
    expect(isEncryptedFile(file)).toBe(true);
    expect(file.data).not.toContain('séances');
    expect(await decryptText(file, 'mot de passe solide')).toBe('{"séances": 6}');
  });

  it('refuses a wrong password', async () => {
    const file = await encryptText('secret', 'bon');
    await expect(decryptText(file, 'mauvais')).rejects.toMatchObject({ code: 'wrongPassword' });
  });

  it('uses a new salt and IV for every file', async () => {
    const a = await encryptText('x', 'p');
    const b = await encryptText('x', 'p');
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
  });

  // Before: String.fromCharCode(...bytes) threw "Maximum call stack size
  // exceeded" past ~100 000 bytes, that is a backup with a single photo.
  it('encrypts a large backup (5 MB, photos included)', async () => {
    const big = 'données '.repeat(650_000);
    const file = await encryptText(big, 'mot de passe solide');
    expect(await decryptText(file, 'mot de passe solide')).toBe(big);
  });

  it('calls a damaged file a wrong password, never a technical error', async () => {
    const file = await encryptText('x', 'p');
    await expect(decryptText({ ...file, salt: '%%%' }, 'p')).rejects.toMatchObject({
      code: 'wrongPassword',
    });
  });
});
