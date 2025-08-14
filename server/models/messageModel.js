import mongoose from "mongoose";


const messageSchema = new  mongoose.Schema(
  {
  content: { type: String, required: true }, // message text
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User' }, // optional for one-to-one
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation',index: true, }, // for group/one-to-one
  timestamp: { type: Date, default: Date.now },
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  quotedContent: { type: String },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  reactions: {
      type: Map,
      of: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: {},
    },
    
  },
  { timestamps: true }
);

// Index for fast queries by conversation and sorting by time
messageSchema.index({ conversationId: 1, createdAt: -1 });
// Index for readBy (useful for unread count queries)
messageSchema.index({ readBy: 1 });
messageSchema.index({ reactions: 1, conversationId: 1 });
export default model("Message", messageSchema);