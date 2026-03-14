// src/services/firebaseStorageService.js

import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Upload image to Firebase Storage with progress tracking
 * @param {File} file - Image file to upload
 * @param {string} folder - Storage folder (e.g., 'events', 'users')
 * @param {function} onProgress - Callback for upload progress (0-100)
 * @returns {Promise<string>} - Download URL of uploaded image
 */
export const uploadWithProgress = (file, folder = 'events', onProgress) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('File size must be less than 10MB'));
      return;
    }

    // Create unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const filename = `${timestamp}_${randomString}_${file.name}`;
    const storagePath = `${folder}/${filename}`;

    // Create storage reference
    const storageRef = ref(storage, storagePath);

    // Start upload
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Track upload progress
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(Math.round(progress));
        }
        console.log(`📤 Upload progress: ${Math.round(progress)}%`);
      },
      (error) => {
        console.error('❌ Upload error:', error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('✅ Upload complete:', downloadURL);
          resolve(downloadURL);
        } catch (error) {
          console.error('❌ Error getting download URL:', error);
          reject(error);
        }
      }
    );
  });
};

/**
 * Upload image to Firebase Storage (without progress tracking)
 * @param {File} file - Image file to upload
 * @param {string} folder - Storage folder
 * @returns {Promise<string>} - Download URL of uploaded image
 */
export const uploadToFirebase = async (file, folder = 'events') => {
  return uploadWithProgress(file, folder, null);
};

/**
 * Delete image from Firebase Storage
 * @param {string} imageUrl - Full download URL of the image
 */
export const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('firebase')) {
      console.warn('Invalid Firebase Storage URL');
      return;
    }

    // Extract path from URL
    const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/';
    if (!imageUrl.startsWith(baseUrl)) {
      console.warn('Not a Firebase Storage URL');
      return;
    }

    const pathStart = imageUrl.indexOf('/o/') + 3;
    const pathEnd = imageUrl.indexOf('?');
    const encodedPath = imageUrl.substring(pathStart, pathEnd);
    const decodedPath = decodeURIComponent(encodedPath);

    const imageRef = ref(storage, decodedPath);
    await deleteObject(imageRef);
    console.log('✅ Image deleted from Firebase Storage');
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    throw error;
  }
};

/**
 * Compress image before upload
 * @param {File} file - Original image file
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} quality - JPEG quality (0.0 - 1.0)
 * @returns {Promise<File>} - Compressed image file
 */
export const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if image is too wide
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed JPEG blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              console.log(`📦 Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
              resolve(compressedFile);
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export default {
  uploadToFirebase,
  uploadWithProgress,
  deleteImage,
  compressImage,
};