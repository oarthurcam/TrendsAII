import React, { useState, useRef, useEffect } from 'react';
import { chatWithData, DashboardChart, ChatChart } from '../services/geminiService';
import { DataRow } from '../App';
import { ChartRenderer } from './ChartRenderer';

declare const XLSX: any;

export interface Message {
    sender: 'user' | 'ai';
    text: string;
    chart?: ChatChart;
}

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: DataRow[] | null;
    initialFileName: string | null;
    activeId: string | null;
    savedMessages?: Message[];
    onUpdateMessages: (messages: Message[]) => void;
}

const DEFAULT_MESSAGES: Message[] = [
    { sender: 'ai', text: 'Olá! 👋 Sou sua assistente de IA. \n\nVocê pode carregar planilhas 📊 ou documentos 📄 (PDF, Word, etc.) para que eu analise.\n\nExperimente clicar no botão **+** abaixo para começar!' }
];

// Helper to convert file to Base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64String = result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
    });
};

// Helper function for text formatting (Markdown to HTML)
const parseMarkdownToHtml = (text: string) => {
    let content = text;
    // Escape HTML
    content = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Headers
    content = content.replace(/^### (.*$)/gim, '<h3 class="text-md font-bold text-text mt-3 mb-2">$1</h3>');
    content = content.replace(/^#### (.*$)/gim, '<h4 class="text-sm font-semibold text-text mt-2 mb-1">$1</h4>');

    // Bold/Italic
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/\*(.*?)\*/g, (match, p1) => {
        if (content.includes('\n*')) return p1; 
        return `<em>${p1}</em>`;
    });
    
    // Lists
    if (content.match(/^(?:-|\*) /m)) {
            const lines = content.split('\n');
            let inList = false;
            let newContent = '';
            
            lines.forEach(line => {
                const listMatch = line.match(/^(\s*)(?:-|\*) (.*)/);
                if (listMatch) {
                    if (!inList) {
                        newContent += '<ul class="list-disc list-inside space-y-1 mb-2 ml-1">';
                        inList = true;
                    }
                    newContent += `<li>${listMatch[2]}</li>`;
                } else {
                    if (inList) {
                        newContent += '</ul>';
                        inList = false;
                    }
                    if (line.trim().startsWith('<h')) {
                    newContent += line;
                    } else if (line.trim() !== '') {
                    newContent += `<div class="mb-1">${line}</div>`;
                    }
                }
            });
            if (inList) newContent += '</ul>';
            content = newContent;
    } else {
            content = content.replace(/\n/g, '<br />');
    }
    return content;
};

// Reusable render function for message content
const renderMessageText = (text: string) => {
    const htmlContent = parseMarkdownToHtml(text);
    return <div className="leading-relaxed" dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};

// Typewriter Component
const Typewriter: React.FC<{ text: string }> = ({ text }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        let i = 0;
        setDisplayedText(''); // Reset on text change
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(prev => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(timer);
            }
        }, 15); // Adjust speed here (lower = faster)
        return () => clearInterval(timer);
    }, [text]);

    return renderMessageText(displayedText);
};

