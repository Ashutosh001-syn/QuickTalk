import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { IoChatbubbleEllipses } from 'react-icons/io5';
import { FaUserPlus, FaBell } from 'react-icons/fa';
import { BiLogOut } from 'react-icons/bi';
import { PiUserCircle } from 'react-icons/pi';
import axios from 'axios';
import toast from 'react-hot-toast';
import SearchUser from './SearchUser';
import FriendRequests from './FriendRequests';
import ProfilePage from './ProfilePage';
import { registerAndSubscribePush } from '../helpers/pushNotifications';

const Sidebar = ({ user, onlineUsers, socketConnection }) => {
  const navigate = useNavigate();
  const [users, setUsers] = React.useState([]);
  const [openSearchUser, setOpenSearchUser] = React.useState(false);
  const [openRequests, setOpenRequests] = React.useState(false);
  const [friendRequests, setFriendRequests] = React.useState([]);
  const [openProfile, setOpenProfile] = React.useState(false);

  useEffect(() => {
    registerAndSubscribePush();
  }, []);

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const URL = `${process.env.REACT_APP_BACKEND_URL}/api/users`;
        const response = await axios.get(URL, { withCredentials: true });
        if (response.data.success) {
          setUsers(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch users', error);
      }
    };

    const fetchRequests = async () => {
      try {
        const URL = `${process.env.REACT_APP_BACKEND_URL}/api/friend-requests`;
        const response = await axios.get(URL, { withCredentials: true });
        if (response.data.success) {
          setFriendRequests(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch requests', error);
      }
    };

    fetchUsers();
    fetchRequests();
  }, []);

  const previousOnlineUsers = React.useRef(onlineUsers);

  React.useEffect(() => {
    // Check for newly online users
    if (users.length > 0) {
      const newlyOnline = onlineUsers.filter(id => !previousOnlineUsers.current.includes(id));
      newlyOnline.forEach(id => {
        const contact = users.find(u => u._id === id);
        if (contact && contact._id !== user?._id) {
          toast.success(`${contact.name} is online`, { position: 'top-right' });
        }
      });
    }
    previousOnlineUsers.current = onlineUsers;
  }, [onlineUsers, users, user]);

  const location = useLocation();

  React.useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const toastId = toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-slate-800">Would you like to receive desktop notifications for new messages?</p>
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1 text-sm bg-slate-200 hover:bg-slate-300 rounded text-slate-700 transition-colors"
              >
                Not Now
              </button>
              <button 
                onClick={async () => {
                  toast.dismiss(t.id);
                  const perm = await Notification.requestPermission();
                  if (perm === 'granted') {
                    toast.success('Desktop notifications enabled!');
                  } else if (perm === 'denied') {
                    toast.error('Notifications were denied.');
                  }
                }}
                className="px-3 py-1 text-sm bg-primary hover:bg-teal-600 rounded text-white transition-colors"
              >
                Allow
              </button>
            </div>
          </div>
        ),
        { duration: Infinity, position: 'top-center' }
      );
      
      // Cleanup to dismiss if component unmounts quickly
      return () => toast.dismiss(toastId);
    }
  }, []);

  React.useEffect(() => {
    if (socketConnection && users.length > 0) {
      const handleNewMessage = (msg) => {
        // Update the sidebar last message instantly
        setUsers(prevUsers => {
          const newUsers = [...prevUsers];
          const contactId = msg.sender === user?._id?.toString() ? msg.receiver : msg.sender;
          
          const contactIndex = newUsers.findIndex(u => u._id?.toString() === contactId?.toString());
          if (contactIndex > -1) {
            newUsers[contactIndex] = {
              ...newUsers[contactIndex],
              lastMessage: {
                text: msg.text,
                imageUrl: msg.imageUrl,
                videoUrl: msg.videoUrl
              }
            };
            
            // If message is from the other person and we are not actively in their chat, increment unseenMsg
            if (msg.msgByUserId?.toString() !== user?._id?.toString() && location.pathname !== `/${contactId}`) {
              newUsers[contactIndex].unseenMsg = (newUsers[contactIndex].unseenMsg || 0) + 1;
            }

            // Move this contact to the top of the list!
            const [contact] = newUsers.splice(contactIndex, 1);
            newUsers.unshift(contact);
          }
          return newUsers;
        });

        // Only show notification if message is from someone else
        if (msg.msgByUserId?.toString() !== user?._id?.toString()) {
          const senderId = msg.msgByUserId?.toString();
          const sender = users.find(u => u._id?.toString() === senderId);
          const senderName = sender ? sender.name : 'Someone';
          const senderIcon = sender ? sender.profile_pic : '/favicon.ico';
          
          // In-app toast notification
          toast(`New message from ${senderName}`, { 
            position: 'top-right',
            icon: '💬',
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          });

          // Native OS / Windows notification
          if ('Notification' in window && Notification.permission === 'granted') {
            let bodyText = msg.text || 'New message';
            if (msg.imageUrl) bodyText = '📷 Photo';
            if (msg.videoUrl) bodyText = '🎥 Video';
            
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(senderName, {
                  body: bodyText,
                  icon: senderIcon,
                  badge: '/favicon.ico'
                });
              });
            } else {
              try {
                new Notification(senderName, {
                  body: bodyText,
                  icon: senderIcon,
                });
              } catch (err) {
                console.log('Native notification failed:', err);
              }
            }
          }
        }
      };
      
      socketConnection.on('new_message', handleNewMessage);
      socketConnection.on('friend_request', (req) => {
        setFriendRequests(prev => [...prev, req]);
        toast(`New friend request from ${req.sender.name}`, { icon: '👋' });
      });
      socketConnection.on('request_response', (resp) => {
        if (resp.status === 'accepted') {
          // fetch users again to show in sidebar
          const fetchUsers = async () => {
            const URL = `${process.env.REACT_APP_BACKEND_URL}/api/users`;
            const response = await axios.get(URL, { withCredentials: true });
            if (response.data.success) {
              setUsers(response.data.data);
            }
          };
          fetchUsers();
          toast.success(`${resp.receiver.name} accepted your request`);
        }
      });
      
      return () => {
        socketConnection.off('new_message', handleNewMessage);
        socketConnection.off('friend_request');
        socketConnection.off('request_response');
      };
    }
  }, [socketConnection, users, user, location.pathname]);

  // Clear unseen messages when opening a chat
  React.useEffect(() => {
    if (location.pathname !== '/') {
      const currentChatId = location.pathname.substring(1);
      setUsers(prevUsers => {
        const newUsers = [...prevUsers];
        const contactIndex = newUsers.findIndex(u => u._id?.toString() === currentChatId);
        if (contactIndex > -1 && newUsers[contactIndex].unseenMsg > 0) {
          newUsers[contactIndex] = { ...newUsers[contactIndex], unseenMsg: 0 };
          return newUsers;
        }
        return prevUsers;
      });
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      // Unsubscribe from push notifications so the user stops getting them when logged out
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          try {
            await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/unsubscribe-push`, {
              endpoint: subscription.endpoint
            }, { withCredentials: true });
            
            // Optionally, we could call subscription.unsubscribe() here to completely revoke it from the browser
            // await subscription.unsubscribe();
          } catch (err) {
            console.error("Failed to remove push subscription", err);
          }
        }
      }

      const URL = `${process.env.REACT_APP_BACKEND_URL}/api/logout`;
      const response = await axios.get(URL, { withCredentials: true });
      if (response.data.success) {
        toast.success(response.data.message);
        if (socketConnection) {
          socketConnection.disconnect();
        }
        localStorage.clear();
        navigate('/email');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Logout failed');
    }
  };

  return (
    <div className='w-full h-full bg-bg-secondary text-text-primary transition-colors flex'>
      {/* Left Icon Menu */}
      <div className='bg-bg-sidebar w-16 h-full flex flex-col justify-between py-5 items-center rounded-tr-lg rounded-br-lg shadow-sm z-10 transition-colors'>
        <div className='flex flex-col gap-5'>
          <NavLink
            className={({ isActive }) => `w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded ${isActive ? 'bg-slate-200' : ''}`}
            title='Chat'
          >
            <IoChatbubbleEllipses size={25} />
          </NavLink>
          <div title='Add Friend' onClick={() => setOpenSearchUser(true)} className='w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded' >
            <FaUserPlus size={25} />
          </div>
          <div title='Friend Requests' onClick={() => setOpenRequests(true)} className='relative w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded'>
            <FaBell size={25} />
            {friendRequests.length > 0 && (
              <span className='absolute top-2 right-2 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center'>
                {friendRequests.length}
              </span>
            )}
          </div>
        </div>

        <div className='flex flex-col gap-5 items-center'>
          <button className='w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded' title='Profile' onClick={() => setOpenProfile(true)}>
            {user?.profile_pic ? (
              <img src={user?.profile_pic} className='w-10 h-10 rounded-full object-cover' alt='profile' />
            ) : (
              <PiUserCircle size={35} />
            )}
          </button>
          <button
            className='w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded text-slate-600'
            title='Logout'
            onClick={handleLogout}
          >
            <span className='-ml-1'>
              <BiLogOut size={25} />
            </span>
          </button>
        </div>
      </div>

      {/* Main Sidebar Area */}
      <div className='w-full'>
        <div className='h-16 flex items-center px-4'>
          <h2 className='text-xl font-bold text-text-primary h-16 p-4'>Messages</h2>
        </div>
        <div className='bg-slate-200 p-[0.5px]'></div>

        <div className='h-[calc(100vh-65px)] overflow-x-hidden overflow-y-auto scrollbar'>
          {users.length === 0 && (
            <div className='mt-12'>
              <div className='flex justify-center items-center my-4 text-slate-500'>
                <FaUserPlus size={50} />
              </div>
              <p className='text-lg text-center text-slate-400'>Explore users to start a conversation with.</p>
            </div>
          )}

          {[...users].sort((a, b) => {
            const aOnline = onlineUsers.includes(a._id);
            const bOnline = onlineUsers.includes(b._id);
            if (aOnline && !bOnline) return -1;
            if (!aOnline && bOnline) return 1;
            return 0;
          }).map((contact) => {
            const isOnline = onlineUsers.includes(contact._id);
            return (
              <NavLink
                to={`/${contact._id}`}
                key={contact._id}
                className={({ isActive }) => `flex items-center gap-2 py-3 px-2 border border-transparent hover:border-primary rounded hover:bg-bg-primary transition-colors cursor-pointer ${isActive ? 'bg-bg-primary border-primary' : ''}`}
              >
                <div className='relative'>
                  {contact.profile_pic ? (
                    <img src={contact.profile_pic} className='w-10 h-10 rounded-full object-cover' alt='profile' />
                  ) : (
                    <PiUserCircle size={40} />
                  )}
                  {isOnline && (
                    <div className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-theme'></div>
                  )}
                </div>
                <div className='flex-1'>
                  <h3 className='text-ellipsis line-clamp-1 font-semibold text-base text-text-primary'>{contact.name}</h3>
                  <div className='text-text-secondary text-xs flex items-center gap-1'>
                    <div className='text-sm text-text-secondary text-ellipsis line-clamp-1'>
                      {contact.lastMessage ? (
                        <span className='flex items-center gap-1'>
                          {contact.lastMessage.imageUrl && <span>📷</span>}
                          {contact.lastMessage.videoUrl && <span>🎥</span>}
                          <span className='text-ellipsis line-clamp-1'>
                            {contact.lastMessage.text || (contact.lastMessage.imageUrl ? 'Photo' : 'Video')}
                          </span>
                        </span>
                      ) : (
                        <span className='italic text-slate-400'>No messages yet</span>
                      )}
                    </div>
                  </div>
                </div>
                {Boolean(contact.unseenMsg) && (
                  <p className='text-xs w-6 h-6 flex justify-center items-center font-semibold bg-primary text-white rounded-full ml-auto'>
                    {contact.unseenMsg}
                  </p>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
      {/* Search User */}
      {openSearchUser && (
        <SearchUser onClose={() => setOpenSearchUser(false)} />
      )}

      {/* Friend Requests */}
      {openRequests && (
        <FriendRequests onClose={() => setOpenRequests(false)} requests={friendRequests} setRequests={setFriendRequests} />
      )}

      {/* Profile Page */}
      {openProfile && (
        <ProfilePage user={user} onClose={() => setOpenProfile(false)} />
      )}
    </div>
  );
};

export default Sidebar;
