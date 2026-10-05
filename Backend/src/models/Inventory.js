import mongoose from 'mongoose';
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},name:{type:String,required:true,trim:true},quantity:{type:Number,default:0},totalCost:{type:Number,default:0},averageCost:{type:Number,default:0}},{timestamps:true});
schema.index({userId:1,name:1},{unique:true}); export default mongoose.model('Inventory',schema);
