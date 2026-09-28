import { useState, useEffect } from 'react';
import { Login } from './Login';
import { AdminDashboard } from './AdminDashboard';

const getInitialAuth = () => {
  const saved = localStorage.getItem('gestao_auth');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.token && parsed.expiresAt > Date.now()) {
        return { isAuthenticated: true, userRole: parsed.userRole, agentName: parsed.agentName, token: parsed.token };
      }
    } catch (e) {}
  }
  return { isAuthenticated: false, userRole: '', agentName: '', token: '' };
};

export default function App() {
  const initialAuth = getInitialAuth();
  
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuthenticated);
  const [userRole, setUserRole] = useState(initialAuth.userRole);
  const [agentName, setAgentName] = useState(initialAuth.agentName);
  const [token, setToken] = useState(initialAuth.token);

  useEffect(() => {
    if (isAuthenticated) {
      const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // 8 horas
      localStorage.setItem('gestao_auth', JSON.stringify({ token, userRole, agentName, expiresAt }));
    } else {
      localStorage.removeItem('gestao_auth');
    }
  }, [isAuthenticated, userRole, agentName, token]);

  const handleLogin = (name: string, role: string) => {
    // Apenas admins podem logar no Gestão (ou a lógica que você quiser aplicar)
    const newToken = btoa(`${name}:${Date.now()}`);
    setIsAuthenticated(true);
    setAgentName(name);
    setUserRole(role);
    setToken(newToken);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAgentName('');
    setUserRole('');
    setToken('');
    localStorage.removeItem('gestao_auth');
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Se logado, vai direto para o AdminDashboard
  return <AdminDashboard onLogout={handleLogout} adminName={agentName} adminRole={userRole} />;
}
