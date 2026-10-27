/**
 * Photos taken with the phone (machine plate, monthly body photo). The file
 * input with `capture` opens the camera on phones, in the browser and in the
 * app alike (on Android, thanks to the IMAGE_CAPTURE query of the manifest); the
 * picture is shrunk to keep the local database small. Photos never leave the
 * phone.
 */
export const PHOTO_MAX_SIDE = 900;

export async function readPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image illisible'));
      img.src = url;
    });
    const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}
