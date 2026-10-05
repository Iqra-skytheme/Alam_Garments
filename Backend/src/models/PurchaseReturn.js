import mongoose from 'mongoose';
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},supplierId:{type:mongoose.Schema.Types.ObjectId,ref:'Supplier',required:true},transactionId:{type:mongoose.Schema.Types.ObjectId,ref:'SupplierTransaction',required:true},item:String,quantity:Number,amount:{type:Number,required:true},date:{type:String,required:true},reference:String,notes:String},{timestamps:true});
export default mongoose.model('PurchaseReturn',schema);
