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
  setIdToCall,
  setName
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
  // FIX: Ref to store the ID of the user we are calling
  const idToCallRef = useRef();

  // Set up socket listeners - only when socket is available
  useEffect(() => {
    if (!socket) return;

    const handleCallUser = (data) => {
      dispatch(setReceivingCall(true));
      dispatch(setCaller(data.from));
      dispatch(setCallerSignal(data.signal));
    };

    // FIX: Correctly handle call acceptance on the caller's side
    const handleCallAccepted = (signal) => {
      dispatch(setCallAccepted(true));
      // The caller's peer connection is already in connectionRef.
      // We just need to signal it with the answer from the callee.
      if (connectionRef.current && signal) {
        try {
          connectionRef.current.signal(signal);
        } catch (error) {
          console.error('Error signaling peer connection:', error);
        }
      }
    };

    const handleEndCall = () => {
      dispatch(setCallEnded(true));
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
      // Note: Reloading the page is a simple way to reset state,
      // but a more graceful state reset might be better in the long run.
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
  }, [socket, dispatch]);

  // Handle initiating a call
  useEffect(() => {
    if (idToCall && !stream) {
      // Request media permissions when initiating a call
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((mediaStream) => {
        console.log('Media stream obtained:', mediaStream);
        dispatch(setStream(mediaStream));
        if (myVideo.current) {
          myVideo.current.srcObject = mediaStream;
        }
      }).catch((error) => {
        console.error('Error accessing media devices:', error);
        // Reset call state if media access fails
        dispatch(setIdToCall(""));
      });
    } else if (idToCall && stream && socket && socket.connected) {
      // FIX: Store the ID of the user we are calling before resetting it in the store
      idToCallRef.current = idToCall;
      console.log('Initiating call to user:', idToCall);
      callUser(idToCall);
      dispatch(setIdToCall("")); // Reset after calling to prevent re-triggering
    } else if (idToCall && stream && (!socket || !socket.connected)) {
      console.error('Cannot initiate call: socket not connected');
      dispatch(setIdToCall(""));
    }
  }, [idToCall, stream, socket, dispatch]);

  const callUser = (id) => {
    if (!socket || !stream) {
      console.error('Cannot create peer connection: socket or stream is missing', { socket: !!socket, stream: !!stream });
      return;
    }

    try {
      console.log('Creating peer connection with stream:', stream);
      const peer = new Peer({
        initiator: true,
        trickle: false,
        config: {
          iceServers: [
            {
              urls: 'stun:stun.l.google.com:19302',
            },
          ],
        },
      });

      // Add stream after peer creation to avoid potential issues
      if (stream) {
        peer.addStream(stream);
      }

      peer.on('signal', (data) => {
        console.log('Peer signal generated:', data);
        if (socket && socket.connected) {
          socket.emit('call-user', {
            userToCall: id,
            signalData: data,
            from: me,
            name: name || 'Unknown',
          });
        } else {
          console.error('Socket not connected when trying to emit call-user');
        }
      });

      peer.on('stream', (remoteStream) => {
        console.log('Received remote stream');
        dispatch(setRemoteStream(remoteStream));
        if (userVideo.current) {
          userVideo.current.srcObject = remoteStream;
        }
      });

      peer.on('error', (error) => {
        console.error('Peer connection error:', error);
      });

      peer.on('connect', () => {
        console.log('Peer connection established');
      });

      connectionRef.current = peer;
      console.log('Peer connection created successfully');
    } catch (error) {
      console.error('Error creating peer connection:', error);
      // Reset call state on error
      dispatch(setIdToCall(""));
    }
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
        // Reset call state if media access fails
        dispatch(setReceivingCall(false));
        dispatch(setCaller(""));
        dispatch(setCallerSignal(null));
      });
    } else {
      // We already have a stream, create peer connection directly
      createPeerConnection(stream);
    }
  };

  const createPeerConnection = (mediaStream) => {
    if (!mediaStream) {
      console.error('Cannot create peer connection: mediaStream is null/undefined');
      return;
    }

    dispatch(setCallAccepted(true));
    try {
      console.log('Creating answer peer connection with stream:', mediaStream);
      const peer = new Peer({
        initiator: false,
        trickle: false,
        config: {
          iceServers: [
            {
              urls: 'stun:stun.l.google.com:19302',
            },
          ],
        },
      });

      // Add stream after peer creation to avoid potential issues
      if (mediaStream) {
        peer.addStream(mediaStream);
      }

      peer.on('signal', (data) => {
        console.log('Answer peer signal generated:', data);
        if (socket && socket.connected) {
          socket.emit('answer-call', { signal: data, to: caller });
        } else {
          console.error('Socket not connected when trying to emit answer-call');
        }
      });

      peer.on('stream', (remoteStream) => {
        console.log('Received remote stream in answer peer');
        dispatch(setRemoteStream(remoteStream));
        if (userVideo.current) {
          userVideo.current.srcObject = remoteStream;
        }
      });

      peer.on('error', (error) => {
        console.error('Answer peer connection error:', error);
      });

      peer.on('connect', () => {
        console.log('Answer peer connection established');
      });

      if (callerSignal) {
        console.log('Signaling caller signal to peer');
        peer.signal(callerSignal);
      } else {
        console.error('No caller signal to signal');
      }

      connectionRef.current = peer;
      console.log('Answer peer connection created successfully');
    } catch (error) {
      console.error('Error creating answer peer connection:', error);
      // Reset call state on error
      dispatch(setCallAccepted(false));
      dispatch(setReceivingCall(false));
      dispatch(setCaller(""));
      dispatch(setCallerSignal(null));
    }
  };

  const leaveCall = () => {
    dispatch(setCallEnded(true));
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    if (socket && socket.connected) {
      // FIX: Ensure we notify the correct user when ending the call
      const remoteUser = caller || idToCallRef.current;
      if (remoteUser) {
        socket.emit('end-call', { to: remoteUser });
      }
    }
    window.location.reload();
  };

  return (
    <>
      {/* Incoming call modal */}
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

      {/* Outgoing call modal - when initiating a call */}
      {idToCall && !receivingCall && !callAccepted && !callEnded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Calling...</h3>
            <p className="text-gray-600 mb-4">Waiting for response...</p>
            <button
              onClick={() => {
                dispatch(setIdToCall(""));
                if (stream) {
                  stream.getTracks().forEach(track => track.stop());
                  dispatch(setStream(null));
                }
              }}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active call modal */}
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