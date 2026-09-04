import React, { useState } from 'react';
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

    return (
        <div className='fixed top-0 bottom-0 left-0 right-0 bg-slate-700 bg-opacity-40 p-2 z-50 flex justify-center items-center'>
            <div className='w-full max-w-lg mx-auto bg-white rounded-lg shadow-lg relative overflow-hidden'>
                {/* Header */}
                <div className='p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10'>
                    <h2 className='text-xl font-semibold text-slate-800'>Add Friend</h2>
                    <button onClick={onClose} className='p-2 hover:bg-slate-100 rounded-full transition-all'>
                        <IoClose size={24} className="text-slate-500" />
                    </button>
                </div>
                
                {/* Search Input */}
                <div className='p-4 bg-slate-50 border-b'>
                    <div className='h-12 w-full flex items-center bg-white rounded-lg border border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all'>
                        <div className='px-4 text-slate-400'>
                            <IoSearchOutline size={22} />
                        </div>
                        <input 
                            type='text'
                            placeholder='Search users by name or email...'
                            className='w-full outline-none h-full bg-transparent text-slate-700 pr-4'
                            onChange={(e) => setSearch(e.target.value)}
                            value={search}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Results List */}
                <div className='bg-white w-full h-[60vh] max-h-[400px] overflow-y-auto p-4 scrollbar'>
                    {searchUser.length === 0 && !loading && search && (
                        <div className='h-full flex flex-col items-center justify-center text-slate-400 gap-2'>
                            <IoSearchOutline size={40} className='opacity-50' />
                            <p className='text-lg'>No users found</p>
                        </div>
                    )}
                    
                    {searchUser.length === 0 && !loading && !search && (
                        <div className='h-full flex flex-col items-center justify-center text-slate-400 text-center px-8'>
                            <p>Type a name or email to find friends to chat with!</p>
                        </div>
                    )}

                    {loading && (
                        <div className='flex justify-center items-center py-10'>
                            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
                        </div>
                    )}

                    {!loading && searchUser.length !== 0 && (
                        <div className='flex flex-col gap-3'>
                            {searchUser.map((user, index) => (
                                <div key={user._id} className='flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors shadow-sm'>
                                    <div className='flex items-center gap-3 min-w-0'>
                                        <div>
                                            {user?.profile_pic ? (
                                                <img src={user?.profile_pic} className='w-12 h-12 object-cover rounded-full shadow-sm' alt={user?.name} />
                                            ) : (
                                                <PiUserCircle size={48} className='text-slate-400' />
                                            )}
                                        </div>
                                        <div className='min-w-0'>
                                            <div className='font-semibold text-slate-800 text-ellipsis line-clamp-1'>
                                                {user?.name}
                                            </div>
                                            <p className='text-sm text-slate-500 text-ellipsis line-clamp-1'>{user?.email}</p>
                                        </div>
                                    </div>
                                    <div className='pl-2 shrink-0'>
                                        {user.requestStatus === 'accepted' ? (
                                            <span className='px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold'>Friends</span>
                                        ) : user.requestStatus === 'pending' ? (
                                            <span className='px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold'>
                                                {user.requestDirection === 'sent' ? 'Requested' : 'Incoming'}
                                            </span>
                                        ) : (
                                            <button 
                                                onClick={() => sendRequest(user._id)}
                                                className='px-4 py-1.5 bg-primary text-white text-sm rounded-full font-medium hover:bg-primary-dark transition-colors shadow-sm hover:shadow'
                                            >
                                                Add Friend
                                            </button>
                                        )}
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

export default SearchUser;
