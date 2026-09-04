import React, { useEffect } from 'react';
import './App.css';
import { Outlet } from 'react-router-dom';
import toast, {Toaster} from 'react-hot-toast';

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('chat-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <>
    <Toaster/>
    <main>
      <Outlet/>
    </main>
    </>
  );
}

export default App;