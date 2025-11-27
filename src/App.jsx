import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle, Shield, User, Users, Leaf, Settings, Send, Star, Heart, 
  BarChart2, TrendingUp, Award, AlertCircle, Download, MessageSquare, 
  Printer, Lock, Edit3, Trash2, Plus, Link as LinkIcon, ChevronRight, Eye, LogOut, ArrowLeft,
  Trophy, Calendar, Database
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, ref, set, push, onValue, update 
} from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- SUA CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBagDcUxiOO2SO7MiHRCNct2EQbkiekbwE",
  authDomain: "system-rh-27869.firebaseapp.com",
  databaseURL: "https://system-rh-27869-default-rtdb.firebaseio.com",
  projectId: "system-rh-27869",
  storageBucket: "system-rh-27869.firebasestorage.app",
  messagingSenderId: "403090088960",
  appId: "1:403090088960:web:458c856004cb41bcbea4e5",
  measurementId: "G-15WTNCYQDV"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- CONFIGURAÇÃO PADRÃO ---
const DEFAULT_CONFIG = {
  areas: {
    safety: { id: 'safety', label: 'Segurança do Trabalho', icon: 'shield', color: 'blue', instructors: ['Carlos Segurança', 'Ana Prevenção'] },
    quality: { id: 'quality', label: 'Qualidade', icon: 'star', color: 'yellow', instructors: ['Julia ISO', 'Marcos Qualidade'] },
    people: { id: 'people', label: 'PEOPLE (RH)', icon: 'users', color: 'purple', instructors: ['Beatriz RH', 'Ricardo Cultura'] },
    environment: { id: 'environment', label: 'Meio Ambiente', icon: 'leaf', color: 'green', instructors: ['Lucas Verde', 'Mariana Sustentável'] },
    tpm: { id: 'tpm', label: 'TPM (Manutenção)', icon: 'settings', color: 'orange', instructors: ['Eng. Roberto', 'Téc. Cláudia'] }
  }
};

// Mapeamento de ícones
const ICON_COMPONENTS = {
  shield: Shield,
  star: Star,
  users: Users,
  leaf: Leaf,
  settings: Settings
};

const RenderIcon = ({ name, className }) => {
  const Icon = ICON_COMPONENTS[name];
  return Icon ? <Icon className={className} /> : null;
};

