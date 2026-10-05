import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,unique:true},
  name:{type:String,default:'Alam Garments'}, owner:{type:String,default:'Muhammad Ali'}, avatar:{type:String,default:''}, bio:{type:String,default:''}, location:{type:String,default:''}, countryCode:{type:String,default:'+92'}, phone:{type:String,default:''}, email:{type:String,default:''}, category:{type:String,default:'Garments & Clothing'}, currency:{type:String,default:'Rs.'}, taxNumber:{type:String,default:''}, reminderDays:{type:String,default:'15'}, creditLimit:{type:Number,default:50000}, whatsappReceipts:{type:Boolean,default:true}, smsReminders:{type:Boolean,default:true}, autoBackup:{type:Boolean,default:true}, emailjs:{serviceId:String,templateId:String,publicKey:String}
},{timestamps:true});
export default mongoose.model('ShopSettings',schema);
