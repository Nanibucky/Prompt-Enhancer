import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Global error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default browser behavior
  event.preventDefault();
});

// Global error handling for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

console.log('Main React component rendering...');

const rootElement = document.getElementById("root");
console.log('Root element:', rootElement);

if (rootElement) {
  createRoot(rootElement).render(<App />);
  console.log('App rendered successfully');
} else {
  console.error('Root element not found!');
}
