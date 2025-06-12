import React, { useEffect } from 'react';

const PlausibleScript = () => {
  useEffect(() => {
    // Add Plausible analytics script
    const script = document.createElement('script');
    script.defer = true;
    script.setAttribute('data-domain', 'llmpagerank.com');
    script.src = 'https://plausible.io/js/script.js';
    
    // Only add if not already present
    if (!document.querySelector('script[data-domain="llmpagerank.com"]')) {
      document.head.appendChild(script);
    }
    
    return () => {
      // Cleanup on unmount
      const existingScript = document.querySelector('script[data-domain="llmpagerank.com"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return null; // This component doesn't render anything
};

export default PlausibleScript; 