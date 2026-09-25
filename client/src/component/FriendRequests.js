import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { IoClose } from "react-icons/io5";
import { PiUserCircle } from "react-icons/pi";
import toast from 'react-hot-toast';

const FriendRequests = ({ onClose, requests, setRequests }) => {
    const [loading, setLoading] = useState(false);

    const respondToRequest = async (requestId, action) => {
        try {
            setLoading(true);
            const URL = `${process.env.REACT_APP_BACKEND_URL}/api/friend-request/respond`;
            const response = await axios.post(URL, { requestId, action }, { withCredentials: true });
            
            if (response.data.success) {
                toast.success(response.data.message);
                // Remove from local state
                setRequests(prev => prev.filter(req => req._id !== requestId));
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || `Failed to ${action} request`);
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
                className='fixed top-0 bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm sm:p-2 z-50 flex justify-center items-center'
            >
                <motion.div 
                    initial={{ scale: 0.9, y: -20, opacity: 0 }} 
                    animate={{ scale: 1, y: 0, opacity: 1 }} 
                    exit={{ scale: 0.9, y: -20, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className='glass-panel w-full h-full sm:h-auto sm:max-w-lg mx-auto sm:rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] sm:border border-white/10 relative overflow-hidden flex flex-col'
                >
                    {/* Header */}
                    <div className='p-4 border-b border-white/10 flex justify-between items-center glass-panel sticky top-0 z-10'>
                        <h2 className='text-xl font-semibold text-white'>Friend Requests</h2>
                        <button onClick={onClose} className='p-2 hover:bg-white/10 rounded-full transition-all'>
                            <IoClose size={24} className="text-gray-300" />
                        </button>
                    </div>

                    {/* Results List */}
                    <div className='flex-1 w-full sm:h-[60vh] sm:max-h-[500px] overflow-y-auto p-4 scrollbar pb-20 sm:pb-4'>
                        {requests.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='h-full flex flex-col items-center justify-center text-gray-400 gap-2'>
                                <p className='text-lg'>No pending requests</p>
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: {
                                        opacity: 1,
                                        transition: { staggerChildren: 0.1 }
                                    }
                                }}
                                className='flex flex-col gap-3'
                            >
                                {requests.map((req) => (
                                    <motion.div 
                                        variants={{
                                            hidden: { x: -20, opacity: 0 },
                                            visible: { x: 0, opacity: 1 }
                                        }}
                                        key={req._id} 
                                        className='glass-panel flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-white/5 rounded-2xl shadow-sm gap-4 hover:bg-white/10 transition-all'
                                    >
                                        <div className='flex items-center gap-3'>
                                            <div>
                                                {req.from?.profile_pic ? (
                                                    <img src={req.from.profile_pic} className='w-14 h-14 object-cover rounded-full shadow-sm' alt={req.from.name} />
                                                ) : (
                                                    <PiUserCircle size={56} className='text-gray-400' />
                                                )}
                                            </div>
                                            <div className='min-w-0'>
                                                <div className='font-semibold text-white text-lg'>
                                                    {req.from?.name}
                                                </div>
                                                <p className='text-sm text-gray-400'>{req.from?.email}</p>
                                            </div>
                                        </div>
                                        <div className='flex gap-2 w-full sm:w-auto'>
                                            <motion.button 
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => respondToRequest(req._id, 'accept')}
                                                disabled={loading}
                                                className='flex-1 sm:flex-none px-6 py-2 bg-bg-bubble-me text-white font-medium rounded-lg shadow-[0_0_15px_rgba(0,198,255,0.4)] transition-all disabled:opacity-50'
                                            >
                                                Accept
                                            </motion.button>
                                            <motion.button 
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => respondToRequest(req._id, 'reject')}
                                                disabled={loading}
                                                className='flex-1 sm:flex-none px-6 py-2 bg-white/10 text-gray-300 font-medium rounded-lg hover:bg-white/20 transition-all disabled:opacity-50'
                                            >
                                                Reject
                                            </motion.button>
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

export default FriendRequests;
