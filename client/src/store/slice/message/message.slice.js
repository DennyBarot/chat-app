import { createSlice } from "@reduxjs/toolkit";
import { getMessageThunk, sendMessageThunk, getConversationsThunk, getOtherUsersThunk, createConversationThunk } from "./message.thunk";

const initialState = {
  buttonLoading: false,
  screenLoading: false,
  messages: [], // Initialize as empty array
  conversations: [],
  otherUsers: [],
  sendMessageStatus: 'idle',
  selectedConversation: null, // Added for context in addReceivedWebRTCAudioMessage
};

export const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    clearMessages: (state) => {
      state.messages = [];
    }, 
    setNewMessage: (state, action) => {
      const oldMessages = state.messages ?? [];
      const messageExists = oldMessages.some(msg => msg._id === action.payload._id);
      if (!messageExists) {
        state.messages = [...oldMessages, action.payload];
      }
    },
    messagesRead: (state, action) => {
      const { messageIds, readBy, readAt } = action.payload;
      if (!state.messages || !messageIds) return;

      state.messages = state.messages.map(msg => {
        if (messageIds.includes(msg._id)) {
          const newReadBy = msg.readBy ? [...msg.readBy] : [];
          if (!newReadBy.includes(readBy)) {
            newReadBy.push(readBy);
          }
          return { ...msg, readBy: newReadBy, updatedAt: readAt };
        }
        return msg;
      });
    },
    updateSingleConversation: (state, action) => {
        const updatedConversation = action.payload;
        const index = state.conversations.findIndex(c => c._id === updatedConversation._id);

        if (index !== -1) {
            state.conversations = [
                ...state.conversations.slice(0, index),
                updatedConversation,
                ...state.conversations.slice(index + 1),
            ];
        } else {
            state.conversations = [updatedConversation, ...state.conversations];
        }
    },
    // NEW REDUCER for adding received WebRTC audio messages
    addReceivedWebRTCAudioMessage: (state, action) => {
      const { senderId, audioBlob, audioDuration } = action.payload;
      // Create a unique URL for the audio blob
      const audioUrl = URL.createObjectURL(audioBlob);

      // Construct a new message object similar to how server-sent messages are structured
      const newMessage = {
        _id: `webrtc-${Date.now()}-${Math.random()}`, // Unique client-side ID
        senderId: senderId,
        // Determine receiver based on current selected conversation participants
        receiverId: state.selectedConversation?.participants.find(p => p._id !== senderId)?._id || null,
        conversationId: state.selectedConversation?._id || null,
        content: '[Voice Message]', // Display text
        isAudioMessage: true,
        audioUrl: audioUrl, // Store the object URL
        audioDuration: audioDuration,
        sentViaWebRTC: true, // Flag to indicate it was WebRTC
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        readBy: [], // Initially not read by anyone
      };
      state.messages.push(newMessage);
    },
    // Add a reducer to set the selected conversation for context
    setSelectedConversation: (state, action) => {
      state.selectedConversation = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(sendMessageThunk.pending, (state) => {
      state.buttonLoading = true;
      state.sendMessageStatus = 'pending';
    });
    // The message is added via socket (setNewMessage), so we only need to handle loading state here
    // and ensure we don't duplicate if it's already added by setNewMessage
    builder.addCase(sendMessageThunk.fulfilled, (state, action) => {
      state.buttonLoading = false;
      state.sendMessageStatus = 'fulfilled';
      // If the message was sent via WebRTC, it's already added by setNewMessage
      // if the socket event fires quickly. Otherwise, add it here.
      const newMessage = action.payload.responseData;
      if (newMessage && !state.messages.some(msg => msg._id === newMessage._id)) {
        state.messages.push(newMessage);
      }
    });
    builder.addCase(sendMessageThunk.rejected, (state) => {
      state.buttonLoading = false;
      state.sendMessageStatus = 'rejected';
    });

    // get messages
    builder.addCase(getMessageThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(getMessageThunk.fulfilled, (state, action) => {
      const { messages: fetchedMessages, currentPage } = action.payload;
      if (currentPage === 1) {
        state.messages = fetchedMessages || [];
      } else {
        const existingMessages = state.messages || [];
        const uniqueNewMessages = fetchedMessages.filter(
          (newMessage) => !existingMessages.some((existing) => existing._id === newMessage._id)
        );
        state.messages = [...uniqueNewMessages, ...existingMessages];
      }
      state.buttonLoading = false;
    });
    builder.addCase(getMessageThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    // get conversations (only for initial load now)
    builder.addCase(getConversationsThunk.fulfilled, (state, action) => {
      state.conversations = action.payload?.responseData ?? [];
    });

    // get other users
    builder.addCase(getOtherUsersThunk.fulfilled, (state, action) => {
      state.otherUsers = action.payload?.responseData ?? [];
    });

    // create conversation
    builder.addCase(createConversationThunk.fulfilled, (state, action) => {
      const newConversation = action.payload;
      const index = state.conversations.findIndex(c => c._id === newConversation._id);
      if (index === -1) {
        state.conversations = [newConversation, ...state.conversations];
      }
    });
  },
});

// Export the new action
export const { setNewMessage, messagesRead, updateSingleConversation, clearMessages, addReceivedWebRTCAudioMessage, setSelectedConversation } = messageSlice.actions;

export default messageSlice.reducer;
