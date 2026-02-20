// src/services/cloudinaryService.js

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const uploadToCloudinary = async (file, folder = 'events') => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size must be less than 10MB');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const data = await response.json();
    console.log('✅ Uploaded to Cloudinary:', data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw error;
  }
};

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

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        if (onProgress) onProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        console.log('✅ Uploaded to Cloudinary:', response.secure_url);
        resolve(response.secure_url);
      } else {
        const error = JSON.parse(xhr.responseText);
        console.error('❌ Upload failed:', error);
        reject(new Error(error.error?.message || 'Upload failed'));
      }
    });

    xhr.addEventListener('error', () => {
      console.error('❌ Upload network error');
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      console.error('❌ Upload aborted');
      reject(new Error('Upload was aborted'));
    });

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
    xhr.send(formData);
  });
};

export const getOptimizedUrl = (url, options = {}) => {
  if (!url || !url.includes('cloudinary.com')) return url;

  const {
    width = 800,
    height = 600,
    quality = 'auto',
    format = 'auto',
    crop = 'fill'
  } = options;

  const urlParts = url.split('/upload/');
  if (urlParts.length !== 2) return url;

  const transformation = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
  return `${urlParts[0]}/upload/${transformation}/${urlParts[1]}`;
};

export const getThumbnailUrl = (url) => {
  return getOptimizedUrl(url, {
    width: 200,
    height: 200,
    quality: 'auto',
    format: 'auto',
    crop: 'fill'
  });
};

export const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

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
  uploadToCloudinary,
  uploadWithProgress,
  getOptimizedUrl,
  getThumbnailUrl,
  compressImage,
};