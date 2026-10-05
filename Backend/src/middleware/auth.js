import jwt from 'jsonwebtoken';
import User from '../models/User.js';
export async function auth(req,res,next){
  try{const h=req.headers.authorization||''; const token=h.startsWith('Bearer ')?h.slice(7):null; if(!token) return res.status(401).json({message:'Authentication required'}); const p=jwt.verify(token,process.env.JWT_SECRET); const user=await User.findById(p.id); if(!user) return res.status(401).json({message:'Invalid session'}); req.user=user; next();}catch(e){return res.status(401).json({message:'Invalid or expired token'});}
}
