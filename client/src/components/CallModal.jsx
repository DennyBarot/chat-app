import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Peer from 'simple-peer';
import {
  setCallAccepted,
  setCallEnded,
  setReceivingCall,
  setCaller,
  setCallerSignal,
  setStream,
  setRemoteStream,
  setIdToCall
} from '../store/slice/call/call.slice';
import { useSocket } from '../context/SocketContext';

const CallModal = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const callState = useSelector((state) => state.callReducer) || {};
  const {
    callAccepted = false,
    callEnded = false,
    stream = null,
    receivingCall = false,
    caller = "",
    callerSignal = null,
    me = "",
    idToCall = "",
    name = ""
  } = callState;

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  // Set up socket listeners - only when socket is available
  useEffect(() => {
    if (!socket) return;

    const handleCallUser = (data) => {
      dispatch(setReceivingCall(true));
      dispatch(setCaller(data.from));
      dispatch(setCallerSignal(data.signal));
    };

    const handleCallAccepted = (signal) => {
      dispatch(setCallAccepted(true));
      // Only create peer if we have a stream
      if (stream) {
        const peer = new Peer({
          initiator: false,
          trickle: false,
          stream: stream,
        });
        peer.signal(signal);
        connectionRef.current = peer;
      }
    };

    const handleEndCall = () => {
      dispatch(setCallEnded(true));
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
      window.location.reload();
    };

    socket.on('call-user', handleCallUser);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('end-call', handleEndCall);

    return () => {
      socket.off('call-user', handleCallUser);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('end-call', handleEndCall);
    };
  }, [socket, dispatch]); // Removed stream from dependencies to avoid re-creating listeners

  // Handle initiating a call
  useEffect(() => {
    if (idToCall && !stream) {
      // Request media permissions when initiating a call
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        dispatch(setStream(stream));
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }
      }).catch((error) => {
        console.error('Error accessing media devices:', error);
      });
    } else if (idToCall && stream) {
      callUser(idToCall);
      dispatch(setIdToCall(null)); // Reset after calling
    }
  }, [idToCall, stream, dispatch]);

  const callUser = (id) => {
    if (!socket || !stream) return;

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
      config: {
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302',
          },
        ],
      },
    });

    peer.on('signal', (data) => {
      socket.emit('call-user', {
        userToCall: id,
        signalData: data,
        from: me,
        name: name || 'Unknown',
      });
    });

    peer.on('stream', (stream) => {
      dispatch(setRemoteStream(stream));
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });

    

    connectionRef.current = peer;
  };

  const answerCall = () => {
    if (!socket || !caller || !callerSignal) return;

    // Request media permissions if we don't have a stream yet
    if (!stream) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((mediaStream) => {
        dispatch(setStream(mediaStream));
        if (myVideo.current) {
          myVideo.current.srcObject = mediaStream;
        }
        // Now create the peer connection with the stream
        createPeerConnection(mediaStream);
      }).catch((error) => {
        console.error('Error accessing media devices:', error);
      });
    } else {
      // We already have a stream, create peer connection directly
      createPeerConnection(stream);
    }
  };

  const createPeerConnection = (mediaStream) => {
    dispatch(setCallAccepted(true));
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: mediaStream,
      config: {
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302',
          },
        ],
      },
    });

    peer.on('signal', (data) => {
      socket.emit('answer-call', { signal: data, to: caller });
    });

    peer.on('stream', (remoteStream) => {
      dispatch(setRemoteStream(remoteStream));
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
      }
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    dispatch(setCallEnded(true));
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    if (socket) {
      socket.emit('end-call', { to: caller || me });
    }
    window.location.reload();
  };

  return (
    <>
      {receivingCall && !callAccepted && caller && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">{caller} is calling...</h3>
            <div className="flex space-x-4">
              <button
                onClick={answerCall}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Answer
              </button>
              <button
                onClick={() => dispatch(setReceivingCall(false))}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      {callAccepted && !callEnded && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="relative w-full h-full">
            <video
              playsInline
              muted
              ref={myVideo}
              autoPlay
              className="absolute top-4 right-4 w-1/4 h-1/4 border-2 border-white"
            />
            <video
              playsInline
              ref={userVideo}
              autoPlay
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
              <button
                onClick={leaveCall}
                className="bg-red-500 text-white px-6 py-3 rounded-full"
              >
                Hang Up
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CallModal;
