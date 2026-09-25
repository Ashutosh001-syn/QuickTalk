import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IoChatbubbleEllipses } from 'react-icons/io5';
import { FaUserPlus, FaBell, FaPhoneAlt, FaArrowDown, FaArrowRight, FaVideo } from 'react-icons/fa';
import { BiLogOut } from 'react-icons/bi';
import { PiUserCircle } from 'react-icons/pi';
import axios from 'axios';
import toast from 'react-hot-toast';
import SearchUser from './SearchUser';
import FriendRequests from './FriendRequests';
import ProfilePage from './ProfilePage';
import { registerAndSubscribePush } from '../helpers/pushNotifications';
import { playMessageReceivedSound } from '../helpers/messageSounds';
import logo from '../assets/logo.png';

const TypingIndicator = () => (
  <span className="inline-flex items-center gap-1 font-medium text-[#39ff14] drop-shadow-[0_0_6px_rgba(57,255,20,0.75)]" aria-label="Typing">
    <span>typing</span>
    {[0, 1, 2].map((dot) => (
      <motion.span
        key={dot}
        className="h-1.5 w-1.5 rounded-full bg-[#39ff14]"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: dot * 0.2, ease: "easeInOut" }}
      />
    ))}
  </span>
);

const Sidebar = ({ user, onlineUsers, socketConnection }) => {
  const navigate = useNavigate();
  const [users, setUsers] = React.useState([]);
  const [openSearchUser, setOpenSearchUser] = React.useState(false);
  const [openRequests, setOpenRequests] = React.useState(false);
  const [friendRequests, setFriendRequests] = React.useState([]);
  const [openProfile, setOpenProfile] = React.useState(false);
  const [openLogout, setOpenLogout] = React.useState(false);
  const [activeTab, setActiveTab] = useState('messages');
  const [callLogs, setCallLogs] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});

  const fetchCallLogs = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/call-logs`, {
        withCredentials: true
      });
      if (response.data.success) {
        setCallLogs(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching call logs", error);
    }
  };

  useEffect(() => {
    if (activeTab === 'calls') {
      fetchCallLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    registerAndSubscribePush();
  }, []);

  React.useEffect(() => {
    if (!socketConnection) return undefined;
    const handleTypingStatus = ({ senderId, isTyping }) => {
      setTypingUsers((current) => ({ ...current, [String(senderId)]: Boolean(isTyping) }));
    };
    socketConnection.on('typing_status', handleTypingStatus);
    return () => socketConnection.off('typing_status', handleTypingStatus);
  }, [socketConnection]);

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
    if (socketConnection) {
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
                text: msg.isCall ? (msg.callType === 'video' ? '🎥 Video Call' : '📞 Audio Call') : msg.text,
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

        // Also refresh call logs if it was a call
        if (msg.isCall && activeTab === 'calls') {
          fetchCallLogs();
        }

        // Only show notification if message is from someone else
        if (msg.msgByUserId?.toString() !== user?._id?.toString()) {
          playMessageReceivedSound();
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
      socketConnection.on('friend_removed', ({ userId: removedUserId }) => {
        setUsers((previous) => previous.filter((contact) => String(contact._id) !== String(removedUserId)));
        toast('A friend connection was removed.');
      });
      
      return () => {
        socketConnection.off('new_message', handleNewMessage);
        socketConnection.off('friend_request');
        socketConnection.off('request_response');
        socketConnection.off('friend_removed');
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
    <div className='w-full h-full bg-transparent text-text-primary transition-colors flex flex-col sm:flex-row'>
      {/* Icon Menu (Bottom on mobile, Left on desktop) */}
      <div className='glass-panel w-full h-16 sm:w-16 sm:h-full flex flex-row sm:flex-col justify-evenly sm:justify-start py-2 sm:py-5 px-2 sm:px-0 items-center z-20 transition-all border-t sm:border-t-0 sm:border-r border-white/5 order-last sm:order-first sm:gap-5'>
        <NavLink
          to="/"
          className={({ isActive }) => `w-12 h-12 flex justify-center items-center cursor-pointer rounded-xl transition-all duration-300 ${isActive ? 'text-accent shadow-[0_0_15px_rgba(0,242,254,0.4)] bg-white/5' : 'text-gray-400 hover:text-white hover:scale-110 hover:shadow-[0_0_15px_rgba(0,242,254,0.2)]'}`}
          title='Chat'
        >
          <IoChatbubbleEllipses size={25} />
        </NavLink>
        <div title='Add Friend' onClick={() => setOpenSearchUser(true)} className='w-12 h-12 flex justify-center items-center cursor-pointer text-gray-400 hover:text-white rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-[0_0_15px_rgba(0,242,254,0.2)]' >
          <FaUserPlus size={25} />
        </div>
        <div title='Friend Requests' onClick={() => setOpenRequests(true)} className='relative w-12 h-12 flex justify-center items-center cursor-pointer text-gray-400 hover:text-white rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-[0_0_15px_rgba(0,242,254,0.2)]'>
          <FaBell size={25} />
          {friendRequests.length > 0 && (
            <span className='absolute top-2 right-2 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center'>
              {friendRequests.length}
            </span>
          )}
        </div>

        {/* Spacer for desktop to push the bottom items down */}
        <div className='hidden sm:block sm:flex-1'></div>

        <button className='w-12 h-12 flex justify-center items-center cursor-pointer text-gray-400 hover:text-white rounded-xl transition-all duration-300 hover:scale-110' title='Profile' onClick={() => setOpenProfile(true)}>
          {user?.profile_pic ? (
            <img src={user?.profile_pic} className='w-10 h-10 rounded-md object-cover' alt='profile' />
          ) : (
            <PiUserCircle size={35} />
          )}
        </button>
        <button
          className='w-12 h-12 flex justify-center items-center cursor-pointer text-gray-400 hover:text-red-400 rounded-xl transition-all duration-300 hover:scale-110'
          title='Logout'
          onClick={() => setOpenLogout(true)}
        >
          <BiLogOut size={25} />
        </button>
      </div>

      {/* Main Sidebar Area */}
      <div className='flex-1 w-full flex flex-col overflow-hidden'>
        
        
        {/* Tabs */}
        <div className='flex items-center px-4 mb-2 gap-4 border-b border-white/10'>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`pb-2 font-semibold transition-colors ${activeTab === 'messages' ? 'text-accent border-b-2 border-accent' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Messages
          </button>
          <button 
            onClick={() => setActiveTab('calls')}
            className={`pb-2 font-semibold transition-all ${activeTab === 'calls' ? 'text-accent border-b-2 border-accent' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Calls
          </button>
        </div>

        <div className='flex-1 overflow-x-hidden overflow-y-auto scrollbar'>
          {activeTab === 'messages' ? (
            <>
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
            const isTyping = typingUsers[String(contact._id)];
            return (
              <NavLink
                to={`/${contact._id}`}
                key={contact._id}
                className={({ isActive }) => `flex items-center gap-2 py-3 px-3 border border-transparent rounded-xl transition-all duration-300 cursor-pointer ${isActive ? 'bg-white/10 backdrop-blur-lg border-white/20 shadow-[0_4px_15px_rgba(0,0,0,0.2)]' : 'hover:bg-white/5 hover:backdrop-blur-sm'}`}
              >
                <div className='relative'>
                  {contact.profile_pic ? (
                    <img src={contact.profile_pic} className='w-12 h-12 rounded-md object-cover' alt='profile' />
                  ) : (
                    <PiUserCircle size={48} />
                  )}
                  {isOnline && (
                    <div className='absolute bottom-0 right-0 w-3.5 h-3.5 bg-accent rounded-full border-2 border-[#0a0a0f] shadow-[0_0_8px_var(--accent)]'></div>
                  )}
                </div>
                <div className='flex-1'>
                  <h3 className='text-ellipsis line-clamp-1 font-semibold text-base text-text-primary'>{contact.name}</h3>
                  <div className='text-text-secondary text-xs flex items-center gap-1'>
                    <div className='text-sm text-text-secondary text-ellipsis line-clamp-1'>
                      {isTyping ? (
                        <TypingIndicator />
                      ) : contact.lastMessage ? (
                        <span className='flex items-center gap-1'>
                          {contact.lastMessage.imageUrl && <span>📷</span>}
                          {contact.lastMessage.videoUrl && <span>🎥</span>}
                          <span className='text-ellipsis line-clamp-1'>
                            {contact.lastMessage.isCall 
                               ? (contact.lastMessage.callType === 'video' ? '🎥 Video Call' : '📞 Audio Call') 
                               : (contact.lastMessage.text || (contact.lastMessage.imageUrl ? 'Photo' : 'Video'))}
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
          </>
          ) : (
            <div className="flex flex-col">
              {callLogs.length === 0 ? (
                <div className='mt-12'>
                  <div className='flex justify-center items-center my-4 text-slate-500'>
                    <FaPhoneAlt size={40} />
                  </div>
                  <p className='text-lg text-center text-slate-400'>No recent calls.</p>
                </div>
              ) : (
                callLogs.map((log) => {
                  const isIncoming = log.caller !== user?._id?.toString();
                  const missed = log.callDuration === 0;
                  return (
                    <div key={log._id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 hover:backdrop-blur-sm transition-all duration-300 cursor-pointer border-b border-white/5">
                      <img src={log.otherUser?.profile_pic || 'https://via.placeholder.com/150'} alt="pic" className="w-12 h-12 rounded-full object-cover" />
                      <div className="flex-1">
                        <h3 className={`font-semibold text-base ${missed ? 'text-red-500' : 'text-text-primary'}`}>{log.otherUser?.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-text-secondary mt-0.5">
                          {isIncoming ? (
                            <FaArrowDown className={missed ? "text-red-500" : "text-green-500"} size={10} />
                          ) : (
                            <FaArrowRight className="text-green-500" size={10} />
                          )}
                          <span>
                            {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div className="text-primary opacity-80">
                        {log.callType === 'video' ? <FaVideo size={18} /> : <FaPhoneAlt size={18} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
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

      {/* Logout Confirmation */}
      <AnimatePresence>
        {openLogout && (
          <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4'>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className='glass-panel p-6 rounded-3xl max-w-sm w-full shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col gap-4 mx-auto'
            >
              <h3 className='text-xl font-bold text-white'>Log Out</h3>
              <p className='text-gray-300'>Are you sure you want to log out?</p>
              <div className='flex gap-3 justify-end mt-2'>
                <button onClick={() => setOpenLogout(false)} className='px-4 py-2 rounded-xl text-gray-300 hover:bg-white/10 transition-colors font-medium'>Cancel</button>
                <button onClick={() => { setOpenLogout(false); handleLogout(); }} className='px-4 py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)]'>Log Out</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sidebar;
