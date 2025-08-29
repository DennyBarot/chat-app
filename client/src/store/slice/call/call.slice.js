
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  call: null,
  peer: null,
  stream: null,
  callAccepted: false,
  callEnded: false,
  caller: '',
  receiver: '',
  callerSignal: null,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    setCall: (state, action) => {
      state.call = action.payload;
    },
    setPeer: (state, action) => {
      state.peer = action.payload;
    },
    setStream: (state, action) => {
      state.stream = action.payload;
    },
    setCallAccepted: (state, action) => {
      state.callAccepted = action.payload;
    },
    setCallEnded: (state, action) => {
      state.callEnded = action.payload;
    },
    setCaller: (state, action) => {
      state.caller = action.payload;
    },
    setReceiver: (state, action) => {
      state.receiver = action.payload;
    },
    setCallerSignal: (state, action) => {
      state.callerSignal = action.payload;
    },
  },
});

export const {
  setCall,
  setPeer,
  setStream,
  setCallAccepted,
  setCallEnded,
  setCaller,
  setReceiver,
  setCallerSignal,
} = callSlice.actions;

export default callSlice.reducer;
