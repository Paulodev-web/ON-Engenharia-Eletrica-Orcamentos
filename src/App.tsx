import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AreaTrabalho } from './components/AreaTrabalho';
import { Configuracoes } from './components/Configuracoes';
import { GerenciarMateriais } from './components/GerenciarMateriais';
import { GerenciarGrupos } from './components/GerenciarGrupos';
import { GerenciarConcessionarias } from './components/GerenciarConcessionarias';
import { GerenciarTiposPostes } from './components/GerenciarTiposPostes';
import { EditorGrupo } from './components/EditorGrupo';
import { Login } from './components/Login';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { session, loading } = useAuth();

  // Mostra um indicador de carregamento enquanto verifica a autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não houver sessão, mostra a tela de login
  if (!session) {
    return <Login />;
  }

  // Se há sessão, renderiza o app principal com ErrorBoundary interno
  return (
    <ErrorBoundary>
      <AuthenticatedApp />
    </ErrorBoundary>
  );
}

function AuthenticatedApp() {
  const { currentView } = useApp();

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'orcamento':
        return <AreaTrabalho />;
      case 'configuracoes':
        return <Configuracoes />;
      case 'materiais':
        return <GerenciarMateriais />;
      case 'grupos':
        return <GerenciarGrupos />;
      case 'concessionarias':
        return <GerenciarConcessionarias />;
      case 'tipos-postes':
        return <GerenciarTiposPostes />;
      case 'editor-grupo':
        return <EditorGrupo />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout>
      <ErrorBoundary>
        {renderCurrentView()}
      </ErrorBoundary>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;