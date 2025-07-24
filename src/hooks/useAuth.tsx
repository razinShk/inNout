import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState } from '@/types';

interface AuthContextType extends AuthState {
  login: (userType: 'admin' | 'worker', projectId?: string, workerId?: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userType: null,
    projectId: undefined,
    workerId: undefined,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const savedAuth = localStorage.getItem('timetrack-auth');
    if (savedAuth) {
      try {
        const parsedAuth = JSON.parse(savedAuth);
        setAuthState(parsedAuth);
      } catch (error) {
        localStorage.removeItem('timetrack-auth');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userType: 'admin' | 'worker', projectId?: string, workerId?: string) => {
    const newAuthState = {
      user: { type: userType },
      userType,
      projectId,
      workerId,
    };
    setAuthState(newAuthState);
    localStorage.setItem('timetrack-auth', JSON.stringify(newAuthState));
  };

  const logout = () => {
    setAuthState({
      user: null,
      userType: null,
      projectId: undefined,
      workerId: undefined,
    });
    localStorage.removeItem('timetrack-auth');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><span>Loading...</span></div>;
  }
  return (
    <AuthContext.Provider value={{ ...authState, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};