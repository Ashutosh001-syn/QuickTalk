import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom';
import { FaAngleLeft, FaPlus, FaImage, FaVideo, FaTrash, FaBell, FaReply, FaCheck, FaEye, FaPhone, FaUserMinus } from 'react-icons/fa6';
import { IoClose } from 'react-icons/io5';
import { IoMdSend } from 'react-icons/io';
import { PiUserCircle } from 'react-icons/pi';
import axios from 'axios';
import toast from 'react-hot-toast';
import bg from '../assets/wallapaper.jpeg';
import { useCall } from '../context/CallContext';
import { playMessageSentSound } from '../helpers/messageSounds';

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const TypingIndicator = () => (
  <span className="inline-flex items-center gap-1 text-[#39ff14] drop-shadow-[0_0_6px_rgba(57,255,20,0.75)]" aria-label="Typing">
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

const TypingDots = () => (
  <span className="flex items-center gap-1.5 px-1 py-1" aria-label="User is typing">
    {[0, 1, 2].map((dot) => (
      <motion.span
        key={dot}
        className="h-2 w-2 rounded-full bg-[#39ff14] shadow-[0_0_8px_rgba(57,255,20,0.85)]"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: dot * 0.2, ease: "easeInOut" }}
      />
    ))}
  </span>
);

const MessagePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, socketConnection, onlineUsers } = useOutletContext();
  const { callUser } = useCall();
  const [message, setMessage] = useState('');
  const [openImageVideoUpload, setOpenImageVideoUpload] = useState(false);
  const [messages, setMessages] = useState([]);
  const [firstUnreadIndex, setFirstUnreadIndex] = useState(-1);
  const [replyingTo, setReplyingTo] = useState(null);
  const [userData, setUserData] = useState({ name: 'Loading...', profile_pic: '' });
  const [isTyping, setIsTyping] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const [openProfile, setOpenProfile] = useState(false);
  const [unfollowing, setUnfollowing] = useState(false);

  const handleRequestNotification = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'denied') {
        toast.error("Please enable notifications in your browser settings.");
        return;
      }
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
      if (permission === 'granted') {
        toast.success("Desktop notifications enabled!");
      }
    }
  };
  
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const URL = `${process.env.REACT_APP_BACKEND_URL}/api/messages/${userId}`;
      const response = await axios.get(URL, { withCredentials: true });
      if (response.data.success) {
        setMessages(response.data.data);
        const unreadIdx = response.data.data.findIndex(msg => msg.seen === false && msg.msgByUserId !== user?._id);
        setFirstUnreadIndex(unreadIdx);
      }
    } catch (error) {
      console.error('Error fetching messages', error);
    }
  };

  const fetchTargetUser = async () => {
    try {
      const URL = `${process.env.REACT_APP_BACKEND_URL}/api/users`;
      const response = await axios.get(URL, { withCredentials: true });
      if (response.data.success) {
        const found = response.data.data.find(u => u._id === userId);
        if (found) {
          setUserData({ name: found.name, profile_pic: found.profile_pic });
        }
      }
    } catch (error) {
      console.error('Error fetching user data', error);
    }
  };

  useEffect(() => {
    fetchTargetUser();
    fetchMessages();
  }, [userId]);

  useEffect(() => {
    if (socketConnection) {
      const handleNewMessage = (newMsg) => {
        // Only append to the chat window if this message is part of the CURRENT conversation
        if (newMsg.sender === userId || newMsg.receiver === userId) {
          setMessages((prev) => [...prev, newMsg]);
        }
      };
      socketConnection.on('new_message', handleNewMessage);

      const handleMessageDeleted = (payload) => {
        setMessages((prev) => prev.map(msg => 
          msg._id === payload.messageId 
            ? { ...msg, deleted: true, text: '', imageUrl: '', videoUrl: '' }
            : msg
        ));
      };

      const handleMessagesSeen = (payload) => {
        if (payload.seenBy === userId) {
          setMessages((prev) => prev.map(msg => 
            msg.msgByUserId === user._id ? { ...msg, seen: true } : msg
          ));
        }
      };
      const handleTypingStatus = ({ senderId, isTyping: typing }) => {
        if (String(senderId) === String(userId)) setIsTyping(Boolean(typing));
      };
      
      socketConnection.on('message_deleted', handleMessageDeleted);
      socketConnection.on('messages_seen', handleMessagesSeen);
      socketConnection.on('typing_status', handleTypingStatus);
      const handleFriendRemoved = ({ userId: removedUserId }) => {
        if (String(removedUserId) === String(userId)) {
          toast('This friend connection was removed.');
          navigate('/');
        }
      };
      socketConnection.on('friend_removed', handleFriendRemoved);

      // Emit mark_as_seen as soon as we connect/open the chat
      socketConnection.emit('mark_as_seen', { senderId: userId });

      return () => {
        socketConnection.off('new_message', handleNewMessage);
        socketConnection.off('message_deleted', handleMessageDeleted);
        socketConnection.off('messages_seen', handleMessagesSeen);
        socketConnection.off('typing_status', handleTypingStatus);
        socketConnection.off('friend_removed', handleFriendRemoved);
      };
    }
  }, [socketConnection, userId, navigate]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    // Mark incoming messages as seen instantly if the chat is open
    if (socketConnection && messages.length > 0) {
      const hasUnseen = messages.some(msg => msg.seen === false && msg.msgByUserId === userId);
      if (hasUnseen) {
        socketConnection.emit('mark_as_seen', { senderId: userId });
        setMessages(prev => prev.map(msg => 
          msg.msgByUserId === userId ? { ...msg, seen: true } : msg
        ));
      }
    }
  }, [messages, socketConnection, userId]);

  const handleUploadImageVideoOpen = () => {
    setOpenImageVideoUpload(!openImageVideoUpload);
  };

  const handleOnChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    if (!socketConnection?.connected) return;

    socketConnection.emit('typing_status', { receiverId: userId, isTyping: Boolean(value.trim()) });
    clearTimeout(typingTimeoutRef.current);
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        socketConnection.emit('typing_status', { receiverId: userId, isTyping: false });
      }, 1500);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (message.trim() && socketConnection) {
      const payload = {
        receiver: userId,
        text: message
      };
      if (replyingTo) {
        payload.replyTo = {
          _id: replyingTo._id,
          text: replyingTo.text,
          imageUrl: replyingTo.imageUrl,
          videoUrl: replyingTo.videoUrl,
          msgByUserId: replyingTo.msgByUserId
        };
      }
      socketConnection.emit('send_message', payload);
      playMessageSentSound();
      socketConnection.emit('typing_status', { receiverId: userId, isTyping: false });
      clearTimeout(typingTimeoutRef.current);
      setMessage('');
      setReplyingTo(null);
    }
  };

  const handleDeleteChat = async () => {
    if (window.confirm("Are you sure you want to delete this entire chat? This action cannot be undone.")) {
      try {
        const URL = `${process.env.REACT_APP_BACKEND_URL}/api/delete-chat/${userId}`;
        const response = await axios.delete(URL, { withCredentials: true });
        if (response.data.success) {
          setMessages([]);
          toast.success("Chat deleted successfully");
        }
      } catch (error) {
        toast.error("Failed to delete chat");
      }
    }
  };

  const handleUnfollow = async () => {
    if (!window.confirm(`Unfollow ${userData.name}? You can send a new friend request later.`)) return;

    setUnfollowing(true);
    try {
      const response = await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/friends/${userId}`, {
        withCredentials: true
      });
      if (response.data.success) {
        toast.success(response.data.message);
        setOpenProfile(false);
        navigate('/');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to unfollow this user');
    } finally {
      setUnfollowing(false);
    }
  };

  const isOnline = onlineUsers?.includes(userId);

  return (
    <div className='bg-no-repeat bg-cover flex flex-col h-[100dvh]'>
      <header className='glass-panel sticky top-0 h-16 flex justify-between items-center px-4 z-10 border-b-0'>
        <div className='flex items-center gap-4'>
          <Link to='/' className='lg:hidden'>
            <FaAngleLeft size={25} />
          </Link>
          <button onClick={() => setOpenProfile(true)} className='flex items-center gap-4 text-left rounded-lg hover:bg-white/5 transition-colors -ml-2 px-2 py-1' title={`View ${userData.name}'s profile`}>
            {userData.profile_pic ? (
                <img src={userData.profile_pic} className='w-10 h-10 rounded-full object-cover' alt='profile' />
            ) : (
                <PiUserCircle size={45} />
            )}
          <div>
            <h3 className='font-semibold text-lg my-0 text-ellipsis line-clamp-1'>{userData.name}</h3>
            <p className='-my-1 text-sm'>
              {isTyping ? <TypingIndicator /> : isOnline ? <span className='text-primary'>online</span> : <span className='text-slate-400'>offline</span>}
            </p>
          </div>
          </button>
        </div>
        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-4'>
            {/* Call Buttons */}
            <button 
              onClick={() => callUser(userId, userData.name, userData.profile_pic, true)}
              title="Video Call"
              className='p-2 text-primary hover:text-primary-dark hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all'
            >
              <FaVideo size={20} />
            </button>
            <button 
              onClick={() => callUser(userId, userData.name, userData.profile_pic, false)}
              title="Audio Call"
              className='p-2 text-primary hover:text-primary-dark hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all'
            >
              <FaPhone size={20} />
            </button>
            

            {notificationStatus === 'default' && (
              <button 
                onClick={handleRequestNotification} 
                title="Enable Notifications"
                className='p-2 text-yellow-500 hover:text-yellow-600 hover:bg-slate-100 rounded-full transition-all'
              >
                <FaBell size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Show all messages */}
      <section className='flex-1 overflow-x-hidden overflow-y-auto scrollbar relative p-4 transition-all'>
        <div className='flex flex-col gap-2 py-2 mx-2'>
          <AnimatePresence>
          {messages.map((msg, index) => {
            const isMe = msg.msgByUserId === user?._id;
            return (
              <React.Fragment key={index}>
                {firstUnreadIndex === index && (
                  <div className="flex justify-center my-4 relative w-full">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                    <span className="glass-panel px-4 py-1 text-[10px] rounded-full font-bold text-accent z-10 shadow-lg">{messages.length - firstUnreadIndex} UNREAD MESSAGES</span>
                  </div>
                )}
                
                {msg.isCall ? (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex justify-center w-full my-2">
                    <div className="glass-panel text-white px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg border border-white/10">
                      {msg.callType === 'video' ? <FaVideo size={14} className="text-accent" /> : <FaPhone size={14} className="text-accent" />}
                      <span>{msg.callType === 'video' ? 'Video Call' : 'Audio Call'}</span>
                      <span className="text-gray-400">
                        {msg.callDuration > 0 ? `• ${Math.floor(msg.callDuration / 60)}m ${msg.callDuration % 60}s` : '• Missed'}
                      </span>
                      <span className="text-gray-500 text-[10px] ml-1">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative mb-1 w-full`}>
                    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} relative w-fit max-w-full`}>
                  {/* Message Bubble */}
                  <div
                    className={`p-3 py-2 rounded-2xl w-fit max-w-[280px] md:max-w-sm lg:max-w-md ${
                      isMe ? 'bg-bg-bubble-me text-white shadow-[0_4px_15px_rgba(0,198,255,0.25)] rounded-tr-sm' : 'glass-panel text-white shadow-[0_4px_15px_rgba(0,0,0,0.3)] rounded-tl-sm'
                    } transition-all relative`}
                  >
                    {/* Reply quote inside the bubble — like Teams */}
                    {msg.replyTo && msg.replyTo.msgByUserId && (
                      <div className='bg-black/5 border-l-[3px] border-primary rounded px-2 py-1 mb-1 cursor-pointer'>
                        <p className='text-[11px] font-semibold text-primary'>{msg.replyTo.msgByUserId === user?._id ? 'You' : userData.name}</p>
                        <p className='text-xs text-text-secondary truncate'>{msg.replyTo.text || (msg.replyTo.imageUrl ? '📷 Photo' : '🎥 Video')}</p>
                      </div>
                    )}
                    {msg.deleted ? (
                      <p className='px-2 italic text-text-muted'>🚫 This message was deleted</p>
                    ) : (
                      <>
                        {msg.imageUrl && (
                          <img src={msg.imageUrl} alt='img' className='w-full rounded mb-1 object-cover' />
                        )}
                        {msg.videoUrl && (
                          <video src={msg.videoUrl} className='w-full rounded mb-1 object-cover' controls />
                        )}
                        {msg.text && (
                          <p className={`whitespace-pre-wrap text-sm ${isMe ? 'pr-5 pb-[2px]' : ''}`}>{msg.text}</p>
                        )}
                        
                        {/* Always show tick inside for my messages */}
                        {isMe && (
                          <div className="absolute bottom-1 right-1.5 flex items-center">
                            {msg.seen ? (
                              <FaEye size={11} className="text-[#34B7F1]" title="Seen" />
                            ) : (
                              <FaCheck size={10} className="text-slate-400" title="Delivered" />
                            )}
                          </div>
                        )}
                      </>
                    )}
                    </div>
                    {/* Time displayed strictly OUTSIDE the bubble on hover */}
                    <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                      <p className='text-[10px] text-gray-400 whitespace-nowrap glass-panel px-2 py-1 rounded shadow-lg border border-white/5'>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                    </div>
                    {/* Hover action buttons: Reply + Delete (only own) */}
                    {!msg.deleted && !msg.isCall && (
                      <div className={`hidden group-hover:flex absolute -top-3 ${isMe ? 'right-2' : 'left-2'} bg-white rounded-lg shadow-md z-10 overflow-hidden border border-slate-200`}>
                        <button
                          className='p-1.5 px-2 text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors'
                          onClick={() => setReplyingTo(msg)}
                          title='Reply'
                        >
                          <FaReply size={13} />
                        </button>
                        {isMe && (
                          <button
                            className='p-1.5 px-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors'
                            onClick={() => {
                              if (window.confirm('Delete this message for everyone?')) {
                                socketConnection.emit('delete_message', { messageId: msg._id, receiverId: userId });
                              }
                            }}
                            title='Delete'
                          >
                            <FaTrash size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}
          </AnimatePresence>
          {isTyping && (
            <div className="flex items-start">
              <div className="glass-panel rounded-2xl rounded-tl-sm px-3 py-2 shadow-[0_4px_15px_rgba(0,0,0,0.25)]">
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </section>

      {/* Send message */}
      <section className='glass-panel px-4 py-3 border-t-0 flex flex-col gap-2'>
        {/* Reply preview bar */}
        {replyingTo && (
          <div className='flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border-l-4 border-accent rounded-t'>
            <FaReply size={14} className='text-accent' />
            <div className='flex-1 min-w-0'>
              <p className='text-xs font-semibold text-accent'>{replyingTo.msgByUserId === user?._id ? 'You' : userData.name}</p>
              <p className='text-xs text-gray-300 truncate'>{replyingTo.text || (replyingTo.imageUrl ? '📷 Photo' : '🎥 Video')}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className='text-gray-400 hover:text-white transition-colors'>
              <IoClose size={18} />
            </button>
          </div>
        )}

        <div className='flex items-center w-full gap-3'>
          <div className='relative'>
            <button
              onClick={handleUploadImageVideoOpen}
              className='flex justify-center items-center w-12 h-12 rounded-full hover:bg-white/10 text-gray-300 hover:text-white hover:scale-105 transition-all'
            >
              <FaPlus size={22} />
            </button>

            {/* Video and Image upload modal */}
            {openImageVideoUpload && (
              <div className='bg-black/90 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] rounded-xl absolute bottom-14 left-0 w-36 p-2 z-20'>
                <form>
                  <label
                    htmlFor='uploadImage'
                    className='flex items-center p-2 px-3 gap-3 hover:bg-white/10 cursor-pointer rounded-lg transition-colors text-gray-200 hover:text-white'
                  >
                    <div className='text-[#00c6ff]'>
                      <FaImage size={18} />
                    </div>
                    <p>Image</p>
                  </label>
                  <label
                    htmlFor='uploadVideo'
                    className='flex items-center p-2 px-3 gap-3 hover:bg-white/10 cursor-pointer rounded-lg transition-colors text-gray-200 hover:text-white'
                  >
                    <div className='text-purple-400'>
                      <FaVideo size={18} />
                    </div>
                    <p>Video</p>
                  </label>

                  <input type='file' id='uploadImage' className='hidden' />
                  <input type='file' id='uploadVideo' className='hidden' />
                </form>
              </div>
            )}
          </div>

          {/* Input box */}
          <form className='flex items-center w-full gap-2' onSubmit={handleSendMessage}>
            <input
              type='text'
              placeholder='Type a message...'
              className='w-full h-12 px-6 py-2 outline-none border border-white/10 bg-white/5 backdrop-blur-md rounded-full text-white placeholder-gray-400 focus:border-accent focus:shadow-[0_0_15px_rgba(0,242,254,0.2)] transition-all'
              value={message}
              onChange={handleOnChange}
            />
            <button
              type='submit'
              className='flex justify-center items-center w-12 h-12 rounded-full bg-bg-bubble-me hover:scale-105 shadow-[0_0_15px_rgba(0,198,255,0.4)] text-white transition-all ml-1'
            >  <IoMdSend size={24} className="ml-1" />
            </button>
          </form>
        </div>
      </section>
      {openProfile && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'>
          <div className='glass-panel w-full max-w-sm rounded-3xl overflow-hidden border border-white/10 shadow-2xl'>
            <div className='p-6 text-center border-b border-white/10'>
              {userData.profile_pic ? <img src={userData.profile_pic} alt={userData.name} className='w-24 h-24 mx-auto rounded-full object-cover' /> : <PiUserCircle size={96} className='mx-auto text-gray-400' />}
              <h2 className='mt-3 text-xl font-semibold'>{userData.name}</h2>
              <p className='text-sm text-gray-400'>{isOnline ? 'Online' : 'Offline'}</p>
            </div>
            <div className='p-4 flex gap-3'>
              <button onClick={() => setOpenProfile(false)} className='flex-1 rounded-xl py-3 bg-white/10 hover:bg-white/20 transition-colors'>Close</button>
              <button onClick={handleUnfollow} disabled={unfollowing} className='flex-1 inline-flex justify-center items-center gap-2 rounded-xl py-3 bg-red-500/90 hover:bg-red-500 text-white transition-colors disabled:opacity-50'>
                <FaUserMinus /> {unfollowing ? 'Unfollowing...' : 'Unfollow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagePage;
