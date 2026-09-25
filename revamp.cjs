const fs = require('fs');

const transformFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Cores Base
  content = content.replace(/#283d3e/g, '#0f172a'); // slate-900
  content = content.replace(/#48586f/g, '#3b82f6'); // blue-500
  content = content.replace(/#d6c496/g, '#0ea5e9'); // sky-500
  content = content.replace(/#d62e2e/g, '#e11d48'); // rose-600
  content = content.replace(/#ffffc0/g, '#ffffff'); // white
  content = content.replace(/#ff7878/g, '#fb7185'); // rose-400
  
  // Padronização e vibração
  content = content.replace(/bg-\[\#0f172a\]/g, 'bg-slate-900');
  content = content.replace(/bg-\[\#3b82f6\]/g, 'bg-blue-600');
  content = content.replace(/bg-\[\#3b82f6\]\/80/g, 'bg-blue-700');
  content = content.replace(/text-\[\#0ea5e9\]/g, 'text-sky-400');
  content = content.replace(/bg-\[\#0ea5e9\]/g, 'bg-sky-500');
  content = content.replace(/border-\[\#0ea5e9\]/g, 'border-sky-500');
  content = content.replace(/ring-\[\#0ea5e9\]/g, 'ring-sky-500');
  content = content.replace(/bg-\[\#e11d48\]/g, 'bg-rose-500');
  content = content.replace(/text-\[\#e11d48\]/g, 'text-rose-500');
  content = content.replace(/border-\[\#e11d48\]/g, 'border-rose-500');
  content = content.replace(/text-\[\#ffffff\]/g, 'text-white');
  content = content.replace(/from-\[\#3b82f6\]/g, 'from-blue-600');
  content = content.replace(/to-\[\#0ea5e9\]/g, 'to-cyan-400');
  
  // Trocando os nomes e ícones no Login
  if (filePath.includes('Login.tsx')) {
    content = content.replace(/ClipboardList/g, 'Waves'); // import e component
    content = content.replace(/Gestǜo RevitaPamp/g, 'GCRP');
    content = content.replace(/Gestão RevitaPamp/g, 'GCRP');
    content = content.replace(/<p className="text-sky-400 text-sm mt-1">Faa login para continuar<\/p>/g, '<p className="text-sky-400 text-sm mt-1 font-medium text-center">Gestão Consórcio Revitaliza Pampulha<br/><span className="text-white/50 text-xs font-normal">Faça login para continuar</span></p>');
    content = content.replace(/Faa login para continuar/g, 'Faça login para continuar');
    content = content.replace(/Usuǭrio/g, 'Usuário');
    content = content.replace(/invǭlidos/g, 'inválidos');
    content = content.replace(/conexǜo/g, 'conexão');
  }

  // Trocando os nomes no AdminDashboard
  if (filePath.includes('AdminDashboard.tsx')) {
    content = content.replace(/Painel de Administração/g, 'GCRP');
    content = content.replace(/<p className="text-sky-400 text-sm truncate">Olá, \{adminName\}<\/p>/g, '<p className="text-sky-400 text-sm truncate font-medium">Gestão Consórcio Revitaliza Pampulha</p><p className="text-white/60 text-xs truncate mt-0.5">Operador: {adminName}</p>');
    content = content.replace(/Usuǭrio/g, 'Usuário');
    content = content.replace(/Endereo/g, 'Endereço');
    content = content.replace(/Cadsnico/g, 'CadÚnico');
    content = content.replace(/Adesǜo/g, 'Adesão');
  }

  fs.writeFileSync(filePath, content);
};

transformFile('src/AdminDashboard.tsx');
transformFile('src/Login.tsx');
