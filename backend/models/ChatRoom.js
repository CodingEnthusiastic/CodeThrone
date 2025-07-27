import mongoose from "mongoose"

console.log("📋 Loading ChatRoom model...")

const chatRoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ["general", "help", "contest", "interview", "private"],
      default: "general",
    },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isPrivate: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastActivity: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

console.log("✅ ChatRoom model schema defined")

export default mongoose.model("ChatRoom", chatRoomSchema)
