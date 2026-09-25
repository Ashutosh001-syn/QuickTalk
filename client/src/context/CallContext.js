import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

// simple-peer depends on readable-stream, which expects Node's process global.
// CRA 5 no longer provides it automatically in browser bundles.
if (typeof window !== 'undefined' && !window.process) {
    window.process = { env: { NODE_ENV: 'production' } };
}
if (typeof window !== 'undefined' && !window.process.nextTick) {
    window.process.nextTick = (callback, ...args) => Promise.resolve().then(() => callback(...args));
}

const CallContext = createContext();
// STUN is the fallback. Authenticated TURN servers are fetched from our backend per session.
const defaultIceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    // Temporary shared relay for testing across mobile/laptop networks.
    // Replace with the server-generated Cloudflare TURN credentials for production.
    {
        urls: [
            'turn:openrelay.metered.ca:80',
            'turn:openrelay.metered.ca:443',
            'turns:openrelay.metered.ca:443?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
    }
];
export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children, socketConnection, user }) => {
    const [call, setCall] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callActive, setCallActive] = useState(false);
    const [stream, setStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isMyVideoOn, setIsMyVideoOn] = useState(true);
    const [isMyAudioOn, setIsMyAudioOn] = useState(true);
    const myVideo = useRef(null);
    const userVideo = useRef(null);
    const peerRef = useRef(null);
    const callRef = useRef(null);
    const streamRef = useRef(null);
    const startTimeRef = useRef(null);
    const iceServersRef = useRef(defaultIceServers);

    useEffect(() => {
        let active = true;
        const loadIceServers = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/turn-credentials`, { credentials: 'include' });
                const data = await response.json();
                if (active && response.ok && Array.isArray(data.iceServers)) {
                    iceServersRef.current = data.iceServers;
                }
            } catch (error) {
                // A direct STUN connection may still work; TURN is retried on the next app load.
                console.warn('TURN relay is unavailable:', error);
            }
        };
        loadIceServers();
        return () => { active = false; };
    }, []);

    const setCurrentCall = useCallback((next) => { callRef.current = next; setCall(next); }, []);
    const clearMedia = useCallback(() => {
        if (peerRef.current) { peerRef.current.removeAllListeners(); peerRef.current.destroy(); peerRef.current = null; }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (myVideo.current) myVideo.current.srcObject = null;
        if (userVideo.current) userVideo.current.srcObject = null;
        setStream(null); setRemoteStream(null);
    }, []);
    const finishCall = useCallback((notifyPeer = true) => {
        const current = callRef.current;
        if (notifyPeer && socketConnection && current) {
            socketConnection.emit('end_call', { to: current.callerId, callId: current.callId });
            if (!current.isReceivingCall) socketConnection.emit('save_call_log', { receiverId: current.callerId, callType: current.isVideo ? 'video' : 'audio', callDuration: startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0 });
        }
        clearMedia(); startTimeRef.current = null; setCurrentCall(null); setCallAccepted(false); setCallActive(false); setIsMyVideoOn(true); setIsMyAudioOn(true);
    }, [clearMedia, setCurrentCall, socketConnection]);
    const setupMedia = useCallback(async (isVideo) => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
            streamRef.current = mediaStream; setStream(mediaStream); return mediaStream;
        } catch (error) { console.error('Unable to access call media:', error); toast.error('Could not access your camera or microphone. Check browser permissions.'); return null; }
    }, []);

    useEffect(() => {
        if (!socketConnection) return undefined;
        const incoming = (data) => {
            if (callRef.current || peerRef.current) return socketConnection.emit('end_call', { to: data.from, callId: data.callId });
            setCurrentCall({ ...data, callerId: data.from, isReceivingCall: true });
        };
        const accepted = ({ callId, signal }) => {
            if (callRef.current?.callId !== callId || !peerRef.current) return;
            setCallAccepted(true); setCallActive(true); startTimeRef.current = Date.now(); peerRef.current.signal(signal);
        };
        const ended = ({ callId }) => { if (!callId || callRef.current?.callId === callId) finishCall(false); };
        const unavailable = ({ callId }) => { if (callRef.current?.callId === callId) { toast.error('This user is unavailable for a call.'); finishCall(false); } };
        socketConnection.on('incoming_call', incoming); socketConnection.on('call_accepted', accepted); socketConnection.on('call_ended', ended); socketConnection.on('call_unavailable', unavailable);
        return () => { socketConnection.off('incoming_call', incoming); socketConnection.off('call_accepted', accepted); socketConnection.off('call_ended', ended); socketConnection.off('call_unavailable', unavailable); };
    }, [finishCall, setCurrentCall, socketConnection]);
    useEffect(() => () => clearMedia(), [clearMedia]);

    const createPeer = useCallback((initiator, mediaStream, current) => {
        const SimplePeer = require('simple-peer');
        const peer = new SimplePeer({ initiator, trickle: false, stream: mediaStream, config: { iceServers: iceServersRef.current } });
        peerRef.current = peer;
        peer.on('error', (error) => { console.error('WebRTC peer error:', error); toast.error('The call connection failed.'); finishCall(true); });
        peer.on('stream', (incomingStream) => setRemoteStream(incomingStream));
        peer.on('signal', (signal) => {
            if (initiator) {
                socketConnection.timeout(8000).emit('initiate_call', { userToCall: current.callerId, signalData: signal, callId: current.callId, callerName: user.name, callerPic: user.profile_pic, isVideo: current.isVideo }, (error, result) => {
                    if (error || !result?.ok) {
                        toast.error(result?.message || 'Unable to reach the call server. Please try again.');
                        finishCall(false);
                    }
                });
            }
            else socketConnection.emit('accept_call', { to: current.callerId, callId: current.callId, signal });
        });
        return peer;
    }, [finishCall, socketConnection, user]);
    const callUser = useCallback(async (id, name, pic, isVideo) => {
        if (!socketConnection?.connected || !user || callRef.current) return toast.error('A call is already in progress.');
        const current = { callId: `${user._id}-${Date.now()}-${Math.random().toString(36).slice(2)}`, callerId: id, callerName: name, callerPic: pic, isVideo, isReceivingCall: false };
        setCurrentCall(current); setCallActive(true);
        const mediaStream = await setupMedia(isVideo);
        if (!mediaStream) return finishCall(false);
        createPeer(true, mediaStream, current);
    }, [createPeer, finishCall, setCurrentCall, setupMedia, socketConnection, user]);
    const answerCall = useCallback(async () => {
        const current = callRef.current;
        if (!current || peerRef.current) return;
        const mediaStream = await setupMedia(current.isVideo);
        if (!mediaStream) return finishCall(true);
        setCallAccepted(true); setCallActive(true); startTimeRef.current = Date.now();
        createPeer(false, mediaStream, current).signal(current.signal);
    }, [createPeer, finishCall, setupMedia]);
    const toggleAudio = () => { const track = streamRef.current?.getAudioTracks()[0]; if (track) { track.enabled = !track.enabled; setIsMyAudioOn(track.enabled); } };
    const toggleVideo = () => { const track = streamRef.current?.getVideoTracks()[0]; if (track) { track.enabled = !track.enabled; setIsMyVideoOn(track.enabled); } };

    return <CallContext.Provider value={{ call, callAccepted, myVideo, userVideo, stream, remoteStream, callEnded: false, callActive, isMyVideoOn, isMyAudioOn, callUser, answerCall, endCall: finishCall, toggleAudio, toggleVideo }}>{children}</CallContext.Provider>;
};
