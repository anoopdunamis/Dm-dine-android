import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error handler for easier debugging in preview
window.onerror = function(message, source, lineno, colno, error) {
  console.error("Global Error Caught: ", message, error);
};

// Register Service Worker for PWA / Android Installation
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Could not find root element to mount to");
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}