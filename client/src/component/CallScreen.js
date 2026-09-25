import React, { useEffect } from 'react';
import { useCall } from '../context/CallContext';
import { FaPhoneAlt, FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, FaPhoneSlash } from 'react-icons/fa';

const CallScreen = () => {
    const {
        call,
        callAccepted,
        myVideo,
        userVideo,
        stream,
        callEnded,
        callActive,
        isMyVideoOn,
        isMyAudioOn,
        remoteStream,
        answerCall,
        endCall,
        toggleAudio,
        toggleVideo
    } = useCall();

    useEffect(() => {
        if (stream && myVideo.current && myVideo.current.srcObject !== stream) {
            myVideo.current.srcObject = stream;
            myVideo.current.play().catch(e => console.error("Error playing local video:", e));
        }
    }, [stream, myVideo]);

    useEffect(() => {
        if (remoteStream && userVideo.current && userVideo.current.srcObject !== remoteStream) {
            userVideo.current.srcObject = remoteStream;
            userVideo.current.play().catch(e => console.error("Error playing remote video:", e));
        }
    }, [remoteStream, userVideo]);

    if (!call && !callActive) return null;

    return (
        <div className="fixed inset-0 z-50 flex min-h-[100dvh] items-center justify-center bg-black/90 backdrop-blur-sm">
            {/* INCOMING CALL MODAL */}
            {call && call.isReceivingCall && !callAccepted && (
                <div className="glass-panel mx-4 w-full max-w-sm rounded-3xl border border-white/10 p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] sm:p-8 flex flex-col items-center">
                    <img 
                        src={call.callerPic || 'https://via.placeholder.com/150'} 
                        alt="caller" 
                        className="w-24 h-24 rounded-full mb-4 object-cover" 
                    />
                    <h2 className="text-xl font-bold text-text-primary mb-2">{call.callerName}</h2>
                    <p className="text-text-secondary mb-8">
                        {call.isVideo ? 'Incoming Video Call...' : 'Incoming Audio Call...'}
                    </p>
                    
                    <div className="flex gap-8">
                        <button 
                            onClick={endCall}
                            className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105"
                        >
                            <FaPhoneSlash size={24} />
                        </button>
                        <button 
                            onClick={answerCall}
                            className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 animate-bounce"
                        >
                            {call.isVideo ? <FaVideo size={24} /> : <FaPhoneAlt size={24} />}
                        </button>
                    </div>
                </div>
            )}

            {/* ACTIVE CALL WINDOW */}
            {(callAccepted || callActive) && !callEnded && (
                <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0a0a0f] flex flex-col md:h-[min(75vh,760px)] md:w-3/4 md:max-w-6xl md:rounded-3xl md:shadow-[0_0_50px_rgba(0,0,0,0.8)] md:border md:border-white/10">
                    
                    {/* Header */}
                    <div className="absolute top-0 left-0 w-full p-3 sm:p-4 bg-gradient-to-b from-black/80 to-transparent z-30 text-white flex justify-between items-center gap-3">
                        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                            <img src={call?.callerPic} alt="pic" className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-full border-2 border-accent object-cover" />
                            <h3 className="truncate font-semibold text-base sm:text-lg">{call?.callerName}</h3>
                        </div>
                        <span className="shrink-0 rounded-full bg-black/50 px-2 py-1 text-xs sm:px-3 sm:text-sm">
                            {call?.isVideo ? 'Video Call' : 'Audio Call'}
                        </span>
                    </div>

                    {/* Videos */}
                    <div className="relative flex flex-1 items-center justify-center bg-black">
                        {/* Audio Call UI (shown when no video) */}
                        {!call?.isVideo && callAccepted && (
                            <div className="flex flex-col items-center justify-center">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-accent rounded-full animate-ping opacity-30"></div>
                                    <img 
                                        src={call?.callerPic || 'https://via.placeholder.com/150'} 
                                        alt="caller" 
                                        className="w-32 h-32 rounded-full relative z-10 border-4 border-accent object-cover shadow-[0_0_30px_rgba(0,242,254,0.3)]" 
                                    />
                                </div>
                                <h3 className="text-white text-2xl mt-6 font-semibold animate-pulse text-accent">In Call...</h3>
                            </div>
                        )}

                        {/* Remote Video (Full Screen - hidden during audio call) */}
                        {callAccepted ? (
                            <div className={`h-full w-full px-2 pt-16 pb-24 sm:px-5 sm:pt-20 sm:pb-28 flex items-center justify-center ${!call?.isVideo ? 'hidden' : ''}`}>
                                <video 
                                    playsInline 
                                    ref={userVideo} 
                                    autoPlay 
                                    className="h-full w-full object-contain"
                                />
                            </div>
                        ) : (
                            <div className="text-white text-xl animate-pulse">Ringing...</div>
                        )}

                        {/* Local Video (Picture in Picture - hidden during audio call) */}
                        {stream && call?.isVideo && (
                            <div className="absolute right-3 top-16 z-20 aspect-video w-28 overflow-hidden rounded-lg border-2 border-gray-600 bg-black shadow-lg sm:right-5 sm:top-20 sm:w-36 md:right-8 md:top-24 md:w-64">
                                <video 
                                    playsInline 
                                    muted 
                                    ref={myVideo} 
                                    autoPlay 
                                    className={`w-full h-full object-cover scale-x-[-1] ${!isMyVideoOn ? 'hidden' : ''}`}
                                />
                                {!isMyVideoOn && (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                                        <FaVideoSlash size={24} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Controls Footer */}
                    <div className="absolute bottom-0 left-0 z-30 flex w-full justify-center gap-4 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/85 to-transparent px-4 pt-10 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:gap-6 sm:p-8">
                        <button 
                            onClick={toggleAudio}
                            className={`p-4 rounded-full transition-all duration-300 hover:scale-110 ${isMyAudioOn ? 'glass-panel hover:bg-white/10 text-white' : 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}
                        >
                            {isMyAudioOn ? <FaMicrophone size={20} /> : <FaMicrophoneSlash size={20} />}
                        </button>
                        
                        {call?.isVideo && (
                            <button 
                                onClick={toggleVideo}
                                className={`p-4 rounded-full transition-all duration-300 hover:scale-110 ${isMyVideoOn ? 'glass-panel hover:bg-white/10 text-white' : 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}
                            >
                                {isMyVideoOn ? <FaVideo size={20} /> : <FaVideoSlash size={20} />}
                            </button>
                        )}
                        
                        <button 
                            onClick={endCall}
                            className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-lg"
                        >
                            <FaPhoneSlash className="text-white" size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallScreen;
