import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from '../context/SocketContext';
import {
  clearCallState,
  setCall,
  setCallRejected,
  setIceCandidate,
  setIncomingCall,
} from '../store/slice/call/call.slice';

const CallModal = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { userProfile } = useSelector((state) => state.userReducer);
  const { incomingCall, outgoingCall, call, iceCandidate, callRejected } = useSelector((state) => state.callReducer);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionRef = useRef();
  const [localStream, setLocalStream] = useState(null);

  const createPeerConnection = async (from) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { to: from, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    return pc;
  };

  useEffect(() => {
    if (incomingCall && !call) {
      const handleIncomingCall = async () => {
        peerConnectionRef.current = await createPeerConnection(incomingCall.from);
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
        dispatch(setCall({ from: incomingCall.from, type: 'incoming' }));
      };
      handleIncomingCall();
    }
  }, [incomingCall, call, dispatch]);

  useEffect(() => {
    if (outgoingCall && !call) {
      const handleOutgoingCall = async () => {
        peerConnectionRef.current = await createPeerConnection(outgoingCall.to);
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit('call-user', { to: outgoingCall.to, offer });
        dispatch(setCall({ to: outgoingCall.to, type: 'outgoing' }));
      };
      handleOutgoingCall();
    }
  }, [outgoingCall, call, dispatch, socket]);

  useEffect(() => {
    if (call && call.answer && peerConnectionRef.current.signalingState !== 'stable') {
      peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(call.answer));
    }
  }, [call]);

  useEffect(() => {
    if (iceCandidate && peerConnectionRef.current) {
      peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(iceCandidate.candidate));
      dispatch(setIceCandidate(null));
    }
  }, [iceCandidate, dispatch]);

  useEffect(() => {
    if (callRejected) {
      handleHangup();
    }
  }, [callRejected]);

  const handleAnswer = async () => {
    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);
    socket.emit('make-answer', { to: call.from, answer });
    dispatch(setCall({ status: 'active' }));
    dispatch(setIncomingCall(null));
  };

  const handleReject = () => {
    socket.emit('call-rejected', { to: call.from });
    dispatch(clearCallState());
  };

  const handleHangup = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (call) {
      socket.emit('call-rejected', { to: call.from || call.to });
    }
    dispatch(clearCallState());
  };

  if (!incomingCall && !call) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-lg w-full max-w-2xl">
        {incomingCall && !call && (
          <div className="text-center">
            <p className="text-2xl font-bold mb-4">{incomingCall.from} is calling...</p>
            <div className="flex justify-center space-x-4">
              <button onClick={handleAnswer} className="bg-green-500 text-white px-6 py-2 rounded-full font-semibold">Answer</button>
              <button onClick={handleReject} className="bg-red-500 text-white px-6 py-2 rounded-full font-semibold">Reject</button>
            </div>
          </div>
        )}
        {call && (
          <div>
            <div className="relative">
              <video ref={remoteVideoRef} autoPlay className="w-full h-96 bg-gray-200 rounded-lg" />
              <video ref={localVideoRef} autoPlay muted className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg border-2 border-white" />
            </div>
            <div className="flex justify-center mt-4">
              <button onClick={handleHangup} className="bg-red-500 text-white px-8 py-3 rounded-full font-bold text-lg">Hang up</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallModal;
