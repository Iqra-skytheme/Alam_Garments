import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';
import ShopSettings from '../models/ShopSettings.js';
import Customer from '../models/Customer.js';
import CustomerTransaction from '../models/CustomerTransaction.js';
import Supplier from '../models/Supplier.js';
import SupplierTransaction from '../models/SupplierTransaction.js';
import Purchase from '../models/Purchase.js';
import Payment from '../models/Payment.js';
import PurchaseReturn from '../models/PurchaseReturn.js';
import Inventory from '../models/Inventory.js';
import { today } from '../utils/normalize.js';
const r=express.Router();
const oid=(v)=>v;
const userId=req=>req.user._id;
const fail=(res,msg,code=400)=>res.status(code).json({message:msg});

// Keep supplier balances derived from the ledger so opening balances, purchases,
// payments and purchase returns remain consistent even for records created before
// this backend was installed.
async function syncSupplierFinancials(supplier) {
  const txns = await SupplierTransaction.find({
    userId: supplier.userId,
    supplierId: supplier._id
  }).lean();

  const opening = Number(supplier.openingBalance) || 0;
  let purchases = 0;
  let purchasePaid = 0;
  let payments = 0;
  let returns = 0;
  let adjustments = 0;

  for (const t of txns) {
    const debit = Number(t.debit) || 0;
    const credit = Number(t.credit) || 0;
    if (t.type === 'Opening Balance') continue;
    if (t.type === 'Purchase') {
      purchases += debit;
      purchasePaid += credit;
    } else if (t.type === 'Payment') {
      payments += credit;
    } else if (t.type === 'Purchase Return') {
      returns += credit;
    } else if (t.type === 'Adjustment') {
      adjustments += debit - credit;
    }
  }

  supplier.totalPurchases = Math.max(0, purchases - returns);
  supplier.totalPaid = purchasePaid + payments;
  supplier.currentBalance = Math.max(
    0,
    opening + purchases - purchasePaid - payments - returns + adjustments
  );
  await supplier.save();
  return supplier;
}

async function syncSuppliers(suppliers) {
  return Promise.all(suppliers.map((supplier) => syncSupplierFinancials(supplier)));
}

r.post('/auth/login', async(req,res)=>{const {identifier,pin}=req.body||{}; if(!identifier||!pin) return fail(res,'Phone/email and PIN are required'); const norm=String(identifier).replace(/\D/g,''); const emailNorm=String(identifier).trim().toLowerCase(); const users=await User.find(); const u=users.find(x=>x.phone.replace(/\D/g,'')===norm || (x.email||'').toLowerCase()===emailNorm); if(!u||!(await bcrypt.compare(String(pin),u.pinHash))) return fail(res,'Invalid mobile number or security PIN.',401); u.lastLogin=new Date(); await u.save(); const token=jwt.sign({id:u._id,role:u.role},(process.env.JWT_SECRET || 'hisabkitab-development-secret-change-me'),{expiresIn:'7d'}); const s=await ShopSettings.findOne({userId:u._id}); res.json({success:true,token,user:{id:u._id,ownerName:u.ownerName,shopName:u.shopName,phone:u.phone,role:u.role},shopInfo:s});});
r.get('/auth/me',auth,async(req,res)=>{const s=await ShopSettings.findOne({userId:userId(req)}); res.json({user:{id:req.user._id,ownerName:req.user.ownerName,shopName:req.user.shopName,phone:req.user.phone,email:req.user.email,role:req.user.role},shopInfo:s});});
r.put('/auth/profile',auth,async(req,res)=>{const {owner,name,phone,email,...rest}=req.body||{}; const u=req.user; if(owner!==undefined) u.ownerName=owner; if(name!==undefined) u.shopName=name; if(phone!==undefined) u.phone=phone; if(email!==undefined) u.email=email; await u.save(); let s=await ShopSettings.findOne({userId:u._id}); if(!s)s=new ShopSettings({userId:u._id}); Object.assign(s,rest,{owner:u.ownerName,name:u.shopName,phone:u.phone,email:u.email}); await s.save(); res.json({shopInfo:s});});
r.put('/auth/pin',auth,async(req,res)=>{const {currentPin,newPin}=req.body||{}; if(!currentPin||!newPin||String(newPin).length<4)return fail(res,'PIN must be at least 4 characters'); if(!(await bcrypt.compare(String(currentPin),req.user.pinHash)))return fail(res,'Current security PIN is incorrect.',401); req.user.pinHash=await bcrypt.hash(String(newPin),12); await req.user.save(); res.json({success:true,message:'Security PIN updated successfully'});});

