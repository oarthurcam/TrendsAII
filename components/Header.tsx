import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';

interface HeaderProps {
    title: string | null;
    onOpenShareModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onOpenShareModal }) => {
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const helpPopoverRef = useRef<HTMLDivElement>(null);
    const helpButtonRef = useRef<HTMLButtonElement>(null);
    const [theme, setTheme] = useTheme();

    // Close popover on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                helpPopoverRef.current &&
                !helpPopoverRef.current.contains(event.target as Node) &&
                helpButtonRef.current &&
                !helpButtonRef.current.contains(event.target as Node)
            ) {
                setIsHelpOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header className="p-6 flex-shrink-0 relative">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    {title ? (
                        <h2 className="text-2xl font-semibold text-text">{title}</h2>
                    ) : (
                        <div className="flex items-center gap-1" aria-label="TrendsAI Logo">
                            <span className="material-icons text-primary text-3xl">analytics</span>
                            <div className="flex items-baseline text-xl">
                               <span className="font-semibold text-text tracking-tight">Trends</span>
                               <span className="font-bold text-primary tracking-tight">AI</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center">
                     <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="p-2 rounded-full text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-text transition-colors mr-2"
                        aria-label="Toggle theme"
                    >
                        <span className="material-icons">{theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'light_mode' : 'dark_mode'}</span>
                    </button>
                    {title ? (
                         <button
                            onClick={onOpenShareModal}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors"
                        >
                            <span className="material-icons text-base">share</span>
                            Compartilhar Insights
                        </button>
                    ) : (
                    <>
                        <button 
                            ref={helpButtonRef}
                            onClick={() => setIsHelpOpen(prev => !prev)}
                            className="p-2 rounded-full text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-text transition-colors"
                            aria-label="Dúvidas"
                            aria-expanded={isHelpOpen}
                        >
                            <span className="material-icons">help_outline</span>
                        </button>
                        {isHelpOpen && (
                            <div
                                ref={helpPopoverRef}
                                className="absolute top-16 right-6 w-80 bg-card rounded-xl shadow-lg border border-border p-5 z-50 animate-fade-in-down"
                            >
                                <h3 className="font-bold text-text mb-3 text-lg">Como Funciona</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-primary/10 text-primary rounded-full p-1.5 flex-shrink-0">
                                            <span className="material-icons text-base">upload_file</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm text-text">1. Envie sua Planilha</h4>
                                            <p className="text-xs text-text-secondary">Faça o upload de um arquivo Excel (.xlsx ou .xls) com seus dados.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="bg-primary/10 text-primary rounded-full p-1.5 flex-shrink-0">
                                            <span className="material-icons text-base">auto_awesome</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm text-text">2. Análise por IA</h4>
                                            <p className="text-xs text-text-secondary">Nossa IA processa as informações para encontrar padrões e tendências.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="bg-primary/10 text-primary rounded-full p-1.5 flex-shrink-0">
                                            <span className="material-icons text-base">insights</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm text-text">3. Explore os Insights</h4>
                                            <p className="text-xs text-text-secondary">Receba um painel interativo com gráficos e resumos para explorar.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-border my-4"></div>
                                <h3 className="font-bold text-text mb-2 text-md">O que são os Insights?</h3>
                                <p className="text-sm text-text-secondary">São as descobertas mais valiosas escondidas nos seus dados. Use-os para tomar decisões mais rápidas e identificar novas oportunidades.</p>
                            </div>
                        )}
                    </>
                    )}
                </div>
            </div>
        </header>
    );
};