interface ChatContext {
    type: 'csv' | 'document';
    data: string; // CSV text or Base64
    mimeType?: string; // e.g. 'application/pdf'
    localJsonData?: DataRow[]; // Only for Excel/CSV to render local charts
    fileName: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose, initialData, initialFileName, activeId, savedMessages, onUpdateMessages }) => {
    const [messages, setMessages] = useState<Message[]>(savedMessages || DEFAULT_MESSAGES);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Unified context state
    const [activeContext, setActiveContext] = useState<ChatContext | null>(null);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Data loading (Legacy support for App.tsx passing Excel data directly)
    useEffect(() => {
        if (initialData && initialFileName) {
            // If the main app passed Excel data, we construct a CSV context
            try {
                const worksheet = XLSX.utils.json_to_sheet(initialData);
                const csvData = XLSX.utils.sheet_to_csv(worksheet);
                setActiveContext({
                    type: 'csv',
                    data: csvData,
                    localJsonData: initialData,
                    fileName: initialFileName
                });
            } catch (e) {
                console.error("Error converting initial data to CSV context", e);
            }
        }
    }, [initialData, initialFileName]);

    // Restore messages when switching active history item
    useEffect(() => {
        if (savedMessages && savedMessages.length > 0) {
            setMessages(savedMessages);
        } else {
            setMessages(DEFAULT_MESSAGES);
        }
        setIsLoading(false);
        setInputValue('');
    }, [activeId, savedMessages]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isOpen, displayedTextLength(messages)]); // Add dependency on displayed text changes implicitly

    // Helper to trigger scroll during typewriter effect
    function displayedTextLength(msgs: Message[]) {
        return msgs.reduce((acc, m) => acc + m.text.length, 0);
    }

    const updateMessages = (newMessages: Message[]) => {
        setMessages(newMessages);
        onUpdateMessages(newMessages);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);

        try {
            const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
            const isCsv = file.name.endsWith('.csv');

            if (isExcel || isCsv) {
                // EXCEL/CSV LOGIC
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = event.target?.result;
                        const workbook = XLSX.read(data, { type: 'array' });
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        const newJsonData: DataRow[] = XLSX.utils.sheet_to_json(worksheet);
                        const csvData = XLSX.utils.sheet_to_csv(worksheet);

                        if (newJsonData.length === 0) {
                            const errorMsg: Message = { sender: 'ai', text: `O arquivo "${file.name}" parece estar vazio.` };
                            updateMessages([...messages, errorMsg]);
                            setIsLoading(false);
                            return;
                        }

                        setActiveContext({
                            type: 'csv',
                            data: csvData,
                            localJsonData: newJsonData,
                            fileName: file.name
                        });

                        const successMsg: Message = { sender: 'ai', text: `Planilha "${file.name}" carregada! 📊\n\nPronta para analisar dados e criar gráficos.` };
                        updateMessages([...messages, successMsg]);
                        setIsLoading(false);

                    } catch (error) {
                        console.error("Error processing Excel:", error);
                        const errorMsg: Message = { sender: 'ai', text: `Erro ao processar planilha "${file.name}".` };
                        updateMessages([...messages, errorMsg]);
                        setIsLoading(false);
                    }
                };
                reader.readAsArrayBuffer(file);

            } else {
                // DOCUMENT LOGIC (PDF, DOCX, ETC)
                const base64 = await fileToBase64(file);
                
                setActiveContext({
                    type: 'document',
                    data: base64,
                    mimeType: file.type || 'application/pdf', // Fallback
                    fileName: file.name,
                    localJsonData: undefined // No local rows for docs
                });

                const successMsg: Message = { sender: 'ai', text: `Documento "${file.name}" carregado! 📄\n\nPosso resumir o conteúdo, encontrar riscos ou responder perguntas sobre o texto.` };
                updateMessages([...messages, successMsg]);
                setIsLoading(false);
            }

        } catch (error) {
            console.error("Upload error:", error);
            const errorMsg: Message = { sender: 'ai', text: `Não foi possível ler o arquivo "${file.name}".` };
            updateMessages([...messages, errorMsg]);
            setIsLoading(false);
        }
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading || !activeContext) return;

        const userMessage: Message = { sender: 'user', text: inputValue };
        const newMessagesWithUser = [...messages, userMessage];
        
        updateMessages(newMessagesWithUser);
        setInputValue('');
        setIsLoading(true);

        try {
            // Call service with unified context
            const responseText = await chatWithData(inputValue, {
                type: activeContext.type,
                data: activeContext.data,
                mimeType: activeContext.mimeType
            });

            // Parse for charts
            const chartJsonRegex = /<chart_json>([\s\S]*?)<\/chart_json>/;
            const match = responseText.match(chartJsonRegex);

            let aiText = responseText;
            let chartDataRes: ChatChart | undefined = undefined;

            if (match && match[1]) {
                try {
                    chartDataRes = JSON.parse(match[1]);
                    aiText = responseText.replace(chartJsonRegex, '').trim();
                    if (!aiText) {
                        aiText = "Aqui está a visualização solicitada:"
                    }
                } catch (e) {
                    console.error("Failed to parse chart JSON", e);
                }
            }

            const finalChart = (chartDataRes && activeContext.localJsonData) ? chartDataRes : undefined;

            const aiMessage: Message = { sender: 'ai', text: aiText, chart: finalChart };
            updateMessages([...newMessagesWithUser, aiMessage]);

        } catch (e: any) {
            const errorMessage: Message = { sender: 'ai', text: `Desculpe, ocorreu um erro: ${e.message}` };
            updateMessages([...newMessagesWithUser, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    }
    
    return (
        <>
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                ></div>
            )}
            <aside 
                className={`fixed top-0 right-0 z-50 bg-card text-text flex flex-col h-screen w-[350px] max-w-full border-l border-border shadow-2xl transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                `}
            >
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-full">
                             <span className="material-icons text-primary text-xl">smart_toy</span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg leading-tight">Trends Chat</h3>
                            <p className="text-xs text-text-secondary">
                                {activeContext ? (
                                    <span className="truncate block max-w-[200px]" title={activeContext.fileName}>
                                        {activeContext.fileName}
                                    </span>
                                ) : 'Nenhum arquivo ativo'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-500/10 text-text-secondary hover:text-text transition-colors">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Chat Messages Area */}
                <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4 text-sm bg-background/50">
                    {messages.map((msg, index) => {
                        // Check if this is the latest AI message to animate
                        const isLastAiMessage = index === messages.length - 1 && msg.sender === 'ai' && !isLoading;
                        
                        return (
                            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-card border border-border text-text rounded-tl-none shadow-sm'}`}>
                                    {isLastAiMessage ? (
                                        <Typewriter text={msg.text} />
                                    ) : (
                                        renderMessageText(msg.text)
                                    )}
                                    {msg.chart && activeContext?.localJsonData && (
                                        <div className="mt-4 bg-background rounded-lg p-2 h-48 border border-border">
                                            <ChartRenderer 
                                                chartInfo={{
                                                    title: msg.chart.title,
                                                    type: msg.chart.type,
                                                    x_axis_column: msg.chart.x_axis_column,
                                                    y_axis_columns: [msg.chart.y_axis_column]
                                                } as DashboardChart} 
                                                data={activeContext.localJsonData} 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-xs p-4 rounded-2xl bg-card border border-border rounded-tl-none shadow-sm">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-border bg-card">
                    <div className="flex items-end gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".xlsx, .xls, .csv, .pdf, .docx, .txt, .pptx, .odt"
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className="p-2.5 text-text-secondary rounded-lg hover:bg-slate-500/10 transition-colors disabled:opacity-50 flex-shrink-0"
                            title="Carregar arquivo"
                            disabled={isLoading}
                        >
                            <span className="material-icons text-xl">add_circle_outline</span>
                        </button>
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={activeContext ? "Pergunte sobre o arquivo..." : "Carregue um arquivo para começar"}
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary pr-10 transition-all"
                                disabled={isLoading || !activeContext}
                            />
                        </div>
                        <button 
                            onClick={handleSendMessage} 
                            disabled={isLoading || !inputValue.trim() || !activeContext} 
                            className="p-2.5 bg-primary text-white rounded-xl disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors shadow-sm flex-shrink-0"
                        >
                            <span className="material-icons text-xl">send</span>
                        </button>
                    </div>
                    <p className="text-[10px] text-text-secondary text-center mt-2 opacity-70">
                        Suporta Excel, PDF, Word, PPTX e Texto.
                    </p>
                </div>
            </aside>
        </>
    );
};