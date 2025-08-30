import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isCallModalOpen: false,
  incomingCall: null,
  ongoingCall: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  callType: null, // 'audio' or 'video'
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    openCallModal: (state, action) => {
      state.isCallModalOpen = true;
      state.callType = action.payload.callType;
      state.ongoingCall = action.payload.user;
    },
    closeCallModal: (state) => {
      state.isCallModalOpen = false;
      state.incomingCall = null;
      state.ongoingCall = null;
      state.localStream = null;
      state.remoteStream = null;
      state.isMuted = false;
      state.isCameraOff = false;
      state.callType = null;
    },
    setIncomingCall: (state, action) => {
      state.incomingCall = action.payload;
      state.isCallModalOpen = true;
    },
    setOngoingCall: (state, action) => {
      state.ongoingCall = action.payload;
    },
    setLocalStream: (state, action) => {
      state.localStream = action.payload;
    },
    setRemoteStream: (state, action) => {
      state.remoteStream = action.payload;
    },
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },
    toggleCamera: (state) => {
      state.isCameraOff = !state.isCameraOff;
    },
  },
});

export const {
  openCallModal,
  closeCallModal,
  setIncomingCall,
  setOngoingCall,
  setLocalStream,
  setRemoteStream,
  toggleMute,
  toggleCamera,
} = callSlice.actions;

export default callSlice.reducer;
