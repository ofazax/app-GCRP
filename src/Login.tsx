import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Droplet, LogIn } from 'lucide-react';

interface LoginProps {
  onLogin: (name: string, role: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const webhookUrl = import.meta.env.VITE_PA_LOGIN_WEBHOOK_URL;
      
      if (!webhookUrl || webhookUrl.includes('COLE_AQUI')) {
         throw new Error("Webhook de Login não configurado.");
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error('Usuário ou senha inválidos.');
      }

      const data = await response.json();
      
      if (data && data.name && data.role) {
        onLogin(data.name, data.role);
      } else {
        setErrorMsg('Usuário ou senha inválidos.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha na conexão com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#002836] text-white flex overflow-hidden font-sans relative flex-col items-center justify-center p-4 selection:bg-[#00aeef]/30">
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00aeef]/20 rounded-full blur-[120px] hidden md:block'></div>
        <div className='absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00aeef]/15 rounded-full blur-[150px] hidden md:block'></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-8 shadow-2xl flex flex-col z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className='w-14 h-14 bg-gradient-to-tr from-[#8cc63f] to-[#00aeef] rounded-2xl flex items-center justify-center shadow-lg shadow-black/20 mb-4'>
            <Droplet className="text-white" size={28} />
          </div>
          <h1 className='text-3xl font-bold tracking-tight text-center text-transparent bg-clip-text bg-gradient-to-r from-[#8cc63f] to-[#00aeef]'>GCRP</h1>
          <p className="text-[#00aeef] text-sm mt-1 font-medium text-center">Gestão Consórcio Revitaliza Pampulha<br/><span className="text-white/50 text-xs font-normal">Faça login para continuar</span></p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/80">Usuário</label>
            <input 
              type="text" 
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00aeef]/50 transition-all"
              placeholder="Digite seu usuário"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/80">Senha</label>
            <input 
              type="password" 
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00aeef]/50 transition-all"
              placeholder="••••••••"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-[#fb7185] rounded-lg text-sm text-center">
              {errorMsg}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="mt-4 w-full py-3 px-6 rounded-xl bg-[#00aeef] hover:hover:bg-[#00aeef]/80 text-sm font-semibold shadow-lg shadow-black/20 transition-all text-white flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                Entrar
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