r.get('/bootstrap',auth,async(req,res)=>{const id=userId(req); const [customers,suppliersRaw,transactions,supplierTransactions,settings,inventory]=await Promise.all([Customer.find({userId:id}).sort({createdAt:-1}),Supplier.find({userId:id}).sort({createdAt:-1}),CustomerTransaction.find({userId:id}).sort({date:-1,createdAt:-1}),SupplierTransaction.find({userId:id}).sort({date:-1,createdAt:-1}),ShopSettings.findOne({userId:id}),Inventory.find({userId:id}).sort({name:1})]); const suppliers=await syncSuppliers(suppliersRaw); res.json({customers,suppliers,transactions,supplierTransactions,shopInfo:settings,inventory});});

r.get('/customers',auth,async(req,res)=>res.json(await Customer.find({userId:userId(req)}).sort({createdAt:-1})));
r.post('/customers',auth,async(req,res)=>{const b=req.body||{}; const open=Number(b.openingBalance)||0; const c=await Customer.create({userId:userId(req),name:b.name,phone:b.phone,email:b.email||'',address:b.address||'',totalUdhaar:open,totalJama:0,balance:open,status:open>0?'Active':'Clear',lastTransactionDate:today()}); if(open>0){await CustomerTransaction.create({userId:userId(req),customerId:c._id,customerName:c.name,type:'Udhaar',amount:open,date:today(),description:'Opening Previous Udhaar Balance',paymentMethod:'Khata Credit',billNumber:`OB-${c._id.toString().slice(-8).toUpperCase()}`});} res.status(201).json(c);});
r.put('/customers/:id',auth,async(req,res)=>{const c=await Customer.findOneAndUpdate({_id:req.params.id,userId:userId(req)},{$set:req.body},{new:true,runValidators:true}); if(!c)return fail(res,'Customer not found',404); res.json(c);});
r.delete('/customers/:id',auth,async(req,res)=>{const c=await Customer.findOneAndDelete({_id:req.params.id,userId:userId(req)}); if(!c)return fail(res,'Customer not found',404); await CustomerTransaction.deleteMany({customerId:c._id,userId:userId(req)}); await Payment.deleteMany({partyType:'Customer',partyId:c._id,userId:userId(req)}); res.json({success:true});});
r.get('/customers/:id/transactions',auth,async(req,res)=>res.json(await CustomerTransaction.find({userId:userId(req),customerId:req.params.id}).sort({date:1,createdAt:1})));
r.post('/customers/:id/transactions',auth,async(req,res)=>{const c=await Customer.findOne({_id:req.params.id,userId:userId(req)}); if(!c)return fail(res,'Customer not found',404); const b=req.body||{}, amount=Number(b.amount); if(amount<=0)return fail(res,'Amount must be greater than zero'); const isU=b.type==='Udhaar'; const previous=Number(c.balance)||0; const updated=previous+(isU?amount:-amount); const bill=b.billNumber||`REC-${Date.now()}`; const exists=await CustomerTransaction.findOne({userId:userId(req),billNumber:bill}); if(exists)return fail(res,'Receipt number already exists'); const t=await CustomerTransaction.create({userId:userId(req),customerId:c._id,customerName:c.name,type:b.type,amount,date:b.date||today(),description:b.description||'',paymentMethod:b.paymentMethod||'Cash',billNumber:bill}); c.totalUdhaar=Number(c.totalUdhaar||0)+(isU?amount:0); c.totalJama=Number(c.totalJama||0)+(isU?0:amount); c.balance=updated; c.status=updated>0?'Active':'Clear'; c.lastTransactionDate=t.date; await c.save(); if(b.type==='Jama') await Payment.create({userId:userId(req),partyType:'Customer',partyId:c._id,transactionId:t._id,amount,method:b.paymentMethod||'Cash',date:t.date,reference:bill}); res.status(201).json({transaction:t,customer:c,previousBalance:previous,updatedBalance:updated});});

