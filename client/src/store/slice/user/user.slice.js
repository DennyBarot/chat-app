import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  loginUserThunk,
  registerUserThunk,
  logoutUserThunk,
  getUserProfileThunk,
  updateUserProfileThunk,
  getOtherUsersThunk,
  getAllUsersThunk,
  forgotPasswordUserThunk,
} from './user.thunk';

// Helper: Safely get selectedUser from localStorage
const getInitialSelectedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('selectedUser')) || null;
  } catch (error) {
    localStorage.removeItem('selectedUser');
    return null;
  }
};

const initialState = {
  isAuthenticated: false,
  userProfile: null,
  isProfileLoading: false,
  isAuthenticating: false, // For login, register, etc.
  selectedUser: getInitialSelectedUser(),
  otherUsers: null,
  allUsers: null,
  // Per-action loading states (could use status enums for more detail)
  loginStatus: 'idle', // 'idle' | 'pending' | 'fulfilled' | 'rejected'
  registerStatus: 'idle',
  logoutStatus: 'idle',
  profileStatus: 'idle',
  updateStatus: 'idle',
  otherUsersStatus: 'idle',
  allUsersStatus: 'idle',
  forgotPasswordStatus: 'idle',
  // Optional: Track last error per action
  lastLoginError: null,
  lastRegisterError: null,
  // ...add others as needed
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setSelectedUser: (state, action) => {
      try {
        const user = action.payload;
        localStorage.setItem('selectedUser', JSON.stringify(user));
        state.selectedUser = user;
      } catch (error) {
        console.error('Failed to store selectedUser in localStorage', error);
      }
    },
    // Add other one-off reducers as needed (e.g., clearError)
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUserThunk.pending, (state) => {
        state.loginStatus = 'pending';
        state.lastLoginError = null;
      })
      .addCase(loginUserThunk.fulfilled, (state, action) => {
        state.loginStatus = 'fulfilled';
        state.userProfile = action.payload?.responseData?.user || null;
        state.isAuthenticated = true;
      })
      .addCase(loginUserThunk.rejected, (state, action) => {
        state.loginStatus = 'rejected';
        state.lastLoginError = action.payload;
      });

    // Register
    builder
      .addCase(registerUserThunk.pending, (state) => {
        state.registerStatus = 'pending';
        state.lastRegisterError = null;
      })
      .addCase(registerUserThunk.fulfilled, (state, action) => {
        state.registerStatus = 'fulfilled';
        // Optionally auto-login here if your backend returns user/token
      })
      .addCase(registerUserThunk.rejected, (state, action) => {
        state.registerStatus = 'rejected';
        state.lastRegisterError = action.payload;
      });

    // Logout
    builder
      .addCase(logoutUserThunk.pending, (state) => {
        state.logoutStatus = 'pending';
      })
      .addCase(logoutUserThunk.fulfilled, (state) => {
        state.logoutStatus = 'fulfilled';
        state.isAuthenticated = false;
        state.userProfile = null;
        state.selectedUser = null;
        state.otherUsers = null;
        state.allUsers = null;
        // Clear sensitive data from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('selectedUser');
        // Invalidate all loading states
        state.loginStatus = state.registerStatus = state.logoutStatus =
        state.profileStatus = state.updateStatus = state.otherUsersStatus =
        state.allUsersStatus = state.forgotPasswordStatus = 'idle';
      })
      .addCase(logoutUserThunk.rejected, (state) => {
        state.logoutStatus = 'rejected';
        // Still clear client-side state if logout API fails
        state.isAuthenticated = false;
        state.userProfile = null;
        state.selectedUser = null;
        state.otherUsers = null;
        state.allUsers = null;
        localStorage.removeItem('token');
        localStorage.removeItem('selectedUser');
      });

    // Get Profile
    builder
      .addCase(getUserProfileThunk.pending, (state) => {
        state.profileStatus = 'pending';
        state.isProfileLoading = true;
      })
      .addCase(getUserProfileThunk.fulfilled, (state, action) => {
        state.profileStatus = 'fulfilled';
        state.isProfileLoading = false;
        state.userProfile = action.payload?.responseData || null;
        state.isAuthenticated = true;
      })
      .addCase(getUserProfileThunk.rejected, (state, action) => {
        state.profileStatus = 'rejected';
        state.isProfileLoading = false;
        state.isAuthenticated = false;
        state.userProfile = null;
      });

    // Update Profile
    builder
      .addCase(updateUserProfileThunk.pending, (state) => {
        state.updateStatus = 'pending';
      })
      .addCase(updateUserProfileThunk.fulfilled, (state, action) => {
        state.updateStatus = 'fulfilled';
        state.userProfile = action.payload?.responseData?.user || action.payload || state.userProfile;
      })
      .addCase(updateUserProfileThunk.rejected, (state) => {
        state.updateStatus = 'rejected';
      });

    // Get Other Users
    builder
      .addCase(getOtherUsersThunk.pending, (state) => {
        state.otherUsersStatus = 'pending';
      })
      .addCase(getOtherUsersThunk.fulfilled, (state, action) => {
        state.otherUsersStatus = 'fulfilled';
        state.otherUsers = action.payload?.responseData || action.payload;
      })
      .addCase(getOtherUsersThunk.rejected, (state) => {
        state.otherUsersStatus = 'rejected';
      });

    // Get All Users
    builder
      .addCase(getAllUsersThunk.pending, (state) => {
        state.allUsersStatus = 'pending';
      })
      .addCase(getAllUsersThunk.fulfilled, (state, action) => {
        state.allUsersStatus = 'fulfilled';
        state.allUsers = action.payload?.responseData || action.payload;
      })
      .addCase(getAllUsersThunk.rejected, (state) => {
        state.allUsersStatus = 'rejected';
      });

    // Forgot Password
    builder
      .addCase(forgotPasswordUserThunk.pending, (state) => {
        state.forgotPasswordStatus = 'pending';
      })
      .addCase(forgotPasswordUserThunk.fulfilled, (state) => {
        state.forgotPasswordStatus = 'fulfilled';
      })
      .addCase(forgotPasswordUserThunk.rejected, (state) => {
        state.forgotPasswordStatus = 'rejected';
      });
  },
});

export const { setSelectedUser } = userSlice.actions;

// Memoized selectors
export const selectUserAuth = (state) => ({
  isAuthenticated: state.userReducer.isAuthenticated,
  userProfile: state.userReducer.userProfile,
});

export const selectOtherUsers = createSelector(
  (state) => state.userReducer.otherUsers,
  (users) => users || []
);

export const selectAllUsers = createSelector(
  (state) => state.userReducer.allUsers,
  (users) => users || []
);

// Loading/composite selectors as needed
export const selectLoginStatus = (state) => state.userReducer.loginStatus;
export const selectIsProfileLoading = (state) => state.userReducer.isProfileLoading;

export default userSlice.reducer;
