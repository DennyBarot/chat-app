import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from '../context/SocketContext';
import {
  clearCallState,
  setCall,
  setIceCandidate,
  setIncomingCall,
} from '../store/slice/call/call.slice';

const CallModal = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { outgoingCall, incomingCall, call, iceCandidate, callRejected } = useSelector((state) => state.callReducer);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionRef = useRef();
  const localStreamRef = useRef();
  const pendingIceCandidatesRef = useRef([]);

  const setupPeerConnection = async (remoteUserId) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { to: remoteUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    } catch (error) {
      console.error("Error accessing media devices.", error);
      handleHangup();
    }

    peerConnectionRef.current = pc;
    return pc;
  };

  const handleHangup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    const remoteUserId = call?.from?._id || call?.to || incomingCall?.from?._id;
    if (remoteUserId && socket) {
      socket.emit('call-rejected', { to: remoteUserId });
    }
    dispatch(clearCallState());
  };

  // Unified effect for the entire call lifecycle
  useEffect(() => {
    // 1. Handle Outgoing Call
    if (outgoingCall && !call) {
      const startCall = async () => {
        const remoteUserId = outgoingCall.to;
        const pc = await setupPeerConnection(remoteUserId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call-user', { to: remoteUserId, offer });
        dispatch(setCall({ to: remoteUserId, type: 'outgoing' }));
      };
      startCall();
    }

    // 2. Handle Answer to Outgoing Call
    if (call?.type === 'outgoing' && call.answer && peerConnectionRef.current?.signalingState === 'have-local-offer') {
      const setAnswer = async () => {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(call.answer));
        // Process any pending ICE candidates
        pendingIceCandidatesRef.current.forEach(candidate => peerConnectionRef.current.addIceCandidate(candidate));
        pendingIceCandidatesRef.current = [];
      };
      setAnswer();
    }

    // 3. Handle Incoming Call
    if (incomingCall && call?.type === 'incoming' && call.status === 'active') {
        // This state is handled by the active call UI
    }

    // 4. Handle ICE Candidates
    if (iceCandidate?.candidate) {
      const candidate = new RTCIceCandidate(iceCandidate.candidate);
      if (peerConnectionRef.current?.remoteDescription) {
        peerConnectionRef.current.addIceCandidate(candidate).catch(e => console.error("Error adding ICE candidate:", e));
      } else {
        pendingIceCandidatesRef.current.push(candidate);
      }
      dispatch(setIceCandidate(null));
    }

    // 5. Handle Call Rejection/Hangup
    if (callRejected) {
      handleHangup();
    }

    // Cleanup on unmount
    return () => {
      if (call || incomingCall || outgoingCall) {
        // handleHangup(); // This might be too aggressive, consider if it's needed
      }
    };
  }, [outgoingCall, incomingCall, call, iceCandidate, callRejected, dispatch, socket]);

  const handleAnswer = async () => {
    if (!incomingCall) return;
    const remoteUserId = incomingCall.from._id;
    const pc = await setupPeerConnection(remoteUserId);
    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Process any pending ICE candidates right after setting the offer
    pendingIceCandidatesRef.current.forEach(candidate => pc.addIceCandidate(candidate));
    pendingIceCandidatesRef.current = [];

    socket.emit('make-answer', { to: remoteUserId, answer });
    dispatch(setCall({ from: incomingCall.from, type: 'incoming', status: 'active' }));
    dispatch(setIncomingCall(null));
  };

  const handleReject = () => {
    if (!incomingCall) return;
    socket.emit('call-rejected', { to: incomingCall.from._id });
    dispatch(clearCallState());
  };

  const isCallActive = call?.status === 'active';
  const isRinging = !!incomingCall;
  const isCalling = call?.type === 'outgoing' && !call.status;

  if (!isRinging && !isCalling && !isCallActive) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white rounded-lg p-8 shadow-lg w-full max-w-md mx-auto">
        {isRinging && !isCallActive && (
          <div className="text-center">
            <p className="text-2xl font-bold mb-2">Incoming Call</p>
            <div className="flex items-center justify-center mb-4">
              <img src={incomingCall.from.profilePic} alt={incomingCall.from.fullName} className="w-20 h-20 rounded-full mr-4" />
              <p className="text-xl">{incomingCall.from.fullName}</p>
            </div>
            <div className="flex justify-center space-x-4">
              <button onClick={handleAnswer} className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-semibold transition-colors">Answer</button>
              <button onClick={handleReject} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-full font-semibold transition-colors">Reject</button>
            </div>
          </div>
        )}

        {isCalling && (
            <div className="text-center">
                <p className="text-2xl font-bold mb-4">Calling...</p>
                <div className="flex justify-center">
                    <button onClick={handleHangup} className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold text-lg transition-colors">Cancel</button>
                </div>
            </div>
        )}

        {isCallActive && (
          <div>
            <div className="relative mb-4">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-64 bg-black rounded-lg" />
              <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-4 right-4 w-32 h-24 bg-gray-900 rounded-lg border-2 border-white" />
            </div>
            <div className="flex justify-center">
              <button onClick={handleHangup} className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold text-lg transition-colors">Hang Up</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallModal;
