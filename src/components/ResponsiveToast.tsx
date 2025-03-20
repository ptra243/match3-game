import React from 'react';
import { toast, ToastBar, Toaster, resolveValue } from 'react-hot-toast';
import { useEffect, useState } from 'react';

// Track if toast has been configured already
let toastConfigured = false;

// Custom toast styling specific to mobile devices
const isMobile = () => window.innerWidth < 768;

// Configure the toast options specifically for mobile
const configureMobileToast = () => {
  if (isMobile() && !toastConfigured) {
    // Override the default toast styles for mobile
    const originalToast = toast.success;
    toast.success = (message, options) => {
      // Check if this is a yellow-related message to use shield icon
      let icon = undefined;
      if (typeof message === 'string') {
        const msgText = message.toLowerCase();
        if (msgText.includes('yellow') || msgText.includes('turn')) {
          icon = '🛡️';
        }
      }
      
      return originalToast(message, {
        duration: 2000, // Shorter duration on mobile
        style: {
          fontSize: '0.75rem', // Smaller font size
          padding: '0.5rem 0.75rem',
          maxWidth: '90vw',
          // Any other mobile-specific styles
        },
        icon,
        ...options
      });
    };

    const originalError = toast.error;
    toast.error = (message, options) => {
      return originalError(message, {
        duration: 2000, // Shorter duration on mobile
        style: {
          fontSize: '0.75rem', // Smaller font size
          padding: '0.5rem 0.75rem',
          maxWidth: '90vw',
          // Any other mobile-specific styles
        },
        ...options
      });
    };
    
    toastConfigured = true;
  }
};

export const ResponsiveToaster: React.FC = () => {
  const [configured, setConfigured] = useState(false);
  
  useEffect(() => {
    // Only configure if not already done
    if (!toastConfigured) {
      // Configure mobile toast on mount
      configureMobileToast();
      setConfigured(true);
      
      const handleResize = () => {
        configureMobileToast();
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  return (
    <Toaster position="top-center">
      {(t) => (
        <ToastBar toast={t} style={{ 
          ...t.style,
          // Make the toast container smaller on mobile
          ...(isMobile() ? {
            fontSize: '0.75rem',
            padding: '0.5rem 0.75rem',
            maxWidth: '90vw'
          } : {}),
          position: 'relative', // Needed for absolute positioning of the close button
          paddingRight: '24px' // Add space for the close button
        }}>
          {({ icon, message }) => (
            <>
              {icon}
              <div className={isMobile() ? 'text-xs' : 'text-sm'}>
                {message}
              </div>
              {t.type !== 'loading' && (
                <button 
                  onClick={() => toast.dismiss(t.id)} 
                  className="text-gray-400 hover:text-gray-600"
                  style={{ 
                    position: 'absolute',
                    top: '4px',
                    right: '6px',
                    fontSize: isMobile() ? '0.6rem' : '0.7rem',
                    lineHeight: 1,
                    background: 'transparent',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer'
                  }}
                  aria-label="Close"
                >
                  ✕
                </button>
              )}
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
};

// Function to initialize responsive toast behavior
export const initResponsiveToast = () => {
  configureMobileToast();
}; 