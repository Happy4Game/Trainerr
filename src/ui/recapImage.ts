/**
 * Shareable card (end of month, or one session) (1080 × 1350, the portrait size of most social
 * apps), drawn on a canvas. Loads can be hidden; nothing else personal is on it.
 */
export interface RecapCard {
  readonly title: string;
  readonly lines: readonly string[];
  readonly footer: string;
}

export async function drawRecap(card: RecapCard): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
  // Same orange as the hero cards of the app (--tr-hero, light theme).
  gradient.addColorStop(0, '#c2410c');
  gradient.addColorStop(1, '#9a3412');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 76px system-ui, sans-serif';
  ctx.fillText(card.title, 80, 200, 920);
  ctx.font = '56px system-ui, sans-serif';
  card.lines.forEach((line, index) => ctx.fillText(line, 80, 380 + index * 110, 920));
  ctx.font = '40px system-ui, sans-serif';
  ctx.globalAlpha = 0.8;
  ctx.fillText(card.footer, 80, 1260, 920);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image non créée'))),
      'image/png',
    ),
  );
}
