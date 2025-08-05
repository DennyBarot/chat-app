import mongoose from "mongoose";

const { Schema, model } = mongoose;

const messageSchema = new Schema(
  {
    content: { type: String, required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User' },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    timestamp: { type: Date, default: Date.now },
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    quotedContent: { type: String },
    // New fields for read tracking
    readBy: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      readAt: { type: Date, default: Date.now }
    }],
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Index for efficient unread count queries
messageSchema.index({ conversationId: 1, senderId: 1, 'readBy.userId': 1 });

export default model("Message", messageSchema);