r.get('/suppliers',auth,async(req,res)=>{const suppliers=await Supplier.find({userId:userId(req)}).sort({createdAt:-1});res.json(await syncSuppliers(suppliers));});
r.post('/suppliers',auth,async(req,res)=>{const b=req.body||{},open=Number(b.openingBalance)||0; const s=await Supplier.create({userId:userId(req),name:b.name,phone:b.phone,email:b.email||'',address:b.address||'',openingBalance:open,currentBalance:open,totalPurchases:0,totalPaid:0,status:b.status||'Active',notes:b.notes||'',createdAt:today()}); if(open>0)await SupplierTransaction.create({userId:userId(req),supplierId:s._id,supplierName:s.name,type:'Opening Balance',date:today(),reference:`OB-${s._id.toString().slice(-8).toUpperCase()}`,description:'Opening payable balance brought forward',debit:open,credit:0,notes:'Initial balance'}); res.status(201).json(s);});
r.put('/suppliers/:id',auth,async(req,res)=>{const s=await Supplier.findOneAndUpdate({_id:req.params.id,userId:userId(req)},{$set:req.body},{new:true,runValidators:true});if(!s)return fail(res,'Supplier not found',404);res.json(s);});
r.patch('/suppliers/:id/status',auth,async(req,res)=>{const s=await Supplier.findOneAndUpdate({_id:req.params.id,userId:userId(req)},{$set:{status:req.body.status}},{new:true});if(!s)return fail(res,'Supplier not found',404);res.json(s);});
r.delete('/suppliers/:id',auth,async(req,res)=>{const s=await Supplier.findOneAndDelete({_id:req.params.id,userId:userId(req)});if(!s)return fail(res,'Supplier not found',404);await SupplierTransaction.deleteMany({supplierId:s._id,userId:userId(req)});await Purchase.deleteMany({supplierId:s._id,userId:userId(req)});await PurchaseReturn.deleteMany({supplierId:s._id,userId:userId(req)});await Payment.deleteMany({partyType:'Supplier',partyId:s._id,userId:userId(req)});res.json({success:true});});
r.get('/suppliers/:id/transactions',auth,async(req,res)=>res.json(await SupplierTransaction.find({userId:userId(req),supplierId:req.params.id}).sort({date:1,createdAt:1})));
r.post('/suppliers/:id/purchases',auth,async(req,res)=>{const b=req.body||{},s=await Supplier.findOne({_id:req.params.id,userId:userId(req)});if(!s)return fail(res,'Supplier not found',404);await syncSupplierFinancials(s);const qty=Number(b.quantity),price=Number(b.purchasePrice),total=qty*price,paid=Math.min(Number(b.amountPaid)||0,total),remaining=total-paid,reference=b.reference||`PO-${s._id.toString().slice(-6).toUpperCase()}-${Date.now().toString().slice(-5)}`,previous=Number(s.currentBalance)||0,updated=previous+remaining;const t=await SupplierTransaction.create({userId:userId(req),supplierId:s._id,supplierName:s.name,type:'Purchase',date:b.date||today(),reference,description:b.item||'Purchase',debit:total,credit:paid,paymentMethod:null,item:b.item,quantity:qty,purchasePrice:price,totalAmount:total,amountPaid:paid,remainingAmount:remaining,paymentStatus:paid>=total?'Paid':paid>0?'Partially Paid':'Unpaid',notes:b.notes||''});s.currentBalance=updated;await s.save();await Purchase.create({userId:userId(req),supplierId:s._id,transactionId:t._id,item:b.item,quantity:qty,purchasePrice:price,totalAmount:total,amountPaid:paid,remainingAmount:remaining,date:t.date});let inv=await Inventory.findOne({userId:userId(req),name:b.item.trim()});if(!inv)inv=new Inventory({userId:userId(req),name:b.item.trim()});inv.quantity=Number(inv.quantity||0)+qty;inv.totalCost=Number(inv.totalCost||0)+total;inv.averageCost=inv.quantity?inv.totalCost/inv.quantity:0;await inv.save();await syncSupplierFinancials(s);res.status(201).json({transaction:t,supplier:s,previousBalance:previous,updatedBalance:s.currentBalance});});
r.post('/suppliers/:id/payments',auth,async(req,res)=>{const b=req.body||{},s=await Supplier.findOne({_id:req.params.id,userId:userId(req)});if(!s)return fail(res,'Supplier not found',404);await syncSupplierFinancials(s);const amount=Number(b.amount);if(amount<=0)return fail(res,'Payment amount must be greater than zero');if(amount>Number(s.currentBalance||0))return fail(res,`Payment exceeds outstanding supplier balance of ${Number(s.currentBalance||0).toLocaleString()}`);const previous=Number(s.currentBalance)||0,updated=Math.max(0,previous-amount),reference=b.reference||`PMT-${s._id.toString().slice(-6).toUpperCase()}-${Date.now().toString().slice(-5)}`;const t=await SupplierTransaction.create({userId:userId(req),supplierId:s._id,supplierName:s.name,type:'Payment',date:b.date||today(),reference,description:`Payment via ${b.paymentMethod||'Cash'}`,debit:0,credit:amount,paymentMethod:b.paymentMethod||'Cash',amountPaid:amount,notes:b.notes||''});s.currentBalance=updated;await s.save();await Payment.create({userId:userId(req),partyType:'Supplier',partyId:s._id,transactionId:t._id,amount,method:b.paymentMethod||'Cash',date:t.date,reference});await syncSupplierFinancials(s);res.status(201).json({transaction:t,supplier:s,previousBalance:previous,updatedBalance:s.currentBalance});});
r.post('/suppliers/:id/returns',auth,async(req,res)=>{const b=req.body||{},s=await Supplier.findOne({_id:req.params.id,userId:userId(req)});if(!s)return fail(res,'Supplier not found',404);await syncSupplierFinancials(s);const amount=Number(b.amount);if(amount<=0)return fail(res,'Return amount must be greater than zero');const previous=Number(s.currentBalance)||0;if(amount>previous)return fail(res,'Purchase return cannot exceed the outstanding supplier balance');const updated=Math.max(0,previous-amount),reference=b.reference||`RET-${s._id.toString().slice(-6).toUpperCase()}-${Date.now().toString().slice(-5)}`;const t=await SupplierTransaction.create({userId:userId(req),supplierId:s._id,supplierName:s.name,type:'Purchase Return',date:b.date||today(),reference,description:b.item||'Purchase Return',debit:0,credit:amount,item:b.item||null,quantity:Number(b.quantity)||null,notes:b.notes||''});s.currentBalance=updated;await s.save();await PurchaseReturn.create({userId:userId(req),supplierId:s._id,transactionId:t._id,item:b.item||'',quantity:Number(b.quantity)||0,amount,date:t.date,reference,notes:b.notes||''});if(b.item){const inv=await Inventory.findOne({userId:userId(req),name:b.item.trim()});if(inv){inv.quantity=Math.max(0,Number(inv.quantity||0)-Number(b.quantity||0));inv.totalCost=Math.max(0,Number(inv.totalCost||0)-amount);inv.averageCost=inv.quantity?inv.totalCost/inv.quantity:0;await inv.save();}}await syncSupplierFinancials(s);res.status(201).json({transaction:t,supplier:s,previousBalance:previous,updatedBalance:s.currentBalance});});