// --- COMPONENTE PRINCIPAL ---
const App = () => {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [config, setConfig] = useState(null);
  const [view, setView] = useState('loading');
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);

  // 1. Autenticação Anônima (Necessária para acessar o banco)
  useEffect(() => {
    signInAnonymously(auth).catch((error) => {
      console.error("Erro na autenticação anônima:", error);
      setAuthError(`Falha na Autenticação Firebase (${error.code}). Verifique se o provedor 'Anônimo' está ativado no Console > Authentication.`);
    });
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (u) {
            setUser(u);
            setAuthError(null);
        }
    });
    return () => unsubscribe();
  }, []);

  // 2. Buscar Dados do Firebase (Realtime Database)
  useEffect(() => {
    if (!user) return;

    // A. Carregar Configurações (Nó 'config/settings')
    const configRef = ref(db, 'config/settings');
    const unsubConfig = onValue(configRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setConfig(data);
      } else {
        // Criar config padrão se não existir e se tiver permissão
        set(configRef, DEFAULT_CONFIG).catch(err => {
            console.error("Erro ao criar config inicial:", err);
            if (err.code === 'PERMISSION_DENIED') {
                setAuthError("Permissão Negada: Verifique as Regras do Realtime Database.");
            }
        });
        setConfig(DEFAULT_CONFIG);
      }
    }, (error) => {
        console.error("Erro ao carregar config:", error);
        setAuthError("Erro de Conexão com Banco de Dados.");
    });

    // B. Carregar Respostas (Nó 'surveys')
    const surveysRef = ref(db, 'surveys');
    const unsubSurveys = onValue(surveysRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const surveysArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        surveysArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setSurveys(surveysArray);
      } else {
        setSurveys([]);
      }
    }, (error) => console.error("Erro ao carregar surveys:", error));

    // Router simples baseado na URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'survey') {
      setView('survey');
    } else {
      setView('login');
    }

    return () => {
      unsubConfig();
      unsubSurveys();
    };
  }, [user]);

  // --- ACTIONS ---
  const handleLogin = (password) => {
    if (password === 'admin123') {
      setView('admin-dashboard');
    } else {
      alert('Senha incorreta!');
    }
  };

  const handleUpdateConfig = async (newConfig) => {
    if (!user) return;
    try {
      await set(ref(db, 'config/settings'), newConfig);
    } catch (e) {
      console.error("Error updating config", e);
      alert("Erro ao salvar configurações no Firebase.");
    }
  };

  const handleSubmitSurvey = async (formData) => {
    if (!user) return;
    try {
      const newSurveyRef = push(ref(db, 'surveys'));
      await set(newSurveyRef, {
        ...formData,
        createdAt: new Date().toISOString()
      });
      setView('survey-success');
    } catch (e) {
      console.error("Error submitting survey", e);
      alert("Erro ao enviar avaliação. Tente novamente.");
    }
  };

  // --- TELA DE ERRO ---
  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Erro de Conexão Firebase</h2>
            <p className="text-gray-600 mb-6 text-sm">{authError}</p>
            <div className="text-left bg-gray-100 p-4 rounded text-xs text-gray-500 space-y-2">
                <p><strong>Verifique no Console:</strong></p>
                <p>1. Auth Anônimo ativado?</p>
                <p>2. Banco Realtime Database criado?</p>
                <p>3. Regras de leitura/escrita permitidas?</p>
            </div>
            <button onClick={() => window.location.reload()} className="mt-6 w-full bg-red-600 text-white py-2 rounded hover:bg-red-700">
                Tentar Novamente
            </button>
        </div>
      </div>
    );
  }

  if (view === 'loading' || !config) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
            <p className="text-gray-500 text-sm">Conectando ao Firebase...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {view === 'login' && <AdminLogin onLogin={handleLogin} onGoToSurvey={() => setView('survey')} />}
      
      {view === 'admin-dashboard' && (
        <AdminDashboard 
          config={config} 
          surveys={surveys} 
          onUpdateConfig={handleUpdateConfig}
          onLogout={() => setView('login')}
          onViewSurvey={(survey) => setSelectedSurvey(survey)}
        />
      )}

      {view === 'survey' && (
        <SurveyForm 
          config={config} 
          onSubmit={handleSubmitSurvey} 
        />
      )}

      {view === 'survey-success' && (
        <SurveySuccess onBack={() => window.location.reload()} />
      )}

      {/* Modal Details */}
      {selectedSurvey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={() => setSelectedSurvey(null)}
              className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <DashboardDetail data={selectedSurvey} config={config} isModal={true} />
          </div>
        </div>
      )}
    </div>
  );
};

// --- VIEW: LOGIN ---
const AdminLogin = ({ onLogin, onGoToSurvey }) => {
  const [pass, setPass] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Acesso Administrativo</h1>
          <p className="text-gray-500">Gestão de Integração (Firebase DB)</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha de Acesso</label>
            <input 
              type="password" 
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Digite a senha..."
            />
          </div>
          <button 
            onClick={() => onLogin(pass)}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
          >
            Entrar no Painel
          </button>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">ou</span></div>
          </div>

          <button 
            onClick={onGoToSurvey}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors border border-gray-200"
          >
            Acessar Formulário (Modo Colaborador)
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Senha padrão: admin123</p>
      </div>
    </div>
  );
};

