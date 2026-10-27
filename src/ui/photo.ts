/**
 * Photos taken with the phone (machine plate, body photo). Body photos are
 * taken inside the app (CameraCapture.vue); elsewhere, the file input with
 * `capture` opens the phone's camera app (on Android, thanks to the
 * IMAGE_CAPTURE query of the manifest). The picture is shrunk to keep the
 * local database small. Photos never leave the phone.
 */
export const PHOTO_MAX_SIDE = 900;

export interface Area {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Draws `area` of a picture, at most PHOTO_MAX_SIDE wide or high, as a JPEG
 * data URL.
 */
export function shrinkToJpeg(source: CanvasImageSource, area: Area): string {
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(area.width, area.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width * scale);
  canvas.height = Math.round(area.height * scale);
  canvas
    .getContext('2d')
    ?.drawImage(source, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

export async function readPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image illisible'));
      img.src = url;
    });
    return shrinkToJpeg(image, { x: 0, y: 0, width: image.width, height: image.height });
  } finally {
    URL.revokeObjectURL(url);
  }
}
