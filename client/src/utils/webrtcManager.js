// WebRTC Manager for direct client-to-client audio streaming
class WebRTCManager {
  constructor() {
    this.peerConnections = new Map();
    this.localStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
  }

  // Initialize WebRTC connection for a specific user
  async initializeConnection(userId, socket) {
    if (!this.peerConnections.has(userId)) {
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      const peerConnection = new RTCPeerConnection(configuration);
      this.peerConnections.set(userId, peerConnection);

      // Handle incoming audio tracks
      peerConnection.ontrack = (event) => {
        console.log('Received remote audio track', event);
        this.handleIncomingAudio(event.streams[0]);
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-signal', {
            type: 'ice-candidate',
            candidate: event.candidate,
            targetUserId: userId
          });
        }
      };

      return peerConnection;
    }
    return this.peerConnections.get(userId);
  }

  // Start audio recording for sending
  async startRecording() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      this.mediaRecorder = new MediaRecorder(this.localStream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Capture chunks every 100ms
      this.isRecording = true;
      
      return this.localStream;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  // Stop recording and get the audio blob
  async stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      return new Promise((resolve) => {
        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.recordedChunks, { 
            type: 'audio/webm;codecs=opus' 
          });
          this.isRecording = false;
          resolve(audioBlob);
        };
        this.mediaRecorder.stop();
        
        // Stop all tracks
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => track.stop());
        }
      });
    }
    return null;
  }

  // Create and send offer for WebRTC connection
  async createOffer(userId, socket) {
    try {
      const peerConnection = await this.initializeConnection(userId, socket);
      
      // Add local audio track if available
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream);
        });
      }

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('webrtc-signal', {
        type: 'offer',
        offer: offer,
        targetUserId: userId
      });

      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  // Handle incoming offer
  async handleOffer(offer, userId, socket) {
    try {
      const peerConnection = await this.initializeConnection(userId, socket);
      
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('webrtc-signal', {
        type: 'answer',
        answer: answer,
        targetUserId: userId
      });

      return answer;
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  // Handle incoming answer
  async handleAnswer(answer, userId) {
    try {
      const peerConnection = this.peerConnections.get(userId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate, userId) {
    try {
      const peerConnection = this.peerConnections.get(userId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  // Handle incoming audio stream
  handleIncomingAudio(stream) {
    // Create audio element and play the stream
    const audioElement = new Audio();
    audioElement.srcObject = stream;
    audioElement.autoplay = true;
    audioElement.controls = true;
    
    // Store reference for later control
    this.incomingAudio = audioElement;
    
    return audioElement;
  }

  // Close all connections
  closeAllConnections() {
    this.peerConnections.forEach((connection, userId) => {
      connection.close();
    });
    this.peerConnections.clear();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.incomingAudio) {
      this.incomingAudio.pause();
      this.incomingAudio = null;
    }
  }

  // Check if WebRTC is supported
  static isSupported() {
    return !!(navigator.mediaDevices && 
              navigator.mediaDevices.getUserMedia && 
              RTCPeerConnection);
  }

  // Get audio duration from blob
  static async getAudioDuration(blob) {
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const fileReader = new FileReader();
      
      fileReader.onload = async function() {
        try {
          const arrayBuffer = this.result;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          resolve(Math.round(audioBuffer.duration));
        } catch (error) {
          console.error('Error getting audio duration:', error);
          resolve(0);
        }
      };
      
      fileReader.readAsArrayBuffer(blob);
    });
  }
}

// Create singleton instance
const webRTCManager = new WebRTCManager();

export default webRTCManager;
