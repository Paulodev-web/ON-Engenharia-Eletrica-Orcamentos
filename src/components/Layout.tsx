import React from 'react';
import { Settings, ArrowLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { currentView, setCurrentView } = useApp();

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'ON Engenharia Elétrica - Sistema de Orçamentos';
      case 'orcamento': return 'Área de Trabalho do Orçamento';
      case 'configuracoes': return 'Painel de Configurações';
      case 'materiais': return 'Gerenciar Materiais';
      case 'grupos': return 'Gerenciar Grupos de Itens';
      case 'editor-grupo': return 'Editor de Grupo de Itens';
      default: return 'ON Engenharia Elétrica';
    }
  };

  const showBackButton = currentView !== 'dashboard';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {showBackButton && (
                <button
                  onClick={() => {
                    if (currentView === 'orcamento') {
                      setCurrentView('dashboard');
                    } else if (['materiais', 'grupos', 'editor-grupo'].includes(currentView)) {
                      setCurrentView('configuracoes');
                    } else {
                      setCurrentView('dashboard');
                    }
                  }}
                  className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{getTitle()}</h1>
              </div>
            </div>
            
            {currentView === 'dashboard' && (
              <button
                onClick={() => setCurrentView('configuracoes')}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Settings className="h-5 w-5" />
                <span>Configurações</span>
              </button>
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}