/**
 * Hands a file to the phone's share menu (Drive, e-mail, messaging…) when it
 * can take files, otherwise saves it through the browser. Nothing is sent
 * anywhere without the user choosing where.
 */
export async function shareOrDownload(name: string, content: Blob, title: string): Promise<void> {
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
