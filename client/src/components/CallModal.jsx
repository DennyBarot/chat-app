
import React, { useState, useEffect } from 'react';

const CallModal = ({ call, callAccepted, myVideo, userVideo, stream, answerCall, leaveCall, callEnded }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimer, setCallTimer] = useState(null);

  useEffect(() => {
    if (callAccepted && !callEnded) {
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      setCallTimer(timer);
    } else {
      if (callTimer) {
        clearInterval(callTimer);
        setCallTimer(null);
      }
      setCallDuration(0);
    }

    return () => {
      if (callTimer) {
        clearInterval(callTimer);
      }
    };
  }, [callAccepted, callEnded]);

  const toggleMute = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-2xl shadow-2xl max-w-5xl w-full mx-4">
        {/* Call Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <h2 className="text-2xl font-bold text-white">
              {call.isReceivingCall && !callAccepted ? 'Incoming Call' : 'Video Call'}
            </h2>
            {callAccepted && !callEnded && (
              <span className="ml-4 text-green-400 text-sm">
                {formatDuration(callDuration)}
              </span>
            )}
          </div>
          <button 
            onClick={leaveCall}
            className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-colors"
            title="End Call"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video Streams */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Local Video */}
          <div className="relative bg-black rounded-xl overflow-hidden">
            {stream && (
              <video 
                playsInline 
                muted 
                ref={myVideo} 
                autoPlay 
                className="w-full h-64 object-cover"
              />
            )}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-sm px-2 py-1 rounded">
              You {isMuted ? '🔇' : '🎤'} {!isVideoEnabled ? '📷❌' : ''}
            </div>
          </div>

          {/* Remote Video */}
          <div className="relative bg-black rounded-xl overflow-hidden">
            {callAccepted && !callEnded ? (
              <video 
                playsInline 
                ref={userVideo} 
                autoPlay 
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-gray-800">
                <div className="text-center text-white">
                  <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">{call?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  </div>
                  <p className="text-lg font-semibold">{call?.name || 'User'}</p>
                  {call.isReceivingCall && !callAccepted && (
                    <p className="text-sm text-gray-400 mt-2">Ringing...</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Call Controls */}
        {callAccepted && !callEnded && (
          <div className="flex justify-center space-x-4 mb-4">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-colors ${
                isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
              } text-white`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMuted ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                )}
              </svg>
            </button>

            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-colors ${
                !isVideoEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
              } text-white`}
              title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isVideoEnabled ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z M9 5l6 6M15 5l-6 6" />
                )}
              </svg>
            </button>
          </div>
        )}

        {/* Incoming Call Buttons */}
        {call.isReceivingCall && !callAccepted && (
          <div className="flex justify-center space-x-4">
            <button
              onClick={leaveCall}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full text-lg font-semibold transition-colors"
            >
              Decline
            </button>
            <button
              onClick={answerCall}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-lg font-semibold transition-colors"
            >
              Answer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallModal;
