import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { IoClose, IoSearchOutline } from "react-icons/io5";
import { PiUserCircle } from "react-icons/pi";
import toast from 'react-hot-toast';

const SearchUser = ({ onClose }) => {
    const [searchUser, setSearchUser] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    const handleSearchUser = async () => {
        try {
            setLoading(true);
            const URL = `${process.env.REACT_APP_BACKEND_URL}/api/search-users?query=${search}`;
            const response = await axios.get(URL, { withCredentials: true });
            
            if (response.data.success) {
                setSearchUser(response.data.data);
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || "Search failed");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (search) {
                handleSearchUser();
            } else {
                setSearchUser([]);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    const sendRequest = async (userId) => {
        try {
            const URL = `${process.env.REACT_APP_BACKEND_URL}/api/friend-request`;
            const response = await axios.post(URL, { toUserId: userId }, { withCredentials: true });
            if (response.data.success) {
                toast.success(response.data.message);
                // Update local state
                setSearchUser(prev => prev.map(u => {
                    if (u._id === userId) {
                        return { ...u, requestStatus: 'pending', requestDirection: 'sent' };
                    }
                    return u;
                }));
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to send request");
        }
    };

    return ReactDOM.createPortal(
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className='fixed top-0 bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm sm:p-2 z-50 flex justify-center items-center'
            >
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0.9, opacity: 0 }} 
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className='glass-panel w-full h-full sm:h-auto sm:max-w-lg mx-auto sm:rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] sm:border border-white/10 relative overflow-hidden flex flex-col'
                >
                    {/* Header */}
                    <div className='p-4 border-b border-white/10 flex justify-between items-center glass-panel sticky top-0 z-10'>
                        <h2 className='text-xl font-semibold text-white'>Add Friend</h2>
                        <button onClick={onClose} className='p-2 hover:bg-white/10 rounded-full transition-all'>
                            <IoClose size={24} className="text-gray-300" />
                        </button>
                    </div>
                    
                    {/* Search Input */}
                    <div className='p-4 border-b border-white/10'>
                        <div className='h-12 w-full flex items-center bg-white/5 backdrop-blur-md rounded-full border border-white/10 focus-within:border-accent focus-within:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all'>
                            <div className='px-4 text-gray-400'>
                                <IoSearchOutline size={22} />
                            </div>
                            <input 
                                type='text'
                                placeholder='Search users by name or email...'
                                className='w-full outline-none h-full bg-transparent text-white placeholder-gray-400 pr-4'
                                onChange={(e) => setSearch(e.target.value)}
                                value={search}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Results List */}
                    <div className='flex-1 w-full sm:h-[60vh] sm:max-h-[400px] overflow-y-auto p-4 scrollbar pb-20 sm:pb-4'>
                        {searchUser.length === 0 && !loading && search && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='h-full flex flex-col items-center justify-center text-slate-400 gap-2'>
                                <IoSearchOutline size={40} className='opacity-50' />
                                <p className='text-lg'>No users found</p>
                            </motion.div>
                        )}
                        
                        {searchUser.length === 0 && !loading && !search && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='h-full flex flex-col items-center justify-center text-slate-400 text-center px-8'>
                                <p>Type a name or email to find friends to chat with!</p>
                            </motion.div>
                        )}

                        {loading && (
                            <div className='flex justify-center items-center py-10'>
                                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
                            </div>
                        )}

                        {!loading && searchUser.length !== 0 && (
                            <motion.div 
                                initial="hidden" 
                                animate="visible" 
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: {
                                        opacity: 1,
                                        transition: { staggerChildren: 0.05 }
                                    }
                                }}
                                className='flex flex-col gap-3'
                            >
                                {searchUser.map((user, index) => (
                                    <motion.div 
                                        variants={{
                                            hidden: { y: 20, opacity: 0 },
                                            visible: { y: 0, opacity: 1 }
                                        }}
                                        key={user._id} 
                                        className='flex items-center justify-between p-3 border border-white/5 rounded-2xl glass-panel hover:bg-white/10 transition-all shadow-sm hover:scale-[1.02]'
                                    >
                                        <div className='flex items-center gap-3 min-w-0'>
                                            <div>
                                                {user?.profile_pic ? (
                                                    <img src={user?.profile_pic} className='w-12 h-12 object-cover rounded-full shadow-sm' alt={user?.name} />
                                                ) : (
                                                    <PiUserCircle size={48} className='text-gray-400' />
                                                )}
                                            </div>
                                            <div className='min-w-0'>
                                                <div className='font-semibold text-white text-ellipsis line-clamp-1'>
                                                    {user?.name}
                                                </div>
                                                <p className='text-sm text-gray-400 text-ellipsis line-clamp-1'>{user?.email}</p>
                                            </div>
                                        </div>
                                        <div className='pl-2 shrink-0'>
                                            {user.requestStatus === 'accepted' ? (
                                                <span className='px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold'>Friends</span>
                                            ) : user.requestStatus === 'pending' ? (
                                                <span className='px-3 py-1 bg-white/10 text-gray-300 rounded-full text-xs font-semibold'>
                                                    {user.requestDirection === 'sent' ? 'Requested' : 'Incoming'}
                                                </span>
                                            ) : (
                                                <motion.button 
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => sendRequest(user._id)}
                                                    className='px-4 py-1.5 bg-bg-bubble-me text-white text-sm rounded-full font-medium shadow-[0_0_15px_rgba(0,198,255,0.4)]'
                                                >
                                                    Add Friend
                                                </motion.button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default SearchUser;
