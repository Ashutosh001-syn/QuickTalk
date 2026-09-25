import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { RouterProvider } from 'react-router-dom';
import router from './routes';

const originalError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  if (typeof message === 'string' && (message.includes('ResizeObserver loop completed with undelivered notifications') || message.includes('ResizeObserver loop limit exceeded'))) {
    return true; // Prevents the error from propagating to the Webpack overlay
  }
  if (originalError) {
    return originalError(message, source, lineno, colno, error);
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router ={router}>
    <App />
    </RouterProvider>
  
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
