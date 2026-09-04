import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import Sidebar from '../component/Sidebar';
import logo from '../assets/logo.png';

const Home = () => {
  const [user, setUser] = useState(null);
  const [socketConnection, setSocketConnection] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
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
          const socket = io(process.env.REACT_APP_BACKEND_URL, {
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
      if (socketConnection) {
        socketConnection.disconnect();
      }
    };
  }, [navigate]);

  if (!user) {
    return <div className="flex justify-center items-center h-screen bg-slate-100">Loading...</div>;
  }

  const basePath = location.pathname === '/';

  return (
    <div className='grid lg:grid-cols-[300px,1fr] h-screen max-h-screen'>
      <section className={`bg-white ${!basePath && 'hidden'} lg:block`}>
        <Sidebar user={user} onlineUsers={onlineUsers} socketConnection={socketConnection} />
      </section>

      {/** Message component area **/}
      <section className={`${basePath && 'hidden'} lg:block`}>
        <Outlet context={{ user, socketConnection, onlineUsers }} />
      </section>
      
      {basePath && (
        <div className='hidden lg:flex justify-center items-center flex-col h-full bg-slate-50'>
          <div>
             <img src={logo} alt="logo" width={250} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;