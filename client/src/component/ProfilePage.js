import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoCamera } from 'react-icons/io5';
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { PiUserCircle } from 'react-icons/pi';
import axios from 'axios';
import toast from 'react-hot-toast';

const ProfilePage = ({ user, onClose, onUserUpdate }) => {
  const [name, setName] = useState(user?.name || '');
  const [profilePic, setProfilePic] = useState(user?.profile_pic || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('chat-theme') || 'light');

  // Handle Theme Change
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('chat-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };


  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'chat-app');

    try {
      const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setProfilePic(data.secure_url);
      toast.success('Photo uploaded!');
    } catch (err) {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const URL = `${process.env.REACT_APP_BACKEND_URL}/api/update-user`;
      const response = await axios.post(URL, {
        name,
        profile_pic: profilePic
      }, { withCredentials: true });

      if (response.data.success) {
        toast.success('Profile updated!');
        if (onUserUpdate) onUserUpdate(response.data.data);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      return toast.error('Please fill all password fields');
    }
    if (newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setLoading(true);
    try {
      const URL = `${process.env.REACT_APP_BACKEND_URL}/api/change-password`;
      const response = await axios.post(URL, {
        currentPassword,
        newPassword
      }, { withCredentials: true });

      if (response.data.success) {
        toast.success('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center sm:p-4'
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20, opacity: 0 }} 
          animate={{ scale: 1, y: 0, opacity: 1 }} 
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className='glass-panel w-full h-full sm:h-auto sm:max-w-md sm:rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] sm:border border-white/10 overflow-hidden sm:max-h-[90vh] overflow-y-auto flex flex-col'
        >
        {/* Header */}
        <div className='bg-gradient-to-r from-[#00c6ff] to-[#0072ff] p-6 text-white'>
          <div className='flex items-center gap-3 mb-4'>
            <button onClick={onClose} className='hover:bg-white/20 rounded-full p-2 transition-colors'>
              <IoArrowBack size={22} />
            </button>
            <h2 className='text-xl font-bold'>Profile Settings</h2>
          </div>

          {/* Profile Photo */}
          <div className='flex flex-col items-center'>
            <div className='relative'>
              {profilePic ? (
                <img src={profilePic} alt='Profile' className='w-24 h-24 rounded-full object-cover border-4 border-white/30' />
              ) : (
                <PiUserCircle size={96} className='text-white/70' />
              )}
              <label className='absolute bottom-0 right-0 bg-white text-teal-600 rounded-full p-2 cursor-pointer shadow-lg hover:bg-teal-50 transition-colors'>
                <IoCamera size={18} />
                <input type='file' accept='image/*' className='hidden' onChange={handlePhotoUpload} />
              </label>
            </div>
            {uploadingPhoto && <p className='text-sm mt-2 text-white/80'>Uploading...</p>}
            <p className='mt-2 text-white/90 text-sm'>{user?.email}</p>
          </div>
        </div>

        {/* Profile Form */}
        <div className='p-6 space-y-6 flex-1 overflow-y-auto pb-20'>
          {/* Update Name Section */}
          <form onSubmit={handleUpdateProfile}>
            <h3 className='text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3'>Profile Info</h3>
            <div className='space-y-3'>
              <div className='relative'>
                <FaUser className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={14} />
                <input
                  type='text'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='Your name'
                  className='w-full pl-10 pr-4 py-3 border border-white/10 bg-white/5 backdrop-blur-md rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all text-sm'
                />
              </div>
              <div className='relative'>
                <FaEnvelope className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={14} />
                <input
                  type='email'
                  value={user?.email || ''}
                  disabled
                  className='w-full pl-10 pr-4 py-3 border border-white/5 rounded-xl bg-black/20 text-gray-400 text-sm cursor-not-allowed'
                />
              </div>
              <button
                type='submit'
                disabled={loading}
                className='w-full py-3 bg-bg-bubble-me hover:scale-[1.02] text-white font-semibold rounded-xl shadow-[0_0_15px_rgba(0,198,255,0.4)] transition-all disabled:opacity-50 text-sm'
              >
                {loading ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>

          <hr className='border-slate-100' />

          {/* Change Password Section */}
          <form onSubmit={handleChangePassword}>
            <h3 className='text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3'>Change Password</h3>
            <div className='space-y-3'>
              <div className='relative'>
                <FaLock className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={14} />
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder='Current password'
                  className='w-full pl-10 pr-10 py-3 border border-white/10 bg-white/5 backdrop-blur-md rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all text-sm'
                />
                <button type='button' onClick={() => setShowCurrentPw(!showCurrentPw)} className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600'>
                  {showCurrentPw ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              </div>
              <div className='relative'>
                <FaLock className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={14} />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder='New password (min 6 chars)'
                  className='w-full pl-10 pr-10 py-3 border border-white/10 bg-white/5 backdrop-blur-md rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all text-sm'
                />
                <button type='button' onClick={() => setShowNewPw(!showNewPw)} className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600'>
                  {showNewPw ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              </div>
              <div className='relative'>
                <FaLock className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={14} />
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder='Confirm new password'
                  className='w-full pl-10 pr-10 py-3 border border-white/10 bg-white/5 backdrop-blur-md rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all text-sm'
                />
                <button type='button' onClick={() => setShowConfirmPw(!showConfirmPw)} className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600'>
                  {showConfirmPw ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              </div>
              <button
                type='submit'
                disabled={loading}
                className='w-full py-3 glass-panel hover:bg-white/10 text-white font-semibold rounded-xl transition-all disabled:opacity-50 text-sm'
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>

          <hr className='border-slate-100' />

          {/* Theme Settings Section */}
          <div>
            <h3 className='text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3'>Theme Settings</h3>
            <div className='flex gap-3'>
              <button
                onClick={() => handleThemeChange('premium')}
                className={`flex-1 py-2 rounded-lg border ${theme === 'premium' ? 'border-accent bg-accent/20 text-accent' : 'border-white/10 text-gray-400 hover:bg-white/5'} transition-all`}
              >
                Premium
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex-1 py-2 rounded-lg border ${theme === 'dark' ? 'border-accent bg-accent/20 text-accent' : 'border-white/10 text-gray-400 hover:bg-white/5'} transition-all`}
              >
                Dark
              </button>
              <button
                onClick={() => handleThemeChange('ocean')}
                className={`flex-1 py-2 rounded-lg border ${theme === 'ocean' ? 'border-accent bg-accent/20 text-accent' : 'border-white/10 text-gray-400 hover:bg-white/5'} transition-all`}
              >
                Ocean
              </button>
            </div>
          </div>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default ProfilePage;
