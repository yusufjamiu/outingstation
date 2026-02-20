import { Toaster } from 'react-hot-toast';

export default function ToastContainer() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Default options
        duration: 3000,
        style: {
          background: '#fff',
          color: '#1f2937',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        },
        // Success
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#22d3ee',
            secondary: '#fff',
          },
          style: {
            background: '#ecfeff',
            color: '#0e7490',
            border: '1px solid #22d3ee',
          },
        },
        // Error
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          style: {
            background: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #ef4444',
          },
        },
        // Loading
        loading: {
          style: {
            background: '#f3f4f6',
            color: '#4b5563',
          },
        },
      }}
    />
  );
}