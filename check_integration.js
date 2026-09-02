const fs=require('fs');
try{
  const env=fs.readFileSync('.env','utf8');
  env.split('\n').forEach(l=>{
    l=l.trim(); if(!l||l.startsWith('#')) return;
    const i=l.indexOf('='); if(i===-1) return;
    const k=l.slice(0,i).trim(); let v=l.slice(i+1).trim();
    if(v.startsWith('"')&&v.endsWith('"')) v=v.slice(1,-1);
    if(!process.env[k]) process.env[k]=v;
  });
}catch{}
const { prisma } = require('./src/lib/db.ts');
