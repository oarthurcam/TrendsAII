import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { analyzeExcelData, AnalysisResult } from './services/geminiService';
import { Footer } from './components/Footer';
import { ChartRenderer } from './components/ChartRenderer';
import { SettingsModal } from './components/SettingsModal';
import { useTheme } from './hooks/useTheme';
import { ShareModal } from './components/ShareModal';

// TypeScript declaration for the libraries loaded from CDN
declare const XLSX: any;
declare const html2canvas: any;

// Define a type for the parsed Excel data
export type DataRow = { [key: string]: string | number };

// Define a type for history entries
interface HistoryEntry {
  id: string;
  fileName: string;
  insights: AnalysisResult;
  data: DataRow[];
}

// Define User type for authentication
export interface User {
  name: string;
  email: string;
}

// URL for the backend API server
const API_BASE_URL = '';

// --- Authentication Component ---
const Auth: React.FC<{ onAuthSuccess: (user: User) => void }> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const endpoint = isLogin ? `${API_BASE_URL}/api/login` : `${API_BASE_URL}/api/register`;
    const payload = isLogin ? { email, password } : { name, email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('app_currentUser', JSON.stringify(data.user));
        onAuthSuccess(data.user);
      } else {
        setError(data.message || 'Ocorreu um erro.');
      }
    } catch (e) {
      console.error("Auth error:", e);
      setError('Falha na conexão com o servidor. O backend está configurado corretamente para produção?');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
            <div className="flex justify-center items-center gap-1 mb-8" aria-label="TrendsAI Logo">
                <span className="material-icons text-primary text-4xl">analytics</span>
                <div className="flex items-baseline text-3xl">
                    <span className="font-semibold text-text tracking-tight">Trends</span>
                    <span className="font-bold text-primary tracking-tight">AI</span>
                </div>
            </div>
            <div className="bg-card p-8 rounded-xl shadow-md space-y-6">
                <h2 className="text-2xl font-bold text-center text-text">{isLogin ? 'Entrar na sua conta' : 'Criar uma conta'}</h2>
                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm dark:bg-red-900/20 dark:text-red-300">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-text-secondary">Nome</label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-card border border-border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            />
                        </div>
                    )}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-text-secondary">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-card border border-border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-text-secondary">Senha</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-card border border-border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary disabled:opacity-50"
                    >
                        {isLoading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar conta')}
                    </button>
                </form>
                <p className="text-center text-sm text-text-secondary">
                    {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                    <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-primary hover:underline ml-1">
                        {isLogin ? 'Cadastre-se' : 'Entrar'}
                    </button>
                </p>
            </div>
        </div>
    </div>
  );
};


interface ChatGPTSidebarProps {
    history: HistoryEntry[];
    activeId: string | null;
    onNewInsight: () => void;
    onSelectHistory: (id: string) => void;
    onDeleteHistory: (id: string) => void;
    onRenameHistory: (id: string, newTitle: string) => void;
    isOpen: boolean;
    onToggle: () => void;
    user: User | null;
    onLogout: () => void;
    onOpenSettings: () => void;
}