r.get('/inventory',auth,async(req,res)=>res.json(await Inventory.find({userId:userId(req)}).sort({name:1})));
r.get('/dashboard',auth,async(req,res)=>{const id=userId(req);const [customers,suppliersRaw,transactions,supplierTransactions]=await Promise.all([Customer.find({userId:id}),Supplier.find({userId:id}),CustomerTransaction.find({userId:id}).sort({date:-1,createdAt:-1}).limit(50),SupplierTransaction.find({userId:id}).sort({date:-1,createdAt:-1}).limit(50)]);const suppliers=await syncSuppliers(suppliersRaw);res.json({customers,suppliers,transactions,supplierTransactions});});
r.get('/reports',auth,async(req,res)=>{const id=userId(req);const [customers,suppliersRaw,transactions,supplierTransactions]=await Promise.all([Customer.find({userId:id}),Supplier.find({userId:id}),CustomerTransaction.find({userId:id}).sort({date:1}),SupplierTransaction.find({userId:id}).sort({date:1})]);const suppliers=await syncSuppliers(suppliersRaw);res.json({customers,suppliers,transactions,supplierTransactions});});
r.get('/settings',auth,async(req,res)=>{let s=await ShopSettings.findOne({userId:userId(req)});res.json(s);});
r.put('/settings',auth,async(req,res)=>{let s=await ShopSettings.findOne({userId:userId(req)});if(!s)s=new ShopSettings({userId:userId(req)});Object.assign(s,req.body);s.userId=userId(req);await s.save();res.json(s);});
export default r;
