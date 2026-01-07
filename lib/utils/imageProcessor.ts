/**
 * Image Processing Utility
 * Resizes and crops images to exact dimensions with center crop (object-fit: cover behavior)
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessImageOptions {
  width: number;
  height: number;
  quality?: number; // 0-1, default 0.85
  maxFileSizeMB?: number; // default 10
}

export interface ProcessedImage {
  blob: Blob;
  preview: string; // Object URL for preview
  dimensions: ImageDimensions;
  size: number; // Size in bytes
}

/**
 * Validates image file before processing
 */
export function validateImageFile(file: File, maxSizeMB: number = 10): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: "No file selected" };
  }

  // Check file type
  const validTypes = ["image/png", "image/jpeg", "image/jpg"];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Please use PNG or JPG.`,
    };
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Loads image from file and returns Image element
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Failed to load image. Please try a different file."));
    img.onload = () => resolve(img);

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error("Failed to read file data"));
      }
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Resizes and crops image to exact dimensions with center crop
 * Maintains aspect ratio by cropping (object-fit: cover behavior)
 * Never stretches or distorts the image
 */
export async function processImage(
  file: File,
  options: ProcessImageOptions
): Promise<ProcessedImage> {
  const { width, height, quality = 0.85, maxFileSizeMB = 10 } = options;

  // Validate file
  const validation = validateImageFile(file, maxFileSizeMB);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid file");
  }

  console.log(`📸 [Image Processor] Processing: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) → ${width}×${height}`);

  // Load image
  const img = await loadImage(file);

  // Create canvas with target dimensions
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  // Calculate source dimensions for center crop
  const sourceAspect = img.width / img.height;
  const targetAspect = width / height;

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = img.width;
  let sourceHeight = img.height;

  // Determine crop area to maintain aspect ratio
  if (sourceAspect > targetAspect) {
    // Image is wider than target - crop sides (center horizontally)
    sourceWidth = img.height * targetAspect;
    sourceX = (img.width - sourceWidth) / 2;
  } else {
    // Image is taller than target - crop top/bottom (center vertically)
    sourceHeight = img.width / targetAspect;
    sourceY = (img.height - sourceHeight) / 2;
  }

  // Fill background with white (for transparency)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // Draw image with center crop
  ctx.drawImage(
    img,
    sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle (cropped)
    0, 0, width, height // Destination rectangle (full canvas)
  );

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create image blob"));
          return;
        }

        const processedSizeMB = blob.size / (1024 * 1024);
        console.log(`✅ [Image Processor] Success: ${width}×${height} (${processedSizeMB.toFixed(2)}MB, ${(quality * 100).toFixed(0)}% quality)`);

        // Create preview URL
        const preview = URL.createObjectURL(blob);

        resolve({
          blob,
          preview,
          dimensions: { width, height },
          size: blob.size,
        });
      },
      "image/jpeg", // Always output as JPEG for consistency and compression
      quality
    );
  });
}

/**
 * Preset configurations for event cover images
 */
export const IMAGE_PRESETS = {
  WIDE: {
    width: 1920,
    height: 1080,
    quality: 0.85,
    maxFileSizeMB: 10,
  },
  PORTRAIT: {
    width: 1080,
    height: 1920,
    quality: 0.85,
    maxFileSizeMB: 10,
  },
} as const;

/**
 * Clean up preview URL to prevent memory leaks
 */
export function revokePreviewUrl(url: string): void {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

