/** Name of a session template: built-in (translated) or made by the user. */
export function templateName(
  templateId: string,
  context: {
    translate: (key: string) => string;
    custom: readonly { readonly id: string; readonly name: string }[];
    /** Name of a custom session that no longer exists. */
    fallback: string;
  },
): string {
  if (templateId.startsWith('custom:')) {
    const id = templateId.slice('custom:'.length);
    return context.custom.find((c) => c.id === id)?.name ?? context.fallback;
  }
  return context.translate(`templates.${templateId}`);
}
