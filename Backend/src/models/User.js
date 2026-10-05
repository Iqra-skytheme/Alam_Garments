import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  ownerName:{type:String,required:true,trim:true}, shopName:{type:String,required:true,trim:true},
  phone:{type:String,required:true,unique:true,trim:true}, email:{type:String,trim:true,lowercase:true},
  pinHash:{type:String,required:true}, role:{type:String,default:'owner'}, lastLogin:Date
},{timestamps:true});
export default mongoose.model('User',userSchema);
