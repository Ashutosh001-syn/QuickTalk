import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import Sidebar from '../component/Sidebar';
import { CallProvider } from '../context/CallContext';
import CallScreen from '../component/CallScreen';

const Home = () => {
  const [user, setUser] = useState(null);
  const [socketConnection, setSocketConnection] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let socket;
    const fetchUserDetails = async () => {
      try {
        const URL = `${process.env.REACT_APP_BACKEND_URL}/api/user-details`;
        const response = await axios.get(URL, {
          withCredentials: true
        });

        if (response.data.data && !response.data.data.logout) {
          setUser(response.data.data);
          
          // Connect Socket
          const token = localStorage.getItem('token');
          socket = io(process.env.REACT_APP_BACKEND_URL, {
            auth: {
              token: token
            }
          });

          socket.on('online_users', (data) => {
            setOnlineUsers(data);
          });

          setSocketConnection(socket);
        } else {
          navigate('/email');
        }
      } catch (error) {
        navigate('/email');
      }
    };

    fetchUserDetails();

    return () => {
      socket?.disconnect();
    };
  }, [navigate]);

  if (!user) {
    return <div className="flex justify-center items-center h-screen bg-bg-primary text-white">Loading...</div>;
  }

  const basePath = location.pathname === '/';

  return (
    <CallProvider socketConnection={socketConnection} user={user}>
      <div className='grid lg:grid-cols-[320px,1fr] h-[100dvh] max-h-[100dvh] overflow-hidden'>
        <section className={`glass-panel border-r border-white/5 shadow-2xl z-10 ${!basePath && 'hidden'} lg:block`}>
          <Sidebar user={user} onlineUsers={onlineUsers} socketConnection={socketConnection} />
        </section>

        {/** Message component area **/}
        <section className={`${basePath && 'hidden'} lg:block`}>
          <Outlet context={{ user, socketConnection, onlineUsers }} />
        </section>
        
        {basePath && (
          <div className='hidden lg:flex h-full items-center justify-center bg-transparent p-8 text-center'>
            <p className="text-text-secondary font-medium tracking-wide">Select a chat to start messaging</p>
          </div>
        )}
      </div>
      <CallScreen />
    </CallProvider>
  );
};

export default Home;
