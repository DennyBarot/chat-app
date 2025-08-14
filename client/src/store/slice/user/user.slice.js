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
} from './user.thunk.js';

const getInitialSelectedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('selectedUser'));
  } catch (e) {
    return null;
  }
};

const initialState = {
  isAuthenticated: false,
  userProfile: null,
  otherUsers: null,
  allUsers: null,
  selectedUser: getInitialSelectedUser(),
  buttonLoading: false,
  screenLoading: true,
  // Optional: Add more state as needed, e.g., online status, error, etc.
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Persist selected user to local storage (only safe data, not functions)
    setSelectedUser: (state, { payload }) => {
      try {
        localStorage.setItem('selectedUser', JSON.stringify(payload));
      } catch (e) {
        console.error('Failed to set selectedUser in localStorage:', e);
      }
      state.selectedUser = payload;
    },
    setScreenLoadingFalse: (state) => {
      state.screenLoading = false;
    },
  },
  extraReducers: (builder) => {
    // Helper for async loading states
    const handleAsyncState = (pending, fulfilled, rejected) => {
      builder
        .addCase(pending, (state) => {
          state.buttonLoading = true;
        })
        .addCase(fulfilled, (state, { payload }) => {
          state.buttonLoading = false;
        })
        .addCase(rejected, (state) => {
          state.buttonLoading = false;
        });
    };

    // Login
    handleAsyncState(loginUserThunk.pending, loginUserThunk.fulfilled, loginUserThunk.rejected);
    builder.addCase(loginUserThunk.fulfilled, (state, { payload }) => {
      // Use payload.responseData.user or payload.responseData, not both
      state.userProfile = payload?.responseData?.user || payload?.responseData;
      state.isAuthenticated = true;
    });

    // Register
    handleAsyncState(registerUserThunk.pending, registerUserThunk.fulfilled, registerUserThunk.rejected);

    // Logout
    handleAsyncState(logoutUserThunk.pending, logoutUserThunk.fulfilled, logoutUserThunk.rejected);
    builder.addCase(logoutUserThunk.fulfilled, (state) => {
      state.isAuthenticated = false;
      state.userProfile = null;
      state.selectedUser = null;
      state.otherUsers = null;
      state.allUsers = null;
      try {
        localStorage.clear();
      } catch (e) {
        console.error('Failed to clear localStorage:', e);
      }
    });

    // Forgot Password
    handleAsyncState(forgotPasswordUserThunk.pending, forgotPasswordUserThunk.fulfilled, forgotPasswordUserThunk.rejected);
    builder.addCase(forgotPasswordUserThunk.fulfilled, (state, { payload }) => {
      state.success = true;
    });
    builder.addCase(forgotPasswordUserThunk.rejected, (state) => {
      state.success = false;
    });

    // Get User Profile
    builder.addCase(getUserProfileThunk.pending, (state) => {
      state.screenLoading = true;
    });
    builder.addCase(getUserProfileThunk.fulfilled, (state, { payload }) => {
      state.userProfile = payload?.responseData?.user || payload?.responseData;
      state.isAuthenticated = true;
      state.screenLoading = false;
    });
    builder.addCase(getUserProfileThunk.rejected, (state) => {
      state.screenLoading = false;
    });

    // Update Profile
    builder.addCase(updateUserProfileThunk.fulfilled, (state, { payload }) => {
      const data = payload?.responseData?.user || payload?.responseData;
      if (state.userProfile?._id === data?._id) {
        state.userProfile = data;
      } else {
        window.location.reload(); // Optional: Force refresh if profile IDs don't match (edge case)
      }
    });

    // Get Other Users (non-self)
    builder.addCase(getOtherUsersThunk.pending, (state) => {
      state.screenLoading = true;
    });
    builder.addCase(getOtherUsersThunk.fulfilled, (state, { payload }) => {
      state.otherUsers = payload?.responseData;
      state.screenLoading = false;
    });
    builder.addCase(getOtherUsersThunk.rejected, (state) => {
      state.screenLoading = false;
    });

    // Get All Users (including self)
    builder.addCase(getAllUsersThunk.pending, (state) => {
      state.screenLoading = true;
    });
    builder.addCase(getAllUsersThunk.fulfilled, (state, { payload }) => {
      state.allUsers = payload?.responseData;
      state.screenLoading = false;
    });
    builder.addCase(getAllUsersThunk.rejected, (state) => {
      state.screenLoading = false;
    });
  },
});

export const { setSelectedUser, setScreenLoadingFalse } = userSlice.actions;

// Memoized selectors
export const selectAllUsers = createSelector(
  (state) => state.userReducer.allUsers,
  (allUsers) => allUsers || []
);

export default userSlice.reducer;

