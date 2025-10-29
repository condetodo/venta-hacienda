import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Usuario } from '../types';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nombre: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar autenticación al cargar la app
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          } else {
            // Token existe pero no hay usuario en localStorage, obtener perfil
            try {
              const { user: profileUser } = await authService.getProfile();
              setUser(profileUser);
              authService.setAuthData(
                localStorage.getItem('token')!,
                profileUser
              );
            } catch (profileError) {
              console.error('Error obteniendo perfil:', profileError);
              // Si hay error obteniendo el perfil, limpiar datos
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          }
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        // Limpiar datos inválidos
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const { token, user: userData } = await authService.login({ email, password });
      authService.setAuthData(token, userData);
      setUser(userData);
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, nombre: string): Promise<void> => {
    try {
      const { token, user: userData } = await authService.register({ email, password, nombre });
      authService.setAuthData(token, userData);
      setUser(userData);
    } catch (error) {
      console.error('Error en register:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

