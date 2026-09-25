import { useState, useEffect } from 'react';
import { Login } from './Login';
import { AdminDashboard } from './AdminDashboard';

const getInitialAuth = () => {
  const saved = localStorage.getItem('gestao_auth');
  return saved ? JSON.parse(saved) : { isAuthenticated: false, userRole: '', agentName: '' };
};

export default function App() {
  const initialAuth = getInitialAuth();
  
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuthenticated);
  const [userRole, setUserRole] = useState(initialAuth.userRole);
  const [agentName, setAgentName] = useState(initialAuth.agentName);

  useEffect(() => {
    localStorage.setItem('gestao_auth', JSON.stringify({ isAuthenticated, userRole, agentName }));
  }, [isAuthenticated, userRole, agentName]);

  const handleLogin = (name: string, role: string) => {
    // Apenas admins podem logar no Gestão (ou a lógica que você quiser aplicar)
    setIsAuthenticated(true);
    setAgentName(name);
    setUserRole(role);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAgentName('');
    setUserRole('');
    localStorage.removeItem('gestao_auth');
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Se logado, vai direto para o AdminDashboard
  return <AdminDashboard onLogout={handleLogout} adminName={agentName} adminRole={userRole} />;
}
