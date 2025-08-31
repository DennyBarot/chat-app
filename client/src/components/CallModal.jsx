import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setCallAccepted,
  setCallEnded,
  setReceivingCall,
  setCaller,
  setCallerSignal,
  setStream,
  setRemoteStream,
  setIdToCall,
  clearIceCandidates,
  resetCallState
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
  const idToCallRef = useRef();

  // State for audio and video mute
  const [isAudioMuted, setIsAudioMuted] = React.useState(false);
  const [isVideoMuted, setIsVideoMuted] = React.useState(false);

  // Note: Socket event listeners are now handled in SocketContext to avoid conflicts
  // The CallModal focuses only on UI and peer connection management

  // Handle initiating a call
  useEffect(() => {
    if (idToCall && !stream) {
      // Request media permissions when initiating a call
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((mediaStream) => {
        console.log('Media stream obtained:', mediaStream);
        console.log('Stream tracks:', mediaStream.getTracks());
        dispatch(setStream(mediaStream));
      }).catch((error) => {
        console.error('Error accessing media devices:', error);
        alert('Unable to access camera and microphone. Please check permissions.');
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

  // Listen for answer signal from Redux state and set remote description on caller's RTCPeerConnection
  useEffect(() => {
    if (connectionRef.current && callState.answerSignal) {
      console.log('Setting remote description from answer signal');
      connectionRef.current.setRemoteDescription(new RTCSessionDescription(callState.answerSignal))
        .catch(error => {
          console.error('Error setting remote description from answer signal:', error);
        });
    }
  }, [callState.answerSignal]);

  // Listen for ICE candidates from Redux state and add them to RTCPeerConnection
  useEffect(() => {
    if (connectionRef.current && callState.iceCandidates.length > 0) {
      callState.iceCandidates.forEach(candidate => {
        connectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(error => {
            console.error('Error adding ICE candidate:', error);
          });
      });
      dispatch(clearIceCandidates());
    }
  }, [callState.iceCandidates, dispatch]);

  // Unified useEffect for WebRTC logic
  useEffect(() => {
    if (callAccepted && !callEnded) {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302',
          },
        ],
      });

      // Add local stream tracks
      if (stream) {
        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (userVideo.current) {
          userVideo.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            to: caller || idToCall,
            candidate: event.candidate,
          });
        }
      };

      // Caller logic
      if (!receivingCall) {
        peerConnection.createOffer()
          .then((offer) => peerConnection.setLocalDescription(offer))
          .then(() => {
            socket.emit('call-user', {
              userToCall: idToCall,
              signalData: peerConnection.localDescription,
              from: me,
              name,
            });
          });
      }

      // Receiver logic
      if (receivingCall && callerSignal) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(callerSignal))
          .then(() => peerConnection.createAnswer())
          .then((answer) => peerConnection.setLocalDescription(answer))
          .then(() => {
            socket.emit('answer-call', {
              signal: peerConnection.localDescription,
              to: caller,
            });
          });
      }

      connectionRef.current = peerConnection;
    }

    // Cleanup
    return () => {
      if (connectionRef.current) {
        connectionRef.current.close();
      }
    };
  }, [callAccepted, callEnded, stream]);

  // Handle local stream attachment when call is accepted and video elements are rendered
  useEffect(() => {
    if (callAccepted && !callEnded && stream && myVideo.current) {
      console.log('Attaching local stream to myVideo element after call acceptance');
      myVideo.current.srcObject = stream;
    }
  }, [callAccepted, callEnded, stream]);

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
           console.log('ICE candidate generated:', event.candidate.type, event.candidate.candidate);
           if (socket && socket.connected) {
             socket.emit('ice-candidate', {
               to: id,
               candidate: event.candidate,
             });
             console.log('ICE candidate sent to:', id);
           } else {
             console.error('Socket not connected when trying to send ICE candidate');
           }
         } else {
           console.log('ICE candidate gathering completed');
         }
       };

       peerConnection.ontrack = (event) => {
         console.log('Received remote track:', event.track.kind);
         if (event.streams && event.streams[0]) {
           dispatch(setRemoteStream(event.streams[0]));
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
        console.log('Answer media stream obtained:', mediaStream);
        console.log('Answer stream tracks:', mediaStream.getTracks());
        dispatch(setStream(mediaStream));
        // Don't try to attach to video element here - it will be handled when callAccepted becomes true
        console.log('Answer media stream ready, will attach to video element when call is accepted');
        // Now create the peer connection with the stream
        createPeerConnection(mediaStream);
      }).catch((error) => {
        console.error('Error accessing media devices for answer:', error);
        alert('Unable to access camera and microphone. Please check permissions.');
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
          console.log('Answer ICE candidate generated:', event.candidate.type, event.candidate.candidate);
          if (socket && socket.connected) {
            socket.emit('ice-candidate', {
              to: caller,
              candidate: event.candidate,
            });
            console.log('Answer ICE candidate sent to:', caller);
          } else {
            console.error('Socket not connected when trying to send answer ICE candidate');
          }
        } else {
          console.log('Answer ICE candidate gathering completed');
        }
      };

      peerConnection.ontrack = (event) => {
        console.log('Received remote track in answer peer:', event.track.kind);
        if (event.streams && event.streams[0]) {
          dispatch(setRemoteStream(event.streams[0]));
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

  // Handle call cleanup
  useEffect(() => {
    if (callEnded) {
      // Clean up peer connection
      if (connectionRef.current) {
        try {
          const pc = connectionRef.current;
          if (pc.getSenders) {
            pc.getSenders().forEach((sender) => {
              try {
                if (sender.track) {
                  sender.track.stop();
                }
              } catch (error) {
                console.error('Error stopping sender track:', error);
              }
            });
          }
          pc.onicecandidate = null;
          pc.ontrack = null;
          pc.onconnectionstatechange = null;
          if (pc.signalingState !== 'closed') pc.close();
        } catch (error) {
          console.error('Error closing peer connection:', error);
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

      // Reset all call-related state
      dispatch(resetCallState());
      idToCallRef.current = null;
    }
  }, [callEnded, dispatch, stream]);

  const leaveCall = () => {
    if (socket && socket.connected) {
      const remoteUser = caller || idToCallRef.current;
      if (remoteUser) {
        console.log('Sending end-call event to:', remoteUser);
        socket.emit('end-call', { to: remoteUser });
      } else {
        console.warn('No remote user found to send end-call event');
      }
    } else {
      console.warn('Socket not connected, cannot send end-call event');
    }

    dispatch(setCallEnded(true));
  };

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoMuted(!isVideoMuted);
    }
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
                onClick={toggleAudio}
                className={`px-6 py-3 rounded-full ${isAudioMuted ? 'bg-gray-500' : 'bg-blue-500'} text-white`}
              >
                {isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
              </button>
              <button
                onClick={toggleVideo}
                className={`px-6 py-3 rounded-full ${isVideoMuted ? 'bg-gray-500' : 'bg-blue-500'} text-white`}
              >
                {isVideoMuted ? 'Unmute Video' : 'Mute Video'}
              </button>
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