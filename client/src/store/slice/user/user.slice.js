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
  success: false,
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
    // Login
 builder
      .addCase(loginUserThunk.pending, (state) => {
        state.buttonLoading = true;
      })
      .addCase(loginUserThunk.fulfilled, (state, { payload }) => {
      
        state.userProfile = payload?.responseData || payload;
        state.isAuthenticated = true;
        state.buttonLoading = false;
      })
      .addCase(loginUserThunk.rejected, (state) => {
        state.buttonLoading = false;
      });

    // Register
       builder
      .addCase(registerUserThunk.pending, (state) => {
        state.buttonLoading = true;
      })
      .addCase(registerUserThunk.fulfilled, (state) => {
        state.buttonLoading = false;
      })
      .addCase(registerUserThunk.rejected, (state) => {
        state.buttonLoading = false;
      });
         // --- Logout ---
    builder
      .addCase(logoutUserThunk.pending, (state) => {
        state.buttonLoading = true;
      })
      .addCase(logoutUserThunk.fulfilled, (state) => {
        state.buttonLoading = false;
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
      })
      .addCase(logoutUserThunk.rejected, (state) => {
        state.buttonLoading = false;
      });

   // --- Forgot Password ---
    builder
      .addCase(forgotPasswordUserThunk.pending, (state) => {
        state.buttonLoading = true;
        state.success = false;
      })
      .addCase(forgotPasswordUserThunk.fulfilled, (state) => {
        state.buttonLoading = false;
        state.success = true;
      })
      .addCase(forgotPasswordUserThunk.rejected, (state) => {
        state.buttonLoading = false;
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

