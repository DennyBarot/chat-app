import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        
    },
    username: {
        type: String,
        required: true,
        unique: true,
       
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },

   
    avatar:{ 
        type: String,
        required: true,
       
    },

    gender: {
        type: String,
        enum: ['male', 'female'],
        required: true,
    },

},{timestamps:true});
// Create indexes for fast lookups
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);
export default User;