// --- VIEW: ADMIN DASHBOARD ---
const AdminDashboard = ({ config, surveys, onUpdateConfig, onLogout, onViewSurvey }) => {
  const [activeTab, setActiveTab] = useState('ranking'); 
  const [editAreaId, setEditAreaId] = useState(null);
  const [newInstructor, setNewInstructor] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  // Lógica de Ranking (UseMemo recalculando com dados do Firebase)
  const rankingData = useMemo(() => {
    const stats = {};
    surveys.forEach(survey => {
      if (selectedMonth) {
        const surveyDate = new Date(survey.createdAt);
        const monthStr = surveyDate.toISOString().slice(0, 7); 
        if (monthStr !== selectedMonth) return;
      }
      Object.keys(config.areas).forEach(key => {
        const name = survey[`${key}_instructor_name`];
        const rating = parseInt(survey[`${key}_instructor_rating`] || 0);
        if (name && rating > 0) {
          if (!stats[name]) {
            stats[name] = { 
              name, total: 0, count: 0, 
              area: config.areas[key].label, 
              color: config.areas[key].color 
            };
          }
          stats[name].total += rating;
          stats[name].count += 1;
        }
      });
    });
    return Object.values(stats)
      .map(stat => ({ ...stat, average: (stat.total / stat.count).toFixed(1) }))
      .sort((a, b) => b.average - a.average || b.count - a.count);
  }, [surveys, config, selectedMonth]);

  const copySurveyLink = () => {
    // Como não estamos no Firebase Hosting, usamos a URL atual
    const url = `${window.location.origin}${window.location.pathname}?mode=survey`;
    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) alert('Link copiado! Envie para o colaborador.');
      else alert('Copie manualmente: ' + url);
    } catch (err) {
      prompt("Copie este link:", url);
    }
    document.body.removeChild(textArea);
  };

  const handleAddInstructor = (areaId, instructorName) => {
    const nameToAdd = instructorName || newInstructor;
    if (!nameToAdd.trim()) return;
    const newConfig = JSON.parse(JSON.stringify(config));
    if (!newConfig.areas[areaId].instructors) newConfig.areas[areaId].instructors = [];
    newConfig.areas[areaId].instructors.push(nameToAdd.trim());
    onUpdateConfig(newConfig);
    setNewInstructor('');
  };

  const handleRemoveInstructor = (areaId, instructorName) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    newConfig.areas[areaId].instructors = newConfig.areas[areaId].instructors.filter(i => i !== instructorName);
    onUpdateConfig(newConfig);
  };

  const handleAreaLabelChange = (areaId, newLabel) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    newConfig.areas[areaId].label = newLabel;
    onUpdateConfig(newConfig);
  };

  const downloadCSV = () => {
    const headers = ["Data", "Colaborador", "Area", "Instrutor", "Nota_Instrutor", "Comentario"];
    let csvContent = headers.join(",") + "\n";
    surveys.forEach(survey => {
      Object.keys(config.areas).forEach(areaKey => {
        const area = config.areas[areaKey];
        const row = [
          `"${new Date(survey.createdAt).toLocaleDateString()}"`,
          `"${survey.name}"`,
          `"${area.label}"`,
          `"${survey[`${areaKey}_instructor_name`] || ''}"`,
          survey[`${areaKey}_instructor_rating`] || 0,
          `"${(survey[`${areaKey}_comment`] || '').replace(/"/g, '""')}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "relatorio_geral_integracao.csv";
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center">
            <Database className="w-8 h-8 text-blue-600 mr-3" />
            <div>
                <h1 className="text-xl font-bold text-gray-800">Gestão de Integração</h1>
                <p className="text-xs text-gray-400">Banco de Dados: Firebase Realtime</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <button onClick={copySurveyLink} className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors text-sm">
              <LinkIcon className="w-4 h-4 mr-2" />
              Copiar Link
            </button>
            <button onClick={onLogout} className="flex items-center px-4 py-2 text-gray-500 hover:text-gray-700 font-medium text-sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-2 md:space-x-4 mb-8 overflow-x-auto pb-2">
          <button onClick={() => setActiveTab('ranking')} className={`px-6 py-2 rounded-full font-semibold transition-all whitespace-nowrap ${activeTab === 'ranking' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            <Trophy className="w-4 h-4 inline mr-2 mb-1"/> Ranking de Instrutores
          </button>
          <button onClick={() => setActiveTab('surveys')} className={`px-6 py-2 rounded-full font-semibold transition-all whitespace-nowrap ${activeTab === 'surveys' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            Feedbacks ({surveys.length})
          </button>
          <button onClick={() => setActiveTab('settings')} className={`px-6 py-2 rounded-full font-semibold transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            Configurações
          </button>
        </div>

        {/* CONTENT: RANKING */}
        {activeTab === 'ranking' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-gray-50 to-white">
               <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <Award className="w-6 h-6 text-yellow-500 mr-2" /> 
                    Ranking Acumulativo
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Média geral do Firebase</p>
               </div>
               <div className="mt-4 md:mt-0 flex items-center bg-white p-2 rounded-lg border border-gray-200">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-sm text-gray-700 outline-none bg-transparent font-medium"
                  >
                    <option value="">Todo o Período (Geral)</option>
                    <option value={new Date().toISOString().slice(0, 7)}>Este Mês ({new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})</option>
                  </select>
               </div>
            </div>

            {rankingData.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                Sem dados para exibir neste período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                      <th className="p-4 font-semibold text-center w-20">Posição</th>
                      <th className="p-4 font-semibold">Instrutor</th>
                      <th className="p-4 font-semibold">Área</th>
                      <th className="p-4 font-semibold text-center">Média Geral</th>
                      <th className="p-4 font-semibold text-center">Avaliações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rankingData.map((stat, index) => (
                      <tr key={stat.name} className={`hover:bg-gray-50 transition-colors ${index < 3 ? 'bg-yellow-50/30' : ''}`}>
                        <td className="p-4 text-center">
                          {index === 0 && <span className="text-2xl">🥇</span>}
                          {index === 1 && <span className="text-2xl">🥈</span>}
                          {index === 2 && <span className="text-2xl">🥉</span>}
                          {index > 2 && <span className="font-bold text-gray-400">#{index + 1}</span>}
                        </td>
                        <td className="p-4 font-medium text-gray-800 text-lg">{stat.name}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase bg-${stat.color || 'gray'}-100 text-${stat.color || 'gray'}-600`}>
                            {stat.area}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm">
                            <span className="font-bold text-gray-800 mr-1">{stat.average}</span>
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          </div>
                        </td>
                        <td className="p-4 text-center text-gray-500">
                          {stat.count} <span className="text-xs">votos</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CONTENT: SURVEYS LIST */}
        {activeTab === 'surveys' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Histórico ({surveys.length})</h2>
              <button onClick={downloadCSV} className="flex items-center text-green-600 hover:text-green-700 font-medium text-sm">
                <Download className="w-4 h-4 mr-1" /> CSV
              </button>
            </div>
            {surveys.length === 0 ? (
              <div className="p-12 text-center text-gray-500">Nenhuma avaliação recebida ainda.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-semibold">Data</th>
                      <th className="p-4 font-semibold">Colaborador</th>
                      <th className="p-4 font-semibold text-center">Detalhes</th>
                      <th className="p-4 font-semibold text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {surveys.map((survey) => (
                      <tr key={survey.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-sm text-gray-600">{new Date(survey.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 font-medium text-gray-800">{survey.name}</td>
                        <td className="p-4 text-center">
                           <span className="inline-block px-2 py-1 rounded-md bg-green-100 text-green-700 font-bold text-xs">
                             Ver Completo
                           </span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => onViewSurvey(survey)} className="inline-flex items-center justify-center p-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CONTENT: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.keys(config.areas).map((key) => {
              const area = config.areas[key];
              const isEditing = editAreaId === key;

              return (
                <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg bg-${area.color}-50 text-${area.color}-600 mr-3`}>
                        <RenderIcon name={area.icon} className="w-6 h-6" />
                      </div>
                      {isEditing ? (
                        <input 
                          type="text" 
                          defaultValue={area.label}
                          onBlur={(e) => {
                            handleAreaLabelChange(key, e.target.value);
                            setEditAreaId(null);
                          }}
                          autoFocus
                          className="font-bold text-gray-800 border-b border-blue-500 outline-none"
                        />
                      ) : (
                        <h3 className="font-bold text-gray-800">{area.label}</h3>
                      )}
                    </div>
                    <button onClick={() => setEditAreaId(isEditing ? null : key)} className="text-gray-400 hover:text-blue-500">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Instrutores Cadastrados</p>
                    {(area.instructors || []).map(instructor => (
                      <div key={instructor} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm group">
                        <span>{instructor}</span>
                        <button onClick={() => handleRemoveInstructor(key, instructor)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center mt-4">
                      <input 
                        type="text"
                        placeholder="Novo instrutor..."
                        className="flex-1 p-2 text-sm border border-gray-200 rounded-l-lg outline-none focus:border-green-500"
                        id={`input-${key}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddInstructor(key, e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                      <button onClick={() => {
                          const input = document.getElementById(`input-${key}`);
                          if(input) {
                            handleAddInstructor(key, input.value); 
                            input.value = '';
                          }
                        }}
                        className="bg-green-600 text-white p-2 rounded-r-lg hover:bg-green-700"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- VIEW: SURVEY FORM ---
const SurveyForm = ({ config, onSubmit }) => {
  const [formData, setFormData] = useState({
    date: '',
    name: '',
  });
  
  // Dynamic fields
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleAnswerChange = (key, field, value) => {
    setAnswers(prev => ({
      ...prev,
      [`${key}_${field}`]: value
    }));
    if (errors[`${key}_${field}`]) setErrors(prev => ({ ...prev, [`${key}_${field}`]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = "Data obrigatória";
    if (!formData.name) newErrors.name = "Nome obrigatório";

    Object.keys(config.areas).forEach(key => {
      if (!answers[`${key}_content`]) newErrors[`${key}_content`] = "Avalie o conteúdo";
      if (!answers[`${key}_instructor_name`]) newErrors[`${key}_instructor_name`] = "Selecione o instrutor";
      if (!answers[`${key}_instructor_rating`]) newErrors[`${key}_instructor_rating`] = "Avalie o instrutor";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ ...formData, ...answers });
    } else {
      const firstError = document.querySelector('.error-message');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
       <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8 border-t-4 border-green-500">
          <div className="bg-green-600 p-8 text-white relative overflow-hidden">
            <h1 className="text-3xl font-bold mb-4 relative z-10">Avaliação de Integração</h1>
            <p className="text-green-100 text-lg relative z-10">
              Sua opinião importa! Avalie nossos instrutores e nos ajude a melhorar. 💚
            </p>
          </div>
        </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><User className="mr-2 w-5 h-5 text-gray-500"/> Identificação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} className={`w-full p-2 border rounded-lg ${errors.date ? 'border-red-500' : 'border-gray-300'}`}/>
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} className={`w-full p-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'}`}/>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
          </div>
        </div>

        {Object.keys(config.areas).map((key) => {
          const area = config.areas[key];
          return (
            <div key={key} className={`bg-white rounded-xl shadow-sm border-l-4 border-${area.color}-500 overflow-hidden`}>
              <div className="bg-gray-50 p-4 flex items-center border-b border-gray-100">
                <div className={`p-2 bg-white rounded-lg text-${area.color}-600 shadow-sm mr-3`}>
                  <RenderIcon name={area.icon} className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">{area.label}</h3>
              </div>
              
              <div className="p-6 grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Conteúdo</label>
                  <p className="text-sm text-gray-700 mb-3">O conteúdo foi claro e te ajudou a entender o tema?</p>
                  <div className="space-y-2">
                    {["Sim, muito claro", "Parcialmente", "Ficaram dúvidas", "Não entendi nada"].map(opt => (
                      <label key={opt} className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${answers[`${key}_content`] === opt ? `border-${area.color}-500 bg-${area.color}-50` : 'border-gray-200'}`}>
                        <input type="radio" name={`${key}_content`} value={opt} checked={answers[`${key}_content`] === opt} onChange={() => handleAnswerChange(key, 'content', opt)} className={`text-${area.color}-600 focus:ring-${area.color}-500`} />
                        <span className="ml-2 text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                  {errors[`${key}_content`] && <p className="text-red-500 text-xs mt-1 error-message">Obrigatório</p>}
                </div>

                <div className="md:border-l md:pl-8 border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Instrutor</label>
                  
                  <div className="mb-4">
                    <select 
                      value={answers[`${key}_instructor_name`] || ''}
                      onChange={(e) => handleAnswerChange(key, 'instructor_name', e.target.value)}
                      className={`w-full p-2 text-sm border rounded-lg ${errors[`${key}_instructor_name`] ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Selecione quem ministrou...</option>
                      {(area.instructors || []).map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    {errors[`${key}_instructor_name`] && <p className="text-red-500 text-xs mt-1 error-message">Obrigatório</p>}
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Didática e Clareza</p>
                    <div className="flex space-x-1">
                      {[1,2,3,4,5].map(star => (
                        <button type="button" key={star} onClick={() => handleAnswerChange(key, 'instructor_rating', star)}>
                          <Star className={`w-8 h-8 ${star <= (answers[`${key}_instructor_rating`] || 0) ? `text-${area.color}-500 fill-current` : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>
                     {errors[`${key}_instructor_rating`] && <p className="text-red-500 text-xs mt-1 error-message">Avalie o instrutor</p>}
                  </div>

                  <div>
                    <textarea 
                      placeholder="Comentário opcional..." 
                      className="w-full p-2 text-sm border border-gray-200 rounded-lg h-20 resize-none"
                      value={answers[`${key}_comment`] || ''}
                      onChange={(e) => handleAnswerChange(key, 'comment', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="pt-6 pb-12 flex justify-center">
          <button type="submit" className="bg-gray-900 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-gray-800 hover:-translate-y-1 transition-all flex items-center">
            Enviar Avaliação <Send className="ml-2 w-5 h-5"/>
          </button>
        </div>
      </form>
    </div>
  );
};

// --- VIEW: SUCCESS ---
const SurveySuccess = ({ onBack }) => (
  <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
    <div className="bg-white p-12 rounded-2xl shadow-xl max-w-lg w-full text-center">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-12 h-12 text-green-600" />
      </div>
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Obrigado! 💚</h2>
      <p className="text-gray-600 mb-8 text-lg">
        Sua avaliação foi registrada com sucesso. Agradecemos sua colaboração para tornar nosso processo de integração ainda melhor.
      </p>
      <button onClick={onBack} className="text-green-600 font-semibold hover:underline">
        Voltar ao início
      </button>
    </div>
  </div>
);

// --- COMPONENT: DASHBOARD DETAIL (Visualização do Relatório) ---
const DashboardDetail = ({ data, config, isModal }) => {
  // Score Mapping Helpers
  const scoreMap = { "Sim, muito claro": 100, "Parcialmente": 60, "Ficaram dúvidas": 30, "Não entendi nada": 0 };
  
  const chartData = Object.keys(config.areas).map(key => {
    const area = config.areas[key];
    const contentText = data[`${key}_content`];
    const contentScore = scoreMap[contentText] || 0;
    const instructorScore = (data[`${key}_instructor_rating`] / 5) * 100;
    
    return {
      label: area.label,
      color: area.color,
      contentScore,
      instructorScore,
      instructorName: data[`${key}_instructor_name`],
      instructorRating: data[`${key}_instructor_rating`],
      comment: data[`${key}_comment`]
    };
  });

  const avg = chartData.reduce((acc, cur) => acc + ((cur.contentScore + cur.instructorScore)/2), 0) / chartData.length;

  return (
    <div className="p-8 bg-white min-h-full">
      <div className="flex justify-between items-start mb-8 border-b pb-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Relatório de Integração</h2>
           <p className="text-gray-500">Colaborador: <strong>{data.name}</strong> • Data: {new Date(data.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-gray-800">{Math.round(avg)}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Nota Geral</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
           <h3 className="font-bold text-gray-700 flex items-center"><BarChart2 className="w-5 h-5 mr-2"/> Desempenho Visual</h3>
           {chartData.map((d, i) => (
             <div key={i}>
               <div className="flex justify-between text-sm mb-1">
                 <span>{d.label}</span>
                 <span className="text-xs text-gray-400">{d.instructorName}</span>
               </div>
               <div className="h-6 flex bg-gray-100 rounded overflow-hidden">
                 <div style={{width: `${d.contentScore*0.5}%`}} className="bg-gray-800" title="Conteúdo"></div>
                 <div style={{width: `${d.instructorScore*0.5}%`}} className={`bg-${d.color}-500 opacity-80`} title="Instrutor"></div>
               </div>
             </div>
           ))}
           <div className="flex gap-4 text-xs text-gray-400">
             <span className="flex items-center"><div className="w-3 h-3 bg-gray-800 mr-1 rounded-sm"></div>Conteúdo</span>
             <span className="flex items-center"><div className="w-3 h-3 bg-gray-400 mr-1 rounded-sm"></div>Instrutor</span>
           </div>
        </div>

        <div className="space-y-4 max-h-[400px] overflow-y-auto">
           <h3 className="font-bold text-gray-700 flex items-center"><MessageSquare className="w-5 h-5 mr-2"/> Detalhes & Comentários</h3>
           {chartData.map((d, i) => (
             <div key={i} className="border border-gray-100 rounded-lg p-3 text-sm">
               <div className="flex justify-between font-semibold text-gray-800">
                 <span>{d.label}</span>
                 <div className="flex items-center text-yellow-500">
                   {d.instructorRating} <Star className="w-3 h-3 fill-current ml-1"/>
                 </div>
               </div>
               <div className="text-gray-500 text-xs mt-1">Instrutor: {d.instructorName}</div>
               {d.comment && (
                 <div className="mt-2 bg-gray-50 p-2 rounded text-gray-600 italic border-l-2 border-gray-300">
                   "{d.comment}"
                 </div>
               )}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default App;