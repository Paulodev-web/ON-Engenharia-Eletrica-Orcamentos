import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AreaTrabalho } from './components/AreaTrabalho';
import { Configuracoes } from './components/Configuracoes';
import { GerenciarMateriais } from './components/GerenciarMateriais';
import { GerenciarGrupos } from './components/GerenciarGrupos';
import { EditorGrupo } from './components/EditorGrupo';

function AppContent() {
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
      case 'editor-grupo':
        return <EditorGrupo />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout>
      {renderCurrentView()}
    </Layout>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;