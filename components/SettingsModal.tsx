import React, { useState, useEffect } from 'react';
import { useTheme, Theme } from '../hooks/useTheme';
import { User } from '../App';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

const TabButton: React.FC<{ icon: string, text: string, isActive: boolean, onClick: () => void }> = ({ icon, text, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-slate-500/10'
        }`}
    >
        <span className="material-icons text-xl">{icon}</span>
        {text}
    </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user }) => {
    const [theme, setTheme] = useTheme();
    const [activeTab, setActiveTab] = useState<'profile' | 'appearance'>('profile');
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/40" onClick={onClose}></div>
            <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] max-h-[700px] flex overflow-hidden">
                {/* Sidebar */}
                <aside className="w-1/4 bg-card border-r border-border p-6 flex flex-col">
                    <h2 className="text-xl font-bold mb-8">Configurações</h2>
                    <nav className="space-y-2">
                        <TabButton icon="person" text="Perfil" isActive={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
                        <TabButton icon="palette" text="Aparência" isActive={activeTab === 'appearance'} onClick={() => setActiveTab('appearance')} />
                    </nav>
                     <button onClick={onClose} className="mt-auto flex items-center gap-2 text-sm text-text-secondary hover:text-text">
                        <span className="material-icons">arrow_back</span>
                        Voltar para o app
                    </button>
                </aside>

                {/* Main Content */}
                <main className="w-3/4 p-8 overflow-y-auto relative">
                    {activeTab === 'profile' && (
                        <div>
                            <h3 className="text-2xl font-bold mb-6">Perfil</h3>
                            <div className="space-y-4 p-6 border border-border rounded-lg">
                                <h4 className="font-semibold text-lg">Informações do Perfil</h4>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Nome</label>
                                    <p className="text-text text-sm p-2 bg-slate-500/10 rounded-md">{user.name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
                                    <p className="text-text-secondary text-sm p-2 bg-slate-500/10 rounded-md">{user.email}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'appearance' && (
                        <div>
                             <h3 className="text-2xl font-bold mb-6">Aparência e Preferências</h3>
                             <div className="space-y-4 p-6 border border-border rounded-lg mb-8">
                                <h4 className="font-semibold text-lg">Tema</h4>
                                <p className="text-sm text-text-secondary mb-3">Escolha como o TrendsAI deve se parecer.</p>
                                <div className="flex gap-4">
                                    {(['light', 'dark', 'system'] as Theme[]).map(t => {
                                        const icons: Record<Theme, string> = { light: 'light_mode', dark: 'dark_mode', system: 'desktop_windows' };
                                        return (
                                            <button key={t} onClick={() => setTheme(t)} className={`p-4 w-28 h-24 flex flex-col items-center justify-center rounded-lg border-2 transition-colors ${theme === t ? 'border-primary bg-primary/10' : 'border-border hover:border-border'}`}>
                                                <span className="material-icons text-3xl mb-1">{icons[t]}</span>
                                                <span className="text-sm capitalize">{t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Sistema'}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="space-y-4 p-6 border border-border rounded-lg mb-8">
                                <h4 className="font-semibold text-lg">Idioma</h4>
                                <p className="text-sm text-text-secondary mb-3">Selecione o seu idioma de preferência.</p>
                                <select className="block w-full max-w-xs px-3 py-2 bg-card border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                                    <option>Português (Brasil)</option>
                                    <option disabled>English (coming soon)</option>
                                </select>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};