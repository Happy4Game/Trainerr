import { Capacitor, registerPlugin } from '@capacitor/core';

interface FileSharePlugin {
  share(options: { name: string; data: string; mimeType: string; title: string }): Promise<void>;
}

/** Native share menu of the Android app (see FileSharePlugin.java). */
const FileShare = registerPlugin<FileSharePlugin>('FileShare');

/** The file content in base64, as the native side expects it. */
export async function toBase64(content: Blob): Promise<string> {
  const bytes = new Uint8Array(await content.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Hands a file to the phone's share menu (Drive, e-mail, messaging…) when it
 * can take files, otherwise saves it through the browser. Nothing is sent
 * anywhere without the user choosing where.
 *
 * In the Android app, the WebView can neither share files nor download from a
 * link: the file goes through the native share menu instead.
 */
export async function shareOrDownload(name: string, content: Blob, title: string): Promise<void> {
  if (Capacitor.getPlatform() === 'android') {
    await FileShare.share({
      name,
      data: await toBase64(content),
      mimeType: content.type.split(';')[0] || 'application/octet-stream',
      title,
    });
    return;
  }
  const file = new File([content], name, { type: content.type });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (error) {
      // The user closed the share menu: nothing else to do.
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
