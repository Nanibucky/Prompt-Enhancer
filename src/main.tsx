import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('Main React component rendering...');

const rootElement = document.getElementById("root");
console.log('Root element:', rootElement);

if (rootElement) {
  createRoot(rootElement).render(<App />);
  console.log('App rendered successfully');
} else {
  console.error('Root element not found!');
}
