
import { createAsyncThunk } from '@reduxjs/toolkit';
import { setCall, setCaller, setCallerSignal, setReceiver } from './call.slice';

export const startCall = createAsyncThunk(
  'call/startCall',
  async ({ caller, receiver, signal }, { dispatch }) => {
    dispatch(setCaller(caller));
    dispatch(setReceiver(receiver));
    dispatch(setCallerSignal(signal));
    dispatch(setCall({ caller, receiver, signal }));
  }
);
