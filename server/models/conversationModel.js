import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
    participants: [
       {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
       }
    ],
    
    messages: [
        { 
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        }
    ],
    unreadCounts: {  // New field
      type: Map,
      of: Number,
      default: {},
    },
  
},
    { timestamps: true })

export default mongoose.model("Conversation", conversationSchema);