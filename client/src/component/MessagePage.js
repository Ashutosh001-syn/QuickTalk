import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { FaAngleLeft, FaPlus, FaImage, FaVideo, FaTrash, FaBell, FaReply } from 'react-icons/fa6';
import { IoClose } from 'react-icons/io5';
import { IoMdSend } from 'react-icons/io';
import { PiUserCircle } from 'react-icons/pi';
import axios from 'axios';
import toast from 'react-hot-toast';

const MessagePage = () => {
  const { userId } = useParams();
  const { user, socketConnection, onlineUsers } = useOutletContext();
  const [message, setMessage] = useState('');
  const [openImageVideoUpload, setOpenImageVideoUpload] = useState(false);
  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [userData, setUserData] = useState({ name: 'Loading...', profile_pic: '' });
  const [notificationStatus, setNotificationStatus] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  );

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

  const fetchMessages = async () => {
    try {
      const URL = `${process.env.REACT_APP_BACKEND_URL}/api/messages/${userId}`;
      const response = await axios.get(URL, { withCredentials: true });
      if (response.data.success) {
        setMessages(response.data.data);
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
      
      socketConnection.on('message_deleted', handleMessageDeleted);

      return () => {
        socketConnection.off('new_message', handleNewMessage);
        socketConnection.off('message_deleted', handleMessageDeleted);
      };
    }
  }, [socketConnection, userId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleUploadImageVideoOpen = () => {
    setOpenImageVideoUpload(!openImageVideoUpload);
  };

  const handleOnChange = (e) => {
    setMessage(e.target.value);
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

  const isOnline = onlineUsers?.includes(userId);

  return (
    <div className='bg-no-repeat bg-cover flex flex-col h-screen'>
      <header className='sticky top-0 h-16 bg-white flex justify-between items-center px-4 shadow-sm z-10'>
        <div className='flex items-center gap-4'>
          <Link to='/' className='lg:hidden'>
            <FaAngleLeft size={25} />
          </Link>
          <div>
            {userData.profile_pic ? (
                <img src={userData.profile_pic} className='w-10 h-10 rounded-full object-cover' alt='profile' />
            ) : (
                <PiUserCircle size={45} />
            )}
          </div>
          <div>
            <h3 className='font-semibold text-lg my-0 text-ellipsis line-clamp-1'>{userData.name}</h3>
            <p className='-my-1 text-sm'>
              {isOnline ? <span className='text-primary'>online</span> : <span className='text-slate-400'>offline</span>}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
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
      </header>

      {/* Show all messages */}
      <section className='flex-1 overflow-x-hidden overflow-y-auto scrollbar relative bg-slate-100 p-4'>
        <div className='flex flex-col gap-2 py-2 mx-2'>
          {messages.map((msg, index) => {
            const isMe = msg.msgByUserId === user?._id;
            return (
              <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}>
                <div
                  className={`p-2 py-1 rounded-lg w-fit max-w-[280px] md:max-w-sm lg:max-w-md ${
                    isMe ? 'bg-teal-100' : 'bg-white'
                  }`}
                >
                  {/* Reply quote inside the bubble — like Teams */}
                  {msg.replyTo && msg.replyTo.msgByUserId && (
                    <div className='bg-black/5 border-l-[3px] border-primary rounded px-2 py-1 mb-1 cursor-pointer'>
                      <p className='text-[11px] font-semibold text-primary'>{msg.replyTo.msgByUserId === user?._id ? 'You' : userData.name}</p>
                      <p className='text-xs text-slate-500 truncate'>{msg.replyTo.text || (msg.replyTo.imageUrl ? '📷 Photo' : '🎥 Video')}</p>
                    </div>
                  )}
                  {msg.deleted ? (
                    <p className='px-2 italic text-slate-500'>🚫 This message was deleted</p>
                  ) : (
                    <>
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt='img' className='w-full rounded mb-1 object-cover' />
                      )}
                      {msg.videoUrl && (
                        <video src={msg.videoUrl} className='w-full rounded mb-1 object-cover' controls />
                      )}
                      {msg.text && <p className='px-2'>{msg.text}</p>}
                    </>
                  )}
                </div>
                {/* Hover action buttons: Reply + Delete (only own) */}
                {!msg.deleted && (
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
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </section>

      {/* Send message */}
      <section className='h-16 bg-white flex items-center px-4 shadow-t-sm'>
        <div className='relative'>
          <button
            onClick={handleUploadImageVideoOpen}
            className='flex justify-center items-center w-11 h-11 rounded-full hover:bg-primary hover:text-white transition-all'
          >
            <FaPlus size={20} />
          </button>

          {/* Video and Image upload modal */}
          {openImageVideoUpload && (
            <div className='bg-white shadow rounded absolute bottom-14 w-36 p-2'>
              <form>
                <label
                  htmlFor='uploadImage'
                  className='flex items-center p-2 px-3 gap-3 hover:bg-slate-200 cursor-pointer rounded'
                >
                  <div className='text-primary'>
                    <FaImage size={18} />
                  </div>
                  <p>Image</p>
                </label>
                <label
                  htmlFor='uploadVideo'
                  className='flex items-center p-2 px-3 gap-3 hover:bg-slate-200 cursor-pointer rounded'
                >
                  <div className='text-purple-500'>
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

        {/* Reply preview bar */}
        {replyingTo && (
          <div className='flex items-center gap-2 px-4 py-2 bg-slate-200 border-l-4 border-primary rounded-t'>
            <FaReply size={14} className='text-primary' />
            <div className='flex-1 min-w-0'>
              <p className='text-xs font-semibold text-primary'>{replyingTo.msgByUserId === user?._id ? 'You' : userData.name}</p>
              <p className='text-xs text-slate-600 truncate'>{replyingTo.text || (replyingTo.imageUrl ? '📷 Photo' : '🎥 Video')}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className='text-slate-400 hover:text-slate-600'>
              <IoClose size={18} />
            </button>
          </div>
        )}
        <form className='h-full w-full flex gap-2 items-center' onSubmit={handleSendMessage}>
          <input
            type='text'
            placeholder='Type here message...'
            className='py-1 px-4 outline-none w-full h-full'
            value={message}
            onChange={handleOnChange}
          />
          <button className='text-primary hover:text-secondary'>
            <IoMdSend size={28} />
          </button>
        </form>
      </section>
    </div>
  );
};

export default MessagePage;