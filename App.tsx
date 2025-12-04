import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { analyzeExcelData, analyzeDocument, AnalysisResult, DashboardAnalysisResult } from './services/geminiService';
import { Footer } from './components/Footer';
import { ShareModal } from './components/ShareModal';
import { DashboardDisplay } from './components/DashboardDisplay';
import { InsightsDisplay } from './components/InsightsDisplay';
import { ChatSidebar, Message } from './components/ChatSidebar';
import { LoadingState } from './components/LoadingState';
import { EditCardModal } from './components/EditCardModal';

// TypeScript declaration for the libraries loaded from CDN
declare const XLSX: any;

// Define a type for the parsed Excel data
export type DataRow = { [key: string]: string | number };

type ActiveView = 'insights' | 'dashboards';

// Define a type for history entries
interface HistoryEntry {
  id: string;
  fileName: string;
  insights: AnalysisResult | DashboardAnalysisResult;
  data: DataRow[] | null; // Data might be null for non-Excel files
  type: ActiveView;
  chatMessages?: Message[];
}

interface ChatGPTSidebarProps {
    history: HistoryEntry[];
    activeId: string | null;
    onNewInsight: () => void;
    onGoToDashboards: () => void;
    activeView: ActiveView;
    onSelectHistory: (id: string) => void;
    onDeleteHistory: (id: string) => void;
    onRenameHistory: (id: string, newTitle: string) => void;
    isOpen: boolean;
    onToggle: () => void;
}

const ChatGPTSidebar: React.FC<ChatGPTSidebarProps> = ({ history, activeId, onNewInsight, onGoToDashboards, activeView, onSelectHistory, onDeleteHistory, onRenameHistory, isOpen, onToggle }) => {
    const [popoverState, setPopoverState] = useState<{ id: string | null; x: number; y: number }>({ id: null, x: 0, y: 0 });
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const renameInputRef = useRef<HTMLInputElement>(null);

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

    const insightsHistory = history.filter(item => item.type === 'insights');
    const dashboardsHistory = history.filter(item => item.type === 'dashboards');

    const renderHistoryItem = (item: HistoryEntry) => (
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
    );

    return (
        <>
            {isOpen && (
                <div
                    onClick={onToggle}
                    className="fixed inset-0 bg-black/40 z-30 lg:hidden"
                    aria-hidden="true"
                ></div>
            )}
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
            <aside className={`fixed top-0 left-0 z-40 bg-sidebar text-text flex flex-col h-screen border-r border-border transition-transform lg:transition-all duration-300 ease-in-out
                ${isOpen 
                    ? 'translate-x-0 w-[260px] p-2' 
                    : '-translate-x-full w-[260px] p-2 lg:p-0 lg:translate-x-0 lg:w-16 lg:items-center lg:py-4'}
            `}>
                {isOpen ? (
                    <div className="flex flex-col h-full w-full overflow-hidden">
                        <div className="flex-shrink-0">
                            <div className="flex justify-end items-center p-2 mb-1">
                                <button onClick={onToggle} className="p-2 rounded-md hover:bg-slate-500/10">
                                    <span className="material-icons text-xl text-primary">menu_open</span>
                                </button>
                            </div>
                            <div className="p-1">
                                <button onClick={onNewInsight} className={`w-full text-left flex items-center space-x-4 p-3 rounded-md transition-colors ${activeView === 'insights' ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-slate-500/10 hover:text-primary'}`}>
                                    <span className="material-icons text-base">create</span>
                                    <span className="text-sm">Novo Diagnóstico</span>
                                </button>
                            </div>
                            <div className="p-1">
                                <button onClick={onGoToDashboards} className={`w-full text-left flex items-center space-x-4 p-3 rounded-md transition-colors ${activeView === 'dashboards' ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-slate-500/10 hover:text-primary'}`}>
                                    <span className="material-icons text-base">dashboard</span>
                                    <span className="text-sm">Dashboards</span>
                                </button>
                            </div>
                        </div>

                        <div className="my-2 border-t border-border"></div>
                        
                        <div className="flex-grow overflow-y-auto px-1">
                            {insightsHistory.length > 0 && (
                                <div className="space-y-1">
                                    <h3 className="text-xs font-medium text-text-secondary/70 px-3 pt-2 pb-1">Histórico</h3>
                                    {insightsHistory.map(renderHistoryItem)}
                                </div>
                            )}
                            {dashboardsHistory.length > 0 && (
                                <div className="space-y-1">
                                    {insightsHistory.length > 0 && <div className="my-2 border-t border-border -mx-1"></div>}
                                    <h3 className="text-xs font-medium text-text-secondary/70 px-3 pt-2 pb-1">Dashboards</h3>
                                    {dashboardsHistory.map(renderHistoryItem)}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full w-full items-center justify-start flex-col pt-2">
                        <button onClick={onToggle} className="p-2 rounded-md hover:bg-slate-500/10">
                            <span className="material-icons text-xl text-primary">menu</span>
                        </button>
                    </div>
                )}
            </aside>
        </>
    );
};

// Helper to convert file to Base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
            const base64String = result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
    });
};

