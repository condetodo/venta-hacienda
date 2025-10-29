import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300">404</h1>
          <h2 className="text-2xl font-bold text-gray-900 mt-4">Página no encontrada</h2>
          <p className="text-gray-600 mt-2">
            La página que buscas no existe o ha sido movida.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-2 bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Ir al Dashboard</span>
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver atrás</span>
          </button>
        </div>
      </div>
    </div>
  );
};

