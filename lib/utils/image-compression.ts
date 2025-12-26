import imageCompression from 'browser-image-compression';

/**
 * Resize and compress profile image to 400x400px JPEG
 * @param file - Original image file
 * @returns Compressed File object
 */
export async function resizeProfileImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5,              // Max file size 500KB
    maxWidthOrHeight: 400,        // Resize to 400x400
    useWebWorker: true,           // Use web worker for better performance
    fileType: 'image/jpeg',       // Convert all to JPEG for consistency
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Image compression error:', error);
    throw new Error('Failed to process image');
  }
}
