import mongoose from 'mongoose';
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},partyType:{type:String,enum:['Customer','Supplier'],required:true},partyId:{type:mongoose.Schema.Types.ObjectId,required:true},transactionId:{type:mongoose.Schema.Types.ObjectId,required:true},amount:{type:Number,required:true},method:{type:String,default:'Cash'},date:{type:String,required:true},reference:{type:String,default:''}},{timestamps:true});
export default mongoose.model('Payment',schema);
