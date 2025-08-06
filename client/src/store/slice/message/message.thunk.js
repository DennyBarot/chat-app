import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../components/utilities/axiosInstance";

export const getConversationsThunk = createAsyncThunk(
    "message/getConversations",
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get("/messages/conversations");
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const getMessagesThunk = createAsyncThunk(
    "message/getMessages",
    async (conversationId, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/messages/${conversationId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const sendMessageThunk = createAsyncThunk(
    "message/sendMessage",
    async ({ conversationId, message }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(
                `/messages/send/${conversationId}`,
                { message }
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const markMessagesReadThunk = createAsyncThunk(
    "message/markMessagesRead",
    async ({ conversationId }, { rejectWithValue }) => {
        try {
            await axiosInstance.put(`/messages/read/${conversationId}`);
            return { conversationId };
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);