import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const [pendingCandidates, setPendingCandidates] = useState([]);

  const getRemoteUserId = useCallback(() => {
    return call?.to || call?.from?._id || incomingCall?.from?._id || outgoingCall?.to;
  }, [call, incomingCall, outgoingCall]);

  const handleHangup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    const remoteUserId = getRemoteUserId();
    if (remoteUserId && socket) {
      socket.emit('call-rejected', { to: remoteUserId });
    }
    dispatch(clearCallState());
    setPendingCandidates([]);
  }, [dispatch, socket, getRemoteUserId]);

  const setupPeerConnection = useCallback(async () => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

    pc.onicecandidate = (event) => {
      const remoteUserId = getRemoteUserId();
      if (event.candidate && socket && remoteUserId) {
        socket.emit('ice-candidate', { to: remoteUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
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
      console.error("Error accessing media devices:", error);
      handleHangup();
    }

    peerConnectionRef.current = pc;
    return pc;
  }, [socket, handleHangup, getRemoteUserId]);

  useEffect(() => {
    if (iceCandidate?.candidate) {
      const candidate = new RTCIceCandidate(iceCandidate.candidate);
      if (peerConnectionRef.current?.remoteDescription) {
        peerConnectionRef.current.addIceCandidate(candidate).catch(e => console.error("Error adding received ICE candidate:", e));
      } else {
        setPendingCandidates(prev => [...prev, candidate]);
      }
      dispatch(setIceCandidate(null));
    }
  }, [iceCandidate, dispatch]);

  const processPendingCandidates = useCallback(() => {
    if (peerConnectionRef.current) {
      pendingCandidates.forEach(candidate => {
        peerConnectionRef.current.addIceCandidate(candidate).catch(e => console.error("Error adding pending ICE candidate:", e));
      });
      setPendingCandidates([]);
    }
  }, [pendingCandidates]);

  useEffect(() => {
    if (callRejected) {
      handleHangup();
    }
  }, [callRejected, handleHangup]);

  // Effect for the CALLER to initiate the call
  useEffect(() => {
    if (outgoingCall && !call) {
      const startCall = async () => {
        const pc = await setupPeerConnection();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call-user', { to: outgoingCall.to, offer });
        dispatch(setCall({ to: outgoingCall.to, type: 'outgoing' }));
      };
      startCall();
    }
  }, [outgoingCall, call, dispatch, socket, setupPeerConnection]);

  // Effect for the CALLER to handle the answer
  useEffect(() => {
    if (call?.type === 'outgoing' && call.answer && peerConnectionRef.current) {
      if (peerConnectionRef.current.signalingState === 'have-local-offer') {
        peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(call.answer))
          .then(() => {
            processPendingCandidates();
            dispatch(setCall({ ...call, status: 'active' }));
          })
          .catch(e => console.error("Failed to set remote description for answer:", e));
      }
    }
  }, [call, dispatch, processPendingCandidates]);

  const handleAnswer = async () => {
    if (!incomingCall) return;

    const pc = await setupPeerConnection();

    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    
    processPendingCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit('make-answer', { to: incomingCall.from._id, answer });
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
  const isCalling = call?.type === 'outgoing' && !isCallActive;

  if (!isRinging && !isCalling && !isCallActive) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white rounded-lg p-8 shadow-lg w-full max-w-md mx-auto flex flex-col items-center">
        {isRinging && (
          <div className="text-center">
            <p className="text-2xl font-bold mb-2">Incoming Call</p>
            <div className="flex flex-col items-center justify-center mb-4">
              <img src={incomingCall.from.profilePic} alt={incomingCall.from.fullName} className="w-24 h-24 rounded-full mb-4 border-2 border-gray-400" />
              <p className="text-xl font-semibold">{incomingCall.from.fullName}</p>
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
          <div className="w-full">
            <div className="relative mb-4 w-full h-64">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover bg-black rounded-lg" />
              <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-4 right-4 w-32 h-24 object-cover bg-gray-900 rounded-lg border-2 border-white" />
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
