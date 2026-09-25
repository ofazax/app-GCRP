
const fs = require('fs');
const files = ['src/AdminDashboard.tsx', 'src/Login.tsx'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/text-white\/80/g, 'text-[#ffffc0]/90');
  content = content.replace(/text-white\/60/g, 'text-[#ffffc0]/70');
  
  content = content.replace(/font-bold/g, 'font-bold text-[#ffffc0]');
  content = content.replace(/font-medium text-white\\/80/g, 'font-medium text-[#ffffc0]');
  
  content = content.replace(/text-\\[#ffffc0\\] text-\\[#ffffc0\\]/g, 'text-[#ffffc0]');
  
  fs.writeFileSync(file, content);
  console.log('Polished', file);
});

