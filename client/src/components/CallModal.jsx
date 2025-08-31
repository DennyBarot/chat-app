import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Peer from 'simple-peer';
  setCallAccepted,
  setCallEnded,
  setReceivingCall,
import{
  setCallAccepted,
  setCallEnded,
  setReceivingCall,
  setCaller,
  setCallerSignal,
  setStream,
  setRemoteStream,
  setIdToCall,
  resetCallState
} from '../store/slice/call/call.slice';
import { useSocket } from '../context/SocketContext';
import { useSelector, useDispatch } from 'react-redux';

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

  // Note: Socket event listeners are now handled in SocketContext to avoid conflicts
  // The CallModal focuses only on UI and peer connection management

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
      console.log('Creating RTCPeerConnection with stream:', stream);
      console.log('Stream tracks:', stream.getTracks());

      // Validate stream before creating peer
      if (!stream || !stream.active) {
        throw new Error('Invalid stream provided to RTCPeerConnection');
      }

      if (stream.getTracks().length === 0) {
        throw new Error('Stream has no tracks');
      }

      console.log('Creating RTCPeerConnection instance...');
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302',
          },
        ],
      });

      console.log('RTCPeerConnection instance created, adding tracks...');
      // Add stream tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });
      console.log('Tracks added to RTCPeerConnection successfully');
 
       peerConnection.onicecandidate = (event) => {
         if (event.candidate) {
           console.log('ICE candidate generated');
           if (socket && socket.connected) {
             socket.emit('ice-candidate', {
               to: id,
               candidate: event.candidate,
             });
           }
         }
       };

       peerConnection.ontrack = (event) => {
         console.log('Received remote track');
         const remoteStream = event.streams[0];
         dispatch(setRemoteStream(remoteStream));
         if (userVideo.current) {
           userVideo.current.srcObject = remoteStream;
         }
       };

       peerConnection.onconnectionstatechange = () => {
         console.log('Connection state:', peerConnection.connectionState);
         if (peerConnection.connectionState === 'connected') {
           console.log('Peer connection established');
         }
       };

       // Create offer
       peerConnection.createOffer()
         .then(offer => {
           return peerConnection.setLocalDescription(offer);
         })
         .then(() => {
           if (socket && socket.connected) {
             socket.emit('call-user', {
               userToCall: id,
               signalData: peerConnection.localDescription,
               from: me,
               name: name || 'Unknown',
             });
           } else {
             console.error('Socket not connected when trying to emit call-user');
           }
         })
         .catch(error => {
           console.error('Error creating offer:', error);
           dispatch(setIdToCall(""));
         });

      connectionRef.current = peerConnection;
      console.log('RTCPeerConnection created successfully');
    } catch (error) {
      console.error('Error creating RTCPeerConnection:', error);
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
      console.log('Creating answer RTCPeerConnection with stream:', mediaStream);
      console.log('Answer stream tracks:', mediaStream.getTracks());

      // Validate stream before creating peer
      if (!mediaStream || !mediaStream.active) {
        throw new Error('Invalid mediaStream provided to RTCPeerConnection');
      }

      if (mediaStream.getTracks().length === 0) {
        throw new Error('Answer stream has no tracks');
      }

      console.log('Creating answer RTCPeerConnection instance...');
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302',
          },
        ],
      });

      console.log('Answer RTCPeerConnection instance created, adding tracks...');
      // Add stream tracks to peer connection
      mediaStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, mediaStream);
      });
      console.log('Answer tracks added to RTCPeerConnection successfully');

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Answer ICE candidate generated');
          if (socket && socket.connected) {
            socket.emit('ice-candidate', {
              to: caller,
              candidate: event.candidate,
            });
          }
        }
      };

      peerConnection.ontrack = (event) => {
        console.log('Received remote track in answer peer');
        const remoteStream = event.streams[0];
        dispatch(setRemoteStream(remoteStream));
        if (userVideo.current) {
          userVideo.current.srcObject = remoteStream;
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log('Answer connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          console.log('Answer peer connection established');
        }
      };

      if (callerSignal) {
        console.log('Setting remote description from caller signal');
        peerConnection.setRemoteDescription(new RTCSessionDescription(callerSignal))
          .then(() => {
            return peerConnection.createAnswer();
          })
          .then(answer => {
            return peerConnection.setLocalDescription(answer);
          })
          .then(() => {
            if (socket && socket.connected) {
              socket.emit('answer-call', {
                signal: peerConnection.localDescription,
                to: caller
              });
            } else {
              console.error('Socket not connected when trying to emit answer-call');
              dispatch(setCallAccepted(false));
              dispatch(setReceivingCall(false));
              dispatch(setCaller(""));
              dispatch(setCallerSignal(null));
            }
          })
          .catch(error => {
            console.error('Error creating answer:', error);
            dispatch(setCallAccepted(false));
            dispatch(setReceivingCall(false));
            dispatch(setCaller(""));
            dispatch(setCallerSignal(null));
          });
      } else {
        console.error('No caller signal to process');
        dispatch(setCallAccepted(false));
        dispatch(setReceivingCall(false));
        dispatch(setCaller(""));
        dispatch(setCallerSignal(null));
      }

      connectionRef.current = peerConnection;
      console.log('Answer RTCPeerConnection created successfully');
    } catch (error) {
      console.error('Error creating answer RTCPeerConnection:', error);
      // Reset call state on error
      dispatch(setCallAccepted(false));
      dispatch(setReceivingCall(false));
      dispatch(setCaller(""));
      dispatch(setCallerSignal(null));
    }
  };

  const leaveCall = () => {
    dispatch(setCallEnded(true));

    // Clean up peer connection
    if (connectionRef.current) {
      try {
        connectionRef.current.destroy();
      } catch (error) {
        console.error('Error destroying peer connection:', error);
      }
      connectionRef.current = null;
    }

    // Clean up media streams
    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.error('Error stopping track:', error);
        }
      });
      dispatch(setStream(null));
    }

    if (socket && socket.connected) {
      // FIX: Ensure we notify the correct user when ending the call
      const remoteUser = caller || idToCallRef.current;
      if (remoteUser) {
        socket.emit('end-call', { to: remoteUser });
      }
    }

    // Reset all call-related state
    dispatch(resetCallState());
    idToCallRef.current = null;

    // Note: Consider removing window.location.reload() and handle state reset more gracefully
    // window.location.reload();
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