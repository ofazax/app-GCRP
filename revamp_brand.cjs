const fs = require('fs');

const transformFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Substituir os tons azuis pelos exatos da logo (Verde Folha + Ciano Gota)
  
  // 1. Trocar o gradiente base para Verde -> Ciano (imita a barra da assinatura e a logo)
  content = content.replace(/from-blue-600/g, 'from-[#8cc63f]'); // Verde limão
  content = content.replace(/to-cyan-400/g, 'to-[#00aeef]'); // Azul ciano da gota
  content = content.replace(/from-blue-400/g, 'from-[#8cc63f]'); // Verde texto GCRP
  content = content.replace(/to-sky-300/g, 'to-[#00aeef]'); 
  
  // 2. Fundo escurão baseado na fonte "REVITALIZA" (teal super escuro)
  // Atualmente está bg-slate-900, vamos mudar para um Dark Teal
  content = content.replace(/bg-slate-900/g, 'bg-[#002836]'); 
  
  // 3. Botões e detalhes
  // Onde for blue-600 (que eu tinha usado pra botão), agora será o Azul da Gota
  content = content.replace(/bg-blue-600\/80/g, 'hover:bg-[#00aeef]/80');
  content = content.replace(/bg-blue-600/g, 'bg-[#00aeef]');
  content = content.replace(/bg-blue-700/g, 'bg-[#00aeef]/80');
  
  // 4. Efeitos e brilhos de background
  content = content.replace(/bg-blue-600\/20/g, 'bg-[#8cc63f]/20'); 
  content = content.replace(/bg-sky-500\/10/g, 'bg-[#00aeef]/15'); 
  
  // 5. Trocar o ícone Waves por Droplet (Gota, idêntica à da logo)
  if (filePath.includes('Login.tsx')) {
    content = content.replace(/Waves/g, 'Droplet');
  }

  // Alguns sky-400/500 (textos e highlights) vão puxar pro ciano
  content = content.replace(/text-sky-400/g, 'text-[#00aeef]');
  content = content.replace(/border-sky-500/g, 'border-[#00aeef]');
  content = content.replace(/ring-sky-500/g, 'ring-[#00aeef]');
  content = content.replace(/bg-sky-500/g, 'bg-[#00aeef]');
  
  fs.writeFileSync(filePath, content);
};

transformFile('src/AdminDashboard.tsx');
transformFile('src/Login.tsx');

