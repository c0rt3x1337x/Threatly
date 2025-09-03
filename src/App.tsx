import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DarkModeProvider } from './context/DarkModeContext';
import { ReadStatusProvider } from './context/ReadStatusContext';
import { SavedArticlesProvider } from './context/SavedArticlesContext';
import { ViewedArticlesProvider } from './context/ViewedArticlesContext';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import Home from './pages/Home';
import ArticleDetailPage from './pages/ArticleDetailPage';
import SavedArticlesPage from './pages/SavedArticlesPage';
import SpamPage from './pages/SpamPage';
import SourcesPage from './pages/SourcesPage';
import KeywordsPage from './pages/KeywordsPage';
import AlertsPage from './pages/AlertsPage';
import DashboardPage from './pages/DashboardPage';
import StatisticsPage from './pages/StatisticsPage';
import UserManagementPage from './pages/UserManagementPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <DarkModeProvider>
        <ReadStatusProvider>
          <SavedArticlesProvider>
            <ViewedArticlesProvider>
              <Router>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  
                  {/* Protected routes */}
                  <Route path="/*" element={
                    <div className="App flex min-h-screen bg-gray-50 dark:bg-dark-900">
                      <Sidebar />
                      <div className="flex-1 ml-64 p-6">
                        <Routes>
                          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                          <Route path="/articles" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                          <Route path="/article/:id" element={<ProtectedRoute><ArticleDetailPage /></ProtectedRoute>} />
                          <Route path="/saved" element={<ProtectedRoute><SavedArticlesPage /></ProtectedRoute>} />
                          <Route path="/spam" element={<ProtectedRoute><SpamPage /></ProtectedRoute>} />
                          <Route path="/sources" element={<ProtectedRoute requireAdmin><SourcesPage /></ProtectedRoute>} />
                          <Route path="/keywords" element={<ProtectedRoute requirePremium><KeywordsPage /></ProtectedRoute>} />
                          <Route path="/alerts" element={<ProtectedRoute requirePremium><AlertsPage /></ProtectedRoute>} />
                          <Route path="/statistics" element={<ProtectedRoute requireAdmin><StatisticsPage /></ProtectedRoute>} />
                          <Route path="/admin/users" element={<ProtectedRoute requireAdmin><UserManagementPage /></ProtectedRoute>} />
                        </Routes>
                      </div>
                    </div>
                  } />
                </Routes>
              </Router>
            </ViewedArticlesProvider>
          </SavedArticlesProvider>
        </ReadStatusProvider>
      </DarkModeProvider>
    </AuthProvider>
  );
}

export default App;
