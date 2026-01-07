/**
 * Firebase Storage Upload Utility
 * Handles image uploads with progress tracking and error handling
 */

import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, UploadTask } from "firebase/storage";
import { firebaseApp } from "@/lib/firebase";

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  path: string;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onError?: (error: Error) => void;
}

/**
 * Uploads a blob/file to Firebase Storage
 */
export async function uploadToFirebaseStorage(
  file: Blob | File,
  path: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { onProgress, onError } = options;

  try {
    const storage = getStorage(firebaseApp);
    const fileRef = storageRef(storage, path);

    // Create upload task
    const uploadTask: UploadTask = uploadBytesResumable(fileRef, file);

    // Return promise that resolves when upload completes
    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Progress callback
          const progress: UploadProgress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percentage: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
          };

          if (onProgress) {
            onProgress(progress);
          }

          console.log(`📤 [Firebase Upload] ${path}: ${progress.percentage.toFixed(1)}%`);
        },
        (error) => {
          // Error callback
          const uploadError = new Error(`Upload failed: ${error.message}`);
          console.error(`❌ [Firebase Upload] ${path}:`, error);

          if (onError) {
            onError(uploadError);
          }

          reject(uploadError);
        },
        async () => {
          // Success callback
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log(`✅ [Firebase Upload] ${path}: Complete`);

            resolve({
              url: downloadURL,
              path: uploadTask.snapshot.ref.fullPath,
            });
          } catch (error) {
            const urlError = new Error(`Failed to get download URL: ${error instanceof Error ? error.message : "Unknown error"}`);
            console.error(`❌ [Firebase Upload] ${path}:`, urlError);

            if (onError) {
              onError(urlError);
            }

            reject(urlError);
          }
        }
      );
    });
  } catch (error) {
    const uploadError = new Error(`Upload initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    console.error(`❌ [Firebase Upload] ${path}:`, uploadError);

    if (onError) {
      onError(uploadError);
    }

    throw uploadError;
  }
}

/**
 * Generates a unique file path for event cover images
 */
export function generateCoverImagePath(
  eventId: string | null,
  type: "wide" | "portrait",
  originalFileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const extension = "jpg"; // Always use .jpg for processed images

  if (eventId) {
    return `events/covers/${eventId}_${type}_${timestamp}.${extension}`;
  }

  return `events/covers/temp_${type}_${timestamp}_${sanitizedFileName}.${extension}`;
}