const INSIGHTS_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.pdf', '.docx', '.doc', '.txt', '.pptx', '.ppt', '.odt'];
const DASHBOARD_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

interface EditingItemState {
    type: 'kpi' | 'chart';
    data: any; // The KPI object or Chart Config object
    path: string; // Identifier path to locate object in state (e.g., 'kpis.0' or 'sections.2')
}

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [insights, setInsights] = useState<AnalysisResult | DashboardAnalysisResult | null>(null);
  const [excelData, setExcelData] = useState<DataRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('insights');

  const [analysisHistory, setAnalysisHistory] = useState<HistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // New state for Chat Sidebar
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  
  // Edit Mode States
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItemState | null>(null);
  
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Load history from local storage on initial render
  useEffect(() => {
    const storedHistory = localStorage.getItem('analysis_history');
    if (storedHistory) {
      try {
        const parsedHistory: HistoryEntry[] = JSON.parse(storedHistory);
        // Migration for old history items without a 'type'
        const migratedHistory = parsedHistory.map(item => ({
          ...item,
          type: item.type || 'insights' 
        }));
        setAnalysisHistory(migratedHistory);
      } catch (e) {
        console.error("Failed to parse history from localStorage", e);
        localStorage.removeItem('analysis_history');
      }
    }
  }, []);

  // Persist history to localStorage whenever it changes
  useEffect(() => {
    if (analysisHistory.length > 0) {
      localStorage.setItem('analysis_history', JSON.stringify(analysisHistory));
    } else {
      localStorage.removeItem('analysis_history');
    }
  }, [analysisHistory]);
  
  // Update document title based on the active view
  useEffect(() => {
    if (activeView === 'dashboards') {
      document.title = 'TrendsAI | Dashboards Rápidos';
    } else {
      document.title = 'TrendsBI | Diagnóstico Inteligente';
    }
  }, [activeView]);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const resetState = () => {
    setFile(null);
    setIsLoading(false);
    setInsights(null);
    setExcelData(null);
    setError(null);
    setFileName(null);
    setActiveHistoryId(null);
    setIsEditMode(false);
  };

  const handleNewInsight = () => {
    resetState();
    setActiveView('insights');
  };

  const handleGoToDashboards = () => {
    resetState();
    setActiveView('dashboards');
  };

  const handleSelectHistory = (id: string) => {
    const selected = analysisHistory.find(item => item.id === id);
    if (selected) {
      setInsights(selected.insights);
      setExcelData(selected.data); // Note: data might be null for documents
      setFileName(selected.fileName);
      setFile(null);
      setError(null);
      setIsLoading(false);
      setActiveHistoryId(id);
      setActiveView(selected.type); // Switch view to match the selected history item
      setIsEditMode(false);
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

    const handleUpdateChatHistory = (newMessages: Message[]) => {
        if (!activeHistoryId) return;
        
        setAnalysisHistory(prev => 
            prev.map(item => 
                item.id === activeHistoryId
                ? { ...item, chatMessages: newMessages }
                : item
            )
        );
    };

  // --- EDIT MODE HANDLERS ---

  const handleDeleteItem = (path: string) => {
    if (!insights) return;

    const newInsights = JSON.parse(JSON.stringify(insights));
    const parts = path.split('.');
    
    // Logic for Dashboard View (Legacy)
    if (activeView === 'dashboards' && 'kpis' in newInsights) {
        if (parts[0] === 'kpis') {
            const index = parseInt(parts[1], 10);
            newInsights.kpis.splice(index, 1);
        } else if (parts[0] === 'charts') {
            const chartKey = parts[1];
            // Since charts is an object with fixed keys in the type definition, 
            // but we want to "remove" it visually, we can set it to null or undefined.
            // However, the renderer expects valid keys. 
            // A safer way for this strict type is to filter it out in the display or replace with a placeholder?
            // For now, let's delete the key. The component checks if chartInfo exists.
            delete newInsights.charts[chartKey];
        }
    } 
    // Logic for Insights View (Sections)
    else if ('sections' in newInsights) {
        if (parts[0] === 'sections') {
            const index = parseInt(parts[1], 10);
            newInsights.sections.splice(index, 1);
        }
    }
    
    setInsights(newInsights);
    updateHistoryWithInsights(newInsights);
  };

  const handleEditItem = (path: string, type: 'kpi' | 'chart', data: any) => {
    setEditingItem({ path, type, data });
  };

  const handleSaveEdit = (newData: any) => {
    if (!insights || !editingItem) return;

    const newInsights = JSON.parse(JSON.stringify(insights));
    const parts = editingItem.path.split('.');

    // Traverse to the object to update
    let current = newInsights;
    for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
    }
    
    // Update
    current[parts[parts.length - 1]] = newData;

    // For chart updates inside sections, we need to ensure config structure
    if (editingItem.path.includes('sections') && editingItem.type === 'chart') {
         // The modal saves chart config, we need to make sure it maps back to chartConfig
         // Actually, if we passed 'section.chartConfig' as data, 'newData' is the new config.
         // 'current' is the 'sections' array, parts last is index.
         // Wait, if path is 'sections.0', current[0] is the section object.
         // We shouldn't replace the section object with chart data.
         // We should update section.chartConfig.
         
         // Let's refine handleEditItem to pass the specific object data but keep path pointing to parent if needed?
         // Simpler: Just update the specific property.
         // In handleEditItem call for sections, we pass path 'sections.0.chartConfig'.
         // Then the logic above works: current is section object, key is 'chartConfig'.
    }

    setInsights(newInsights);
    updateHistoryWithInsights(newInsights);
    setEditingItem(null);
  };

  const updateHistoryWithInsights = (newInsights: any) => {
      if (activeHistoryId) {
          setAnalysisHistory(prev => prev.map(h => 
              h.id === activeHistoryId ? { ...h, insights: newInsights } : h
          ));
      }
  };

  // --------------------------

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile) {
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      const validExtensions = activeView === 'dashboards' ? DASHBOARD_EXTENSIONS : INSIGHTS_EXTENSIONS;

      if (validExtensions.includes(fileExtension)) {
        setFile(selectedFile);
        setFileName(selectedFile.name);
        setError(null);
        setInsights(null);
        setExcelData(null);
      } else {
        if (activeView === 'dashboards') {
            setError('Formato não suportado para Dashboards. Por favor envie arquivos Excel ou CSV.');
        } else {
            setError('Formato não suportado. Por favor envie Excel, PDF, Word, PowerPoint ou Texto.');
        }
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
    setIsEditMode(false);

    const isSpreadsheet = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');

    try {
        let result: AnalysisResult | DashboardAnalysisResult;
        let processedData: DataRow[] | null = null;

        if (isSpreadsheet) {
             // Logic for Excel/CSV files (Client-side Parsing)
             await new Promise<void>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const data = event.target?.result;
                        const workbook = XLSX.read(data, { type: 'array' });
                        
                        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                             reject(new Error("O arquivo Excel não possui abas visíveis ou está vazio."));
                             return;
                        }
                        
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        
                        const jsonData: DataRow[] = XLSX.utils.sheet_to_json(worksheet);
                        const csvData = XLSX.utils.sheet_to_csv(worksheet);

                        if (!csvData || csvData.trim() === '') {
                             reject(new Error("O arquivo parece estar vazio."));
                             return;
                        }

                        processedData = jsonData;
                        setExcelData(jsonData);
                        result = await analyzeExcelData(csvData, activeView);
                        setInsights(result);
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = () => reject(new Error("Erro ao ler arquivo."));
                reader.readAsArrayBuffer(file);
             });
        } else {
            // Logic for Documents (PDF, Word, etc.) - Server-side / Multimodal Analysis
            if (activeView === 'dashboards') {
                 // Force fallback or error if dashboard view somehow gets a document
                 throw new Error("Dashboards só podem ser gerados a partir de planilhas Excel ou CSV.");
            }
            
            const base64Data = await fileToBase64(file);
            result = await analyzeDocument(base64Data, file.type || 'application/octet-stream');
            setInsights(result);
        }

        // Add to history (common for both types)
        // Note: result! is safe here because we await the operations above
        setInsights(currentInsights => {
             const newId = Date.now().toString();
             const newHistoryEntry: HistoryEntry = {
                id: newId,
                fileName: file.name,
                insights: currentInsights as AnalysisResult | DashboardAnalysisResult,
                data: processedData, // Will be null for documents
                type: activeView === 'dashboards' && !isSpreadsheet ? 'insights' : activeView, // Fallback check
                chatMessages: [], 
              };
              setAnalysisHistory(prev => [newHistoryEntry, ...prev]);
              setActiveHistoryId(newId);
              return currentInsights;
        });

    } catch (e: any) {
        setError(`Falha ao processar o arquivo: ${e.message}`);
        setIsLoading(false);
    } finally {
        setIsLoading(false);
    }
  }, [file, activeView]);

  const showResults = insights || isLoading || error;
  
  // Check if we have data suitable for the legacy dashboard view
  const isDashboardView = activeView === 'dashboards' && insights && 'kpis' in insights;

  // Retrieve messages for current history item
  const currentChatMessages = activeHistoryId 
      ? analysisHistory.find(h => h.id === activeHistoryId)?.chatMessages 
      : undefined;

  return (
    <div className="bg-background min-h-screen text-text relative">
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        dashboardRef={dashboardRef}
        title={insights?.dashboardTitle}
      />
      
      <EditCardModal 
        isOpen={!!editingItem} 
        onClose={() => setEditingItem(null)} 
        onSave={handleSaveEdit}
        item={editingItem?.data}
        type={editingItem?.type || 'chart'}
        availableColumns={excelData && excelData.length > 0 ? Object.keys(excelData[0]) : []}
      />

      <ChatSidebar 
        isOpen={isChatSidebarOpen} 
        onClose={() => setIsChatSidebarOpen(false)}
        initialData={excelData}
        initialFileName={fileName}
        activeId={activeHistoryId}
        savedMessages={currentChatMessages}
        onUpdateMessages={handleUpdateChatHistory}
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
        activeView={activeView}
        onGoToDashboards={handleGoToDashboards}
      />
      <div className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-16'} ${isChatSidebarOpen ? 'lg:mr-[350px]' : ''}`}>
        <Header 
          title={insights?.dashboardTitle || null}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onToggleSidebar={toggleSidebar}
          onToggleChat={() => setIsChatSidebarOpen(prev => !prev)}
          onToggleEditMode={() => setIsEditMode(prev => !prev)}
          isChatOpen={isChatSidebarOpen}
          isEditMode={isEditMode}
        />
        <main className="flex-grow container mx-auto px-6 py-8 flex flex-col">
          {!showResults ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center">
              {activeView === 'insights' ? (
                <div className="max-w-xl">
                  <h2 className="text-3xl font-bold mb-2 text-text">Diagnóstico Rápido de Dados</h2>
                  <p className="text-lg text-text-secondary mb-8">Faça o upload de documentos ou planilhas para descobrir tendências e insights chave em segundos.</p>
                  <div className="w-full max-w-md mx-auto">
                    <FileUpload
                      onFileSelect={handleFileSelect}
                      onAnalyze={handleAnalyze}
                      isLoading={isLoading}
                      fileName={fileName}
                      acceptedFormats={INSIGHTS_EXTENSIONS}
                      helperText="Documentos e Planilhas"
                    />
                  </div>
                </div>
              ) : (
                <div className="max-w-xl">
                  <h2 className="text-3xl font-bold mb-2 text-text">Dashboards rápidos, sem esforço!</h2>
                  <p className="text-lg text-text-secondary mb-8">Transforme suas planilhas Excel ou CSV em dashboards dinâmicos com apenas um clique.</p>
                  <div className="w-full max-w-md mx-auto">
                    <FileUpload
                      onFileSelect={handleFileSelect}
                      onAnalyze={handleAnalyze}
                      isLoading={isLoading}
                      fileName={fileName}
                      ctaText="Crie seu dashboard agora"
                      icon="space_dashboard"
                      acceptedFormats={DASHBOARD_EXTENSIONS}
                      helperText="Arquivos Excel e CSV"
                    />
                  </div>
                </div>
              )}
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
              <div ref={dashboardRef} className="w-full">
                {isLoading ? (
                  <LoadingState />
                ) : (
                  insights && (
                    isDashboardView ? 
                    <DashboardDisplay 
                        dashboard={insights as DashboardAnalysisResult} 
                        data={excelData || []} 
                        isEditMode={isEditMode}
                        onDelete={handleDeleteItem}
                        onEdit={handleEditItem}
                    /> :
                    <InsightsDisplay 
                        insights={insights as AnalysisResult} 
                        data={excelData || []} 
                        fileName={fileName} 
                        isEditMode={isEditMode}
                        onDelete={handleDeleteItem}
                        onEdit={handleEditItem}
                    />
                  )
                )}
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