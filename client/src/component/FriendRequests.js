import React, { useState, useEffect } from 'react';
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

    return (
        <div className='fixed top-0 bottom-0 left-0 right-0 bg-slate-700 bg-opacity-40 p-2 z-50 flex justify-center items-center'>
            <div className='w-full max-w-lg mx-auto bg-white rounded-lg shadow-lg relative overflow-hidden'>
                {/* Header */}
                <div className='p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10'>
                    <h2 className='text-xl font-semibold text-slate-800'>Friend Requests</h2>
                    <button onClick={onClose} className='p-2 hover:bg-slate-100 rounded-full transition-all'>
                        <IoClose size={24} className="text-slate-500" />
                    </button>
                </div>

                {/* Results List */}
                <div className='bg-slate-50 w-full h-[60vh] max-h-[500px] overflow-y-auto p-4 scrollbar'>
                    {requests.length === 0 ? (
                        <div className='h-full flex flex-col items-center justify-center text-slate-400 gap-2'>
                            <p className='text-lg'>No pending requests</p>
                        </div>
                    ) : (
                        <div className='flex flex-col gap-3'>
                            {requests.map((req) => (
                                <div key={req._id} className='bg-white flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200 rounded-xl shadow-sm gap-4'>
                                    <div className='flex items-center gap-3'>
                                        <div>
                                            {req.from?.profile_pic ? (
                                                <img src={req.from.profile_pic} className='w-14 h-14 object-cover rounded-full shadow-sm' alt={req.from.name} />
                                            ) : (
                                                <PiUserCircle size={56} className='text-slate-400' />
                                            )}
                                        </div>
                                        <div className='min-w-0'>
                                            <div className='font-semibold text-slate-800 text-lg'>
                                                {req.from?.name}
                                            </div>
                                            <p className='text-sm text-slate-500'>{req.from?.email}</p>
                                        </div>
                                    </div>
                                    <div className='flex gap-2 w-full sm:w-auto'>
                                        <button 
                                            onClick={() => respondToRequest(req._id, 'accept')}
                                            disabled={loading}
                                            className='flex-1 sm:flex-none px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-50'
                                        >
                                            Accept
                                        </button>
                                        <button 
                                            onClick={() => respondToRequest(req._id, 'reject')}
                                            disabled={loading}
                                            className='flex-1 sm:flex-none px-6 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors shadow-sm disabled:opacity-50'
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FriendRequests;