const ChatGPTSidebar: React.FC<ChatGPTSidebarProps> = ({ history, activeId, onNewInsight, onSelectHistory, onDeleteHistory, onRenameHistory, isOpen, onToggle, user, onLogout, onOpenSettings }) => {
    const [popoverState, setPopoverState] = useState<{ id: string | null; x: number; y: number }>({ id: null, x: 0, y: 0 });
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const renameInputRef = useRef<HTMLInputElement>(null);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const userButtonRef = useRef<HTMLButtonElement>(null);

    const SidebarLink: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
        <div className="flex items-center space-x-4 p-3 rounded-md hover:bg-slate-500/10 text-text-secondary hover:text-primary transition-colors">
            <span className="material-icons">{icon}</span>
            <span className="text-sm font-medium">{text}</span>
        </div>
    );
    
    useEffect(() => {
        if (renamingId && renameInputRef.current) {
            renameInputRef.current.focus();
        }
    }, [renamingId]);

    const handleOpenPopover = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setPopoverState({ id, x: rect.left, y: rect.bottom + 4 });
    };

    const handleClosePopover = useCallback(() => {
        setPopoverState({ id: null, x: 0, y: 0 });
    }, []);

    useEffect(() => {
        if (popoverState.id) {
            window.addEventListener('click', handleClosePopover);
        }
        return () => {
            window.removeEventListener('click', handleClosePopover);
        };
    }, [popoverState.id, handleClosePopover]);

    // Close user menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                userMenuRef.current &&
                !userMenuRef.current.contains(event.target as Node) &&
                userButtonRef.current &&
                !userButtonRef.current.contains(event.target as Node)
            ) {
                setIsUserMenuOpen(false);
            }
        };

        if (isUserMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isUserMenuOpen]);

    const handleStartRename = (id: string, currentTitle: string) => {
        handleClosePopover();
        setRenamingId(id);
        setRenameValue(currentTitle);
    };

    const handleRenameSubmit = () => {
        if (renamingId && renameValue.trim()) {
            onRenameHistory(renamingId, renameValue.trim());
        }
        setRenamingId(null);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRenameSubmit();
        } else if (e.key === 'Escape') {
            setRenamingId(null);
        }
    };
    
    const handleDelete = (id: string) => {
        handleClosePopover();
        onDeleteHistory(id);
    };

    const getUserInitials = (name: string | undefined) => {
        if (!name) return '';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    return (
        <>
            {popoverState.id && (
                <div 
                    style={{ top: `${popoverState.y}px`, left: `${popoverState.x}px` }} 
                    className="fixed z-50 bg-card rounded-md shadow-lg border border-border w-32 text-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        onClick={() => handleStartRename(popoverState.id!, history.find(h => h.id === popoverState.id)!.insights.dashboardTitle)} 
                        className="w-full text-left px-3 py-2 hover:bg-slate-500/10 flex items-center gap-2"
                    >
                        <span className="material-icons text-base">drive_file_rename_outline</span>
                        Renomear
                    </button>
                    <button 
                        onClick={() => handleDelete(popoverState.id!)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-500/10 flex items-center gap-2 text-red-500"
                    >
                        <span className="material-icons text-base">delete_outline</span>
                        Excluir
                    </button>
                </div>
            )}
            <aside className={`fixed top-0 left-0 z-40 bg-sidebar text-text flex flex-col h-screen hidden lg:flex border-r border-border transition-all duration-300 ease-in-out ${isOpen ? 'w-[260px] p-2' : 'w-16 items-center py-4'}`}>
                {isOpen ? (
                    <div className="flex flex-col h-full w-full overflow-hidden">
                        <div className="flex-shrink-0">
                            <div className="flex justify-end items-center p-2 mb-1">
                                <button onClick={onToggle} className="p-2 rounded-md hover:bg-slate-500/10">
                                    <span className="material-icons text-xl text-primary">menu_open</span>
                                </button>
                            </div>
                            <div className="p-1">
                                <button onClick={onNewInsight} className="w-full text-left">
                                    <SidebarLink icon="create" text="Novo Insight" />
                                </button>
                            </div>
                        </div>

                        <div className="my-2 border-t border-border"></div>
                        
                        <div className="flex-grow overflow-y-auto px-1 space-y-1">
                            <h3 className="text-xs font-medium text-text-secondary/70 px-3 pt-2 pb-1">Análises</h3>
                            {history.map((item) => (
                                <div key={item.id} className="relative group">
                                    {renamingId === item.id ? (
                                        <input
                                            ref={renameInputRef}
                                            type="text"
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onBlur={handleRenameSubmit}
                                            onKeyDown={handleRenameKeyDown}
                                            className="w-full text-sm p-3 rounded-md bg-primary/20 border border-primary text-text"
                                        />
                                    ) : (
                                        <button onClick={() => onSelectHistory(item.id)} className={`w-full flex items-center justify-between text-sm p-3 rounded-md truncate text-left ${item.id === activeId ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-slate-500/10'} transition-colors`}>
                                            <span className="truncate">{item.insights.dashboardTitle}</span>
                                            <div className="flex items-center">
                                                {item.id === activeId && <span className="w-2 h-2 rounded-full bg-primary mr-2"></span>}
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => handleOpenPopover(e, item.id)} className="p-1 rounded-full hover:bg-slate-500/20">
                                                        <span className="material-icons text-lg">more_horiz</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {user && (
                             <div className="flex-shrink-0 mt-2 p-1 border-t border-border relative">
                                {isUserMenuOpen && (
                                     <div
                                        ref={userMenuRef}
                                        className="absolute bottom-full mb-2 left-0 right-0 mx-1 bg-card rounded-md shadow-lg border border-border z-10 animate-fade-in-up"
                                    >
                                        <div className="p-1">
                                            <button 
                                                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-500/10 flex items-center gap-2 text-text-secondary"
                                                onClick={() => {
                                                    onOpenSettings();
                                                    setIsUserMenuOpen(false);
                                                }}
                                            >
                                                <span className="material-icons text-base">settings</span>
                                                Configurações
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    onLogout();
                                                    setIsUserMenuOpen(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-red-500/10 hover:text-red-400 flex items-center gap-2 text-red-400"
                                            >
                                                <span className="material-icons text-base">logout</span>
                                                Sair
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <button
                                    ref={userButtonRef}
                                    onClick={() => setIsUserMenuOpen(prev => !prev)}
                                    className="flex items-center justify-between p-2 rounded-md hover:bg-slate-500/10 group w-full text-left"
                                    aria-haspopup="true"
                                    aria-expanded={isUserMenuOpen}
                                >
                                    <div className="flex items-center gap-x-3 overflow-hidden">
                                        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                            <span className="text-white font-semibold text-sm">{getUserInitials(user.name)}</span>
                                        </div>
                                        <div className="flex flex-col items-start overflow-hidden">
                                            <span className="text-sm font-medium text-text truncate w-full">{user.name}</span>
                                            <span className="text-xs text-text-secondary truncate w-full">{user.email}</span>
                                        </div>
                                    </div>
                                    <span className="material-icons text-lg text-text-secondary group-hover:text-text">more_vert</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col h-full w-full items-center justify-between">
                        <button onClick={onToggle} className="p-2 rounded-md hover:bg-slate-500/10">
                            <span className="material-icons text-xl text-primary">menu</span>
                        </button>
                        {user && (
                            <button onClick={onOpenSettings} className="w-9 h-9 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:opacity-90" title={user.name}>
                                <span className="text-white font-semibold text-sm">{getUserInitials(user.name)}</span>
                            </button>
                        )}
                    </div>
                )}
            </aside>
        </>
    );
};

const Card: React.FC<{title: string, icon: string, children: React.ReactNode, className?: string}> = ({title, icon, children, className}) => (
    <div className={`bg-card p-6 rounded-xl shadow-sm h-full flex flex-col ${className}`}>
        <h3 className="font-semibold mb-4 flex items-center text-text flex-shrink-0">
            <span className="material-icons text-primary mr-2">{icon}</span>
            {title}
        </h3>
        <div className="flex-grow overflow-y-auto">
            {children}
        </div>
    </div>
);

const SkeletonCard: React.FC = () => (
    <div className="bg-card p-6 rounded-xl h-80 animate-pulse">
        <div className="h-6 bg-slate-500/20 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
            <div className="h-4 bg-slate-500/20 rounded w-full"></div>
            <div className="h-4 bg-slate-500/20 rounded w-5/6"></div>
            <div className="h-4 bg-slate-500/20 rounded w-full"></div>
            <div className="h-4 bg-slate-500/20 rounded w-3/4"></div>
        </div>
    </div>
);

const KeyInsightsCard: React.FC<{ insights: string | undefined }> = ({ insights }) => {
    const renderContent = () => {
        if (!insights) return null;

        const trimmedInsights = insights.trim();
        if (trimmedInsights.startsWith('*')) {
            const items = trimmedInsights.split('*').map(s => s.trim()).filter(Boolean);
            return (
                <ul className="list-disc list-inside space-y-2 text-sm text-text-secondary">
                    {items.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            );
        }

        const paragraphs = trimmedInsights.split(/\n+/).filter(p => p.trim() !== '');
        return (
            <div className="space-y-4 text-sm text-text-secondary">
                {paragraphs.map((para, index) => <p key={index}>{para}</p>)}
            </div>
        );
    };

    return (
        <Card title="Insights" icon="lightbulb">
            {renderContent()}
        </Card>
    );
};

const QuickQACard: React.FC<{ questions: { question: string; answer: string; }[] | undefined }> = ({ questions }) => {
    if (!questions || questions.length === 0) return null;

    return (
        <Card title="Dúvidas Rápidas" icon="quiz">
            <div className="space-y-4 text-sm">
                {questions.map((qa, index) => (
                    <div key={index}>
                        <p className="font-semibold text-text">{qa.question}</p>
                        <p className="text-text-secondary">{qa.answer}</p>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const ExecutiveSummaryCard: React.FC<{ summary: string | undefined }> = ({ summary }) => {
    return (
        <Card title="Resumo Executivo" icon="article">
            <p className="text-text-secondary text-sm">{summary}</p>
        </Card>
    );
};

const ChartCard: React.FC<{ chartInfo: AnalysisResult['suggestedChart'] | undefined, data: DataRow[] | null }> = ({ chartInfo, data }) => {
    return (
        <Card title="Visualização Sugerida" icon="bar_chart" className="overflow-hidden">
            {chartInfo && data ? <ChartRenderer chartInfo={chartInfo} data={data} /> : <p>Carregando gráfico...</p>}
        </Card>
    );
};

const App: React.FC = () => {
  useTheme(); // Initialize theme hook
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [insights, setInsights] = useState<AnalysisResult | null>(null);
  const [excelData, setExcelData] = useState<DataRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [analysisHistory, setAnalysisHistory] = useState<HistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Load user from local storage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem('app_currentUser');
    if (storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        if (parsedUser.name && parsedUser.email) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem('app_currentUser');
        }
      } catch (e) {
        localStorage.removeItem('app_currentUser');
      }
    }
  }, []);
  
  // Load and save history based on the current user
  useEffect(() => {
    if (user) {
      // Load history for the logged-in user
      const storedHistory = localStorage.getItem(`analysis_history_${user.email}`);
      if (storedHistory) {
        setAnalysisHistory(JSON.parse(storedHistory));
      } else {
        setAnalysisHistory([]);
      }
    } else {
      // Clear history when no user is logged in
      setAnalysisHistory([]);
    }
  }, [user]);

  // Persist history to localStorage whenever it changes for the logged-in user
  useEffect(() => {
    if (user && analysisHistory.length > 0) {
      localStorage.setItem(`analysis_history_${user.email}`, JSON.stringify(analysisHistory));
    }
     else if (user && analysisHistory.length === 0) {
      // If user deletes all history, remove the key from storage
      localStorage.removeItem(`analysis_history_${user.email}`);
    }
  }, [analysisHistory, user]);

  const handleLogout = () => {
    localStorage.removeItem('app_currentUser');
    setUser(null);
    handleNewInsight();
  };
  
  const handleAuthSuccess = (authedUser: User) => {
    setUser(authedUser);
  };
  
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleNewInsight = () => {
    setFile(null);
    setIsLoading(false);
    setInsights(null);
    setExcelData(null);
    setError(null);
    setFileName(null);
    setActiveHistoryId(null);
  };

  const handleSelectHistory = (id: string) => {
    const selected = analysisHistory.find(item => item.id === id);
    if (selected) {
      setInsights(selected.insights);
      setExcelData(selected.data);
      setFileName(selected.fileName);
      setFile(null);
      setError(null);
      setIsLoading(false);
      setActiveHistoryId(id);
    }
  };
  
    const handleDeleteHistory = (idToDelete: string) => {
        setAnalysisHistory(prev => prev.filter(item => item.id !== idToDelete));
        if (activeHistoryId === idToDelete) {
            handleNewInsight();
        }
    };

    const handleRenameHistory = (idToRename: string, newTitle: string) => {
        setAnalysisHistory(prev => 
            prev.map(item => 
                item.id === idToRename 
                ? { ...item, insights: { ...item.insights, dashboardTitle: newTitle } } 
                : item
            )
        );
        if (activeHistoryId === idToRename) {
            setInsights(prev => prev ? { ...prev, dashboardTitle: newTitle } : null);
        }
    };

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile) {
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      if (validExtensions.includes(fileExtension)) {
        setFile(selectedFile);
        setFileName(selectedFile.name);
        setError(null);
        setInsights(null);
        setExcelData(null);
      } else {
        setError('Por favor, envie um arquivo Excel válido (.xlsx ou .xls).');
        setFile(null);
        setFileName(null);
      }
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!file) {
      setError('Por favor, selecione um arquivo primeiro.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setInsights(null);
    setExcelData(null);
    setActiveHistoryId(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          const jsonData: DataRow[] = XLSX.utils.sheet_to_json(worksheet);
          const csvData = XLSX.utils.sheet_to_csv(worksheet);

          if (!csvData || csvData.trim() === '') {
            throw new Error("O arquivo Excel parece estar vazio ou não pôde ser lido.");
          }

          setExcelData(jsonData);
          const result = await analyzeExcelData(csvData);
          setInsights(result);

          const newId = Date.now().toString();
          const newHistoryEntry: HistoryEntry = {
            id: newId,
            fileName: file.name,
            insights: result,
            data: jsonData,
          };
          setAnalysisHistory(prev => [newHistoryEntry, ...prev]);
          setActiveHistoryId(newId);

        } catch (innerError: any) {
          setError(`Falha ao processar o arquivo: ${innerError.message}`);
          setExcelData(null);
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Ocorreu um erro ao ler o arquivo.');
        setIsLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (e: any)
      {
      setError(`Um erro inesperado ocorreu: ${e.message}`);
      setIsLoading(false);
    }
  }, [file]);

  const showDashboard = excelData || isLoading || error;

  const renderDashboardComponent = (componentKey: string) => {
    switch (componentKey) {
        case 'EXECUTIVE_SUMMARY':
            return <ExecutiveSummaryCard summary={insights?.executiveSummary} />;
        case 'KEY_INSIGHTS':
            return <KeyInsightsCard insights={insights?.keyInsights} />;
        case 'CHART':
            return <ChartCard chartInfo={insights?.suggestedChart} data={excelData} />;
        case 'QUICK_QA':
            return <QuickQACard questions={insights?.quickQuestions} />;
        default:
            return null;
    }
  };
  
  const componentsToRender = insights?.layout.flatMap(row => row.cells);

  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="bg-background min-h-screen text-text">
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        user={user}
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        dashboardRef={dashboardRef}
        title={insights?.dashboardTitle}
      />
      <ChatGPTSidebar 
        history={analysisHistory}
        activeId={activeHistoryId}
        onNewInsight={handleNewInsight}
        onSelectHistory={handleSelectHistory}
        onDeleteHistory={handleDeleteHistory}
        onRenameHistory={handleRenameHistory}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        user={user}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <div className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-16'}`}>
        <Header 
          title={insights?.dashboardTitle || null}
          onOpenShareModal={() => setIsShareModalOpen(true)}
        />
        <main className="flex-grow container mx-auto px-6 py-8 flex flex-col">
          {!showDashboard ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center">
              <div className="max-w-xl">
                <h2 className="text-3xl font-bold mb-2 text-text">Diagnóstico Rápido de Dados</h2>
                <p className="text-lg text-text-secondary mb-8">Faça o upload da sua planilha para descobrir tendências e insights chave em segundos.</p>
                <div className="w-full max-w-md mx-auto">
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    onAnalyze={handleAnalyze}
                    isLoading={isLoading}
                    fileName={fileName}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-card p-6 rounded-xl shadow-sm">
                  <div className="p-4 bg-red-50 text-red-800 rounded-md dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-500/30">
                    <h3 className="font-semibold mb-2 flex items-center"><span className="material-icons mr-2">error</span>Ocorreu um Erro</h3>
                    <p>{error}</p>
                  </div>
                </div>
              )}
              <div ref={dashboardRef} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {isLoading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                {!isLoading && componentsToRender?.map(({ componentKey, width }) => (
                  <div key={componentKey} className={width === 2 ? 'md:col-span-2' : 'md:col-span-1'}>
                    {renderDashboardComponent(componentKey)}
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default App;