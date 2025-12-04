import React, { useState, useRef, useEffect } from 'react';
import { chatWithData, AnalysisResult, DashboardChart, ChatChart } from '../services/geminiService';
import { DataRow } from '../App';
import { ChartRenderer } from './ChartRenderer';

declare const XLSX: any;

interface Message {
    sender: 'user' | 'ai';
    text: string;
    chart?: ChatChart;
}

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

interface InteractiveChatCardProps {
  initialData: DataRow[];
  initialFileName: string | null;
}

export const InteractiveChatCard: React.FC<InteractiveChatCardProps> = ({ initialData, initialFileName }) => {
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'ai', text: 'Olá! 👋 Sou sua assistente de IA. \n\nVocê pode:\n🔍 **Fazer perguntas**\nEx: "Qual o maior custo?"\n\n📊 **Pedir gráficos**\nEx: "Crie um gráfico de pizza."\n\nÉ só digitar abaixo! 👇' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatData, setChatData] = useState(initialData);
    const [currentFileName, setCurrentFileName] = useState(initialFileName);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const newJsonData: DataRow[] = XLSX.utils.sheet_to_json(worksheet);

                if (newJsonData.length === 0) {
                    setMessages(prev => [...prev, { sender: 'ai', text: `O arquivo "${file.name}" parece estar vazio.` }]);
                    return;
                }

                setChatData(newJsonData);
                setCurrentFileName(file.name);
                setMessages([
                    { sender: 'ai', text: `Arquivo "${file.name}" carregado com sucesso! ✅\n\nAgora você pode fazer perguntas sobre estes novos dados.` }
                ]);

            } catch (error) {
                console.error("Error processing new file:", error);
                setMessages(prev => [...prev, { sender: 'ai', text: `Houve um erro ao processar o arquivo "${file.name}".` }]);
            }
        };
        reader.onerror = () => {
             setMessages(prev => [...prev, { sender: 'ai', text: `Não foi possível ler o arquivo "${file.name}".` }]);
        };
        reader.readAsArrayBuffer(file);
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = { sender: 'user', text: inputValue };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const worksheet = XLSX.utils.json_to_sheet(chatData);
            const csvData = XLSX.utils.sheet_to_csv(worksheet);
            
            const responseText = await chatWithData(inputValue, {
                type: 'csv',
                data: csvData
            });

            const chartJsonRegex = /<chart_json>([\s\S]*?)<\/chart_json>/;
            const match = responseText.match(chartJsonRegex);

            let aiText = responseText;
            let chartDataRes: ChatChart | undefined = undefined;

            if (match && match[1]) {
                try {
                    chartDataRes = JSON.parse(match[1]);
                    aiText = responseText.replace(chartJsonRegex, '').trim();
                    if (!aiText) {
                        aiText = "Com certeza! Aqui está a visualização que você pediu."
                    }
                } catch (e) {
                    console.error("Failed to parse chart JSON from AI response", e);
                    aiText = "Tentei criar um gráfico, mas ocorreu um erro no formato. Pode tentar pedir de outra forma?";
                }
            }

            const aiMessage: Message = { sender: 'ai', text: aiText, chart: chartDataRes };
            setMessages(prev => [...prev, aiMessage]);

        } catch (e: any) {
            const errorMessage: Message = { sender: 'ai', text: `Desculpe, ocorreu um erro: ${e.message}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    }
    
    const renderMessageContent = (message: Message) => {
        let content = message.text;
        content = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Headers
        content = content.replace(/^### (.*$)/gim, '<h3 class="text-md font-bold text-text mt-3 mb-2">$1</h3>');
        content = content.replace(/^#### (.*$)/gim, '<h4 class="text-sm font-semibold text-text mt-2 mb-1">$1</h4>');

        // Formatting
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/\*(.*?)\*/g, (match, p1) => {
             if (message.text.includes('\n*')) return p1;
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

        return <div className="leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />;
    };

    return (
        <Card title="Converse com seus Dados" icon="chat" className="h-[500px]">
            <div className="flex flex-col h-full">
                <div ref={chatContainerRef} className="flex-grow overflow-y-auto pr-4 space-y-4 text-sm mb-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-slate-500/10 text-text'}`}>
                                {renderMessageContent(msg)}
                                {msg.chart && chatData && (
                                    <div className="mt-4 bg-card rounded-lg p-2 h-64">
                                        <ChartRenderer 
                                            chartInfo={{
                                                title: msg.chart.title,
                                                type: msg.chart.type,
                                                x_axis_column: msg.chart.x_axis_column,
                                                y_axis_columns: [msg.chart.y_axis_column]
                                            } as DashboardChart} 
                                            data={chatData} 
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-xs p-3 rounded-lg bg-slate-500/10 text-text">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-2 border-t border-border pt-4">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".xlsx, .xls"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="p-2 text-text-secondary rounded-lg hover:bg-slate-500/10 transition-colors disabled:opacity-50"
                        title="Adicionar arquivo"
                        disabled={isLoading}
                    >
                        <span className="material-icons">add</span>
                    </button>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ex: Qual a média de idade?"
                        className="flex-grow bg-slate-500/10 border border-transparent rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        disabled={isLoading}
                    />
                    <button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()} className="p-2 bg-primary text-white rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-600 transition-colors">
                        <span className="material-icons">send</span>
                    </button>
                </div>
            </div>
        </Card>
    );
};