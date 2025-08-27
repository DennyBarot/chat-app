import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  getOtherUsersThunk,
  getUserProfileThunk,
  loginUserThunk,
  logoutUserThunk,
  registerUserThunk,
  forgotPasswordUserThunk,
  getAllUsersThunk,
  updateUserProfileThunk,
} from './user.thunk';
//
const initialState = {
  isAuthenticated: false,
  userProfile: null,
  otherUsers: null,
  allUsers: null,
  selectedUser: JSON.parse(localStorage.getItem('selectedUser')),
  buttonLoading: false,
  screenLoading: true,
  userStatus: {}, // Track online status of users { userId: { isOnline, lastSeen, isRecording, isInCall } }
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setSelectedUser: (state, action) => {
      localStorage.setItem('selectedUser', JSON.stringify(action.payload));
      state.selectedUser = action.payload;
    },
    setScreenLoadingFalse: (state) => {
      state.screenLoading = false;
    },
    updateUserStatus: (state, action) => {
      const { userId, isOnline, lastSeen, isRecording, isInCall } = action.payload;
      const currentStatus = state.userStatus[userId] || {};
      state.userStatus[userId] = { 
        ...currentStatus,
        isOnline: isOnline !== undefined ? isOnline : currentStatus.isOnline,
        lastSeen: lastSeen || currentStatus.lastSeen,
        isRecording: isRecording !== undefined ? isRecording : currentStatus.isRecording,
        isInCall: isInCall !== undefined ? isInCall : currentStatus.isInCall
      };
    },
    updateUsersStatus: (state, action) => {
      const statusUpdates = action.payload;
      Object.entries(statusUpdates).forEach(([userId, status]) => {
        state.userStatus[userId] = status;
      });
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loginUserThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(loginUserThunk.fulfilled, (state, action) => {
      state.userProfile = action.payload?.responseData?.user;
      state.isAuthenticated = true;
      state.buttonLoading = false;
    });
    builder.addCase(loginUserThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(forgotPasswordUserThunk.pending, (state) => {
      state.buttonLoading = true;
      state.success = false;
    });
    builder.addCase(forgotPasswordUserThunk.fulfilled, (state) => {
      state.buttonLoading = false;
      state.success = true;
    });
    builder.addCase(forgotPasswordUserThunk.rejected, (state) => {
      state.buttonLoading = false;
      state.success = false;
    });

    builder.addCase(registerUserThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(registerUserThunk.fulfilled, (state, action) => {
      state.buttonLoading = false;
    });
    builder.addCase(registerUserThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(logoutUserThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(logoutUserThunk.fulfilled, (state) => {
      state.userProfile = null;
      state.selectedUser = null;
      state.otherUsers = null;
      state.allUsers = null;
      state.isAuthenticated = false;
      state.buttonLoading = false;
      localStorage.clear();
    });
    builder.addCase(logoutUserThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(getUserProfileThunk.pending, (state) => {
      state.screenLoading = true;
    });
    builder.addCase(getUserProfileThunk.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.screenLoading = false;
      state.userProfile = action.payload?.responseData;
    });
    builder.addCase(getUserProfileThunk.rejected, (state) => {
      state.screenLoading = false;
    });

    builder.addCase(updateUserProfileThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(updateUserProfileThunk.fulfilled, (state, action) => {
      state.userProfile = action.payload?.responseData?.user;
      state.buttonLoading = false;
    });
    builder.addCase(updateUserProfileThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(getOtherUsersThunk.pending, (state) => {
      state.screenLoading = true;
    });
    builder.addCase(getOtherUsersThunk.fulfilled, (state, action) => {
      state.screenLoading = false;
      state.otherUsers = action.payload?.responseData;
    });
    builder.addCase(getOtherUsersThunk.rejected, (state) => {
      state.screenLoading = false;
    });

    builder.addCase(getAllUsersThunk.pending, (state) => {
      state.screenLoading = true;
    });
    builder.addCase(getAllUsersThunk.fulfilled, (state, action) => {
      state.screenLoading = false;
      state.allUsers = action.payload?.responseData;
    });
    builder.addCase(getAllUsersThunk.rejected, (state) => {
      state.screenLoading = false;
    });
  },
});

export const { setSelectedUser, updateUserStatus, updateUsersStatus } = userSlice.actions;


export const selectAllUsers = createSelector(
  (state) => state.userReducer.allUsers,
  (allUsers) => allUsers || []
);

export default userSlice.reducer;
