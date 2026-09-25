import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, UserPlus, Trash2, LogOut, Loader2, List, X, Image as ImageIcon, MapPin } from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
  adminName: string;
  adminRole: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, adminName, adminRole }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('colaborador');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [selectedSubmissionForImages, setSelectedSubmissionForImages] = useState<any>(null);

  const fetchUsers = async () => {
    try {
      const webhookUrl = import.meta.env.VITE_PA_API_WEBHOOK_URL;
      if (!webhookUrl || webhookUrl.includes('COLE_AQUI')) {
         setIsLoading(false);
         return;
      }
      
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "LIST_USERS" })
      });
      if (!response.ok) throw new Error('Erro HTTP ' + response.status);
      const data = await response.json();
      if (data && Array.isArray(data)) {
        const normalizedUsers = data.map(u => ({
          ...u,
          role: typeof u.role === 'object' && u.role?.Value ? u.role.Value : u.role
        }));
        setUsers(normalizedUsers);
      }
    } catch (err: any) {
      console.error(err);
      alert("🚨 ERRO AO LISTAR: " + err.message + "\n\nChecando Webhook (Primeiros 40 caracteres):\n" + String(import.meta.env.VITE_PA_API_WEBHOOK_URL).substring(0, 40));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsCreating(true);

    try {
      const webhookUrl = import.meta.env.VITE_PA_API_WEBHOOK_URL;
      if (!webhookUrl || webhookUrl.includes('COLE_AQUI')) {
        setErrorMsg('Webhook não configurado');
        setIsCreating(false);
        return;
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "CREATE_USER",
          username: newUsername, 
          password: newPassword, 
          name: newName, 
          role: newRole 
        })
      });
      
      if (response.ok) {
        setSuccessMsg('Usuário criado com sucesso!');
        setNewUsername('');
        setNewPassword('');
        setNewName('');
        setNewRole('colaborador');
        fetchUsers();
      } else {
        const errorData = await response.json().catch(() => null);
        setErrorMsg(errorData?.message || 'Erro ao criar usuário.');
      }
    } catch (err) {
      setErrorMsg('Falha na conexão com o banco de dados.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${username}?`)) return;
    
    try {
      const webhookUrl = import.meta.env.VITE_PA_API_WEBHOOK_URL;
      if (!webhookUrl || webhookUrl.includes('COLE_AQUI')) return;

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_USER", username })
      });

      if (response.ok) {
        fetchUsers();
      } else {
        alert('Erro ao deletar usuário.');
      }
    } catch (err) {
      alert('Falha na conexão com o banco de dados.');
    }
  };

  const handleViewSubmissions = async (user: any) => {
    setSelectedUser(user);
    setIsLoadingSubmissions(true);
    try {
      const webhookUrl = import.meta.env.VITE_PA_API_WEBHOOK_URL;
      if (!webhookUrl || webhookUrl.includes('COLE_AQUI')) {
        alert('Webhook não configurado');
        setIsLoadingSubmissions(false);
        return;
      }
      
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "GET_SUBMISSIONS", agent: user.name })
      });
      
      if (!response.ok) throw new Error('Erro HTTP');
      const data = await response.json();
      if (data && Array.isArray(data)) {
        setUserSubmissions(data);
      }
    } catch (err) {
      console.error(err);
      alert('Falha na conexão com o banco de dados.');
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#002836] text-white p-4 md:p-8 font-sans relative selection:bg-[#00aeef]/30">
      <div className='fixed inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00aeef]/20 rounded-full blur-[120px] hidden md:block'></div>
        <div className='absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00aeef]/15 rounded-full blur-[150px] hidden md:block'></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:px-8 md:py-6 shadow-xl">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className='w-12 h-12 shrink-0 bg-gradient-to-tr from-[#8cc63f] to-[#00aeef] rounded-xl flex items-center justify-center shadow-lg shadow-black/20'>
              <Users className="text-white" size={24} />
            </div>
            <div className="truncate">
              <h1 className="text-xl md:text-2xl font-bold truncate">GCRP</h1>
              <p className="text-[#00aeef] text-sm truncate font-medium">Gestão Consórcio Revitaliza Pampulha</p><p className="text-white/60 text-xs truncate mt-0.5">Operador: {adminName}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-[#fb7185] border border-rose-500/20 rounded-xl transition-all font-medium text-sm w-full sm:w-auto"
          >
            <LogOut size={16} />
            Sair
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-xl h-fit"
          >
            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="text-[#00aeef]" size={20} />
              <h2 className="text-lg font-bold">Novo Usuário</h2>
            </div>

            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-white/80">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00aeef]/50 transition-all text-sm"
                  placeholder="Ex: João da Silva"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-white/80">Nome de Usuário (Login)</label>
                <input 
                  type="text" 
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00aeef]/50 transition-all text-sm"
                  placeholder="Ex: joao.silva"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-white/80">Senha</label>
                <input 
                  type="password" 
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00aeef]/50 transition-all text-sm"
                  placeholder="Defina uma senha"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-white/80">Perfil (Permissão)</label>
                <select 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00aeef]/50 transition-all text-sm appearance-none"
                >
                  <option className="bg-[#002836] text-white" value="colaborador">Colaborador (Apenas Cadastro)</option>
                  {(adminRole === 'dev' || adminRole === 'chefe') && <option className="bg-[#002836] text-white" value="admin">Administrador (Gestão de Colaboradores)</option>}
                  {adminRole === 'dev' && <option className="bg-[#002836] text-white" value="chefe">Chefe (Gestão de Administradores)</option>}
                </select>
              </div>

              {errorMsg && <p className="text-[#fb7185] text-xs text-center mt-2">{errorMsg}</p>}
              {successMsg && <p className="text-green-400 text-xs text-center mt-2">{successMsg}</p>}

              <button 
                type="submit" 
                disabled={isCreating}
                className="mt-2 w-full py-2.5 px-4 rounded-xl bg-[#00aeef] hover:hover:bg-[#00aeef]/80 text-sm font-semibold shadow-lg shadow-black/20 transition-all text-white flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="animate-spin" size={16} /> : 'Cadastrar'}
              </button>
            </form>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold mb-6">Usuários Cadastrados</h2>
            
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-[#00aeef]" size={32} />
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0 pb-2">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/10 text-white/60 text-sm">
                      <th className="pb-3 px-2 font-medium">Nome</th>
                      <th className="pb-3 px-2 font-medium">Usuário</th>
                      <th className="pb-3 px-2 font-medium">Perfil</th>
                      <th className="pb-3 px-2 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => u.role !== 'dev').map((user) => (
                      <tr key={user.username} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-2 text-sm">{user.name}</td>
                        <td className="py-4 px-2 text-sm text-[#00aeef]">{user.username}</td>
                        <td className="py-4 px-2 text-sm">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${user.role === 'dev' ? 'bg-purple-500/20 text-purple-400' : user.role === 'chefe' ? 'bg-amber-500/20 text-amber-400' : user.role === 'admin' ? 'bg-[#00aeef]/20 text-[#00aeef]' : 'bg-white/10 text-white/80'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.role === 'colaborador' && (
                              <button 
                                onClick={() => handleViewSubmissions(user)}
                                className="p-2 bg-[#00aeef]/15 hover:bg-[#00aeef]/20 text-[#00aeef] rounded-lg transition-colors"
                                title="Ver Cadastros"
                              >
                                <List size={16} />
                              </button>
                            )}
                            {user.username !== 'admin' && (
                              adminRole === 'dev' || 
                              (adminRole === 'chefe' && user.role !== 'chefe' && user.role !== 'dev') || 
                              (adminRole === 'admin' && user.role === 'colaborador')
                            ) && (
                              <button 
                                onClick={() => handleDeleteUser(user.username)}
                                className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-[#fb7185] rounded-lg transition-colors"
                                title="Excluir usuário"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.filter(u => u.role !== 'dev').length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-white/50 text-sm">
                          Nenhum usuário encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Submissions Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#002836] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold">Cadastros de {selectedUser.name}</h2>
                <p className="text-sm text-[#00aeef] mt-1">{userSubmissions.length} registro(s) encontrado(s)</p>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {isLoadingSubmissions ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin text-[#00aeef]" size={32} />
                </div>
              ) : userSubmissions.length === 0 ? (
                <div className="text-center p-8 text-white/50">
                  Nenhum cadastro encontrado para este usuário.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {userSubmissions.map((sub, idx) => (
                    <div key={sub._id || idx} className="bg-black/20 border border-white/10 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-[#00aeef]">#{idx + 1} - {sub["NOMECOMPLETO"] || "Sem Nome"}</span>
                        <span className="text-xs text-white/50">
                          {sub.created_at ? new Date(sub.created_at).toLocaleString('pt-BR') : sub["Data"]}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-sm text-white/80 mt-3">
                        <div><span className="text-white/50 block text-xs">CPF</span> {sub["CPF"]}</div>
                        <div><span className="text-white/50 block text-xs">Bairro</span> {sub["BAIRRO"]}</div>
                        <div><span className="text-white/50 block text-xs">Cidade</span> {sub["CIDADE"]}</div>
                        <div className="col-span-2 sm:col-span-3">
                          <span className="text-white/50 block text-xs">Endereço</span> 
                          {sub["TIPODELOGRADOURO"]} {sub["LOGRADOURO"]}, {sub["N_x00da_MERO"]} {sub["COMPLEMENTO"]}
                        </div>
                        <div className="col-span-2 sm:col-span-3 mt-2 flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedSubmissionForImages(sub)}
                            className="px-3 py-1.5 bg-[#00aeef]/15 hover:bg-[#00aeef]/20 text-[#00aeef] rounded-lg transition-colors text-xs font-medium flex items-center gap-2 w-fit"
                          >
                            <ImageIcon size={14} />
                            Ver Imagens
                          </button>
                          {sub["Latitude0"] && sub["Longitude0"] && (
                            <a
                              href={`https://www.google.com/maps?q=${sub["Latitude0"]},${sub["Longitude0"]}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors text-xs font-medium flex items-center gap-2 w-fit"
                            >
                              <MapPin size={14} />
                              Ver no Mapa
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Images Modal */}
      {selectedSubmissionForImages && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#002836] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-xl font-bold">Imagens do Cadastro</h2>
                <p className="text-sm text-[#00aeef] mt-1">{selectedSubmissionForImages["NOMECOMPLETO"] || "Sem Nome"}</p>
              </div>
              <button 
                onClick={() => setSelectedSubmissionForImages(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { key: 'FACHADA', label: 'Fachada' },
                  { key: 'FOTOCADUNICO', label: 'CadÚnico' },
                  { key: 'FOTODAFRENTEDODOCUMENTO0', label: 'Documento (Frente)' },
                  { key: 'FOTODOVERSODODOCUMENTO', label: 'Documento (Verso)' },
                  { key: 'FOLHADEADES_x00c3_O', label: 'Folha de Adesão' },
                  { key: 'OUTRAS', label: 'Outras 1' },
                  { key: 'OUTRAS0', label: 'Outras 2' },
                  { key: 'OUTRAS1', label: 'Outras 3' },
                ].map((imgField) => {
                  const imgData = selectedSubmissionForImages[imgField.key];
                  if (!imgData) return null;
                  return (
                    <div key={imgField.key} className="flex flex-col gap-2">
                      <span className="font-medium text-[#00aeef]">{imgField.label}</span>
                      <div className="relative aspect-video bg-black/40 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center p-2">
                        <img 
                          src={imgData} 
                          alt={imgField.label} 
                          className="max-w-full max-h-full object-contain rounded-lg"
                        />
                      </div>
                    </div>
                  );
                })}
                {/* Fallback if no images are present */}
                {![ 'FACHADA', 'FOTOCADUNICO', 'FOTODAFRENTEDODOCUMENTO0', 'FOTODOVERSODODOCUMENTO', 'FOLHADEADES_x00c3_O', 'OUTRAS', 'OUTRAS0', 'OUTRAS1' ].some(key => selectedSubmissionForImages[key]) && (
                  <div className="col-span-full text-center p-8 text-white/50">
                    Nenhuma imagem encontrada neste cadastro.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};
