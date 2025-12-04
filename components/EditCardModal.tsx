import React, { useState, useEffect } from 'react';
import { DataRow } from '../App';

interface EditCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newData: any) => void;
    item: any;
    type: 'kpi' | 'chart';
    availableColumns: string[];
}

export const EditCardModal: React.FC<EditCardModalProps> = ({ isOpen, onClose, onSave, item, type, availableColumns }) => {
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (item) {
            setFormData(JSON.parse(JSON.stringify(item))); // Deep copy
        }
    }, [item, isOpen]);

    if (!isOpen) return null;

    const handleInputChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };
    
    const handleYColumnChange = (value: string) => {
         // ChartRenderer expects array for Y axis
         setFormData((prev: any) => ({ ...prev, y_axis_columns: [value] }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
                <header className="p-5 border-b border-border flex justify-between items-center">
                    <h3 className="text-lg font-bold text-text">
                        {type === 'kpi' ? 'Editar KPI' : 'Editar Gráfico'}
                    </h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-text">
                        <span className="material-icons">close</span>
                    </button>
                </header>
                
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-grow space-y-4">
                    
                    {/* Common Fields */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Título</label>
                        <input 
                            type="text" 
                            value={formData.title || ''} 
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            required 
                        />
                    </div>

                    {type === 'kpi' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Valor</label>
                                <input 
                                    type="text" 
                                    value={formData.value || ''} 
                                    onChange={(e) => handleInputChange('value', e.target.value)}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Subtítulo / Descrição</label>
                                <input 
                                    type="text" 
                                    value={formData.subtext || ''} 
                                    onChange={(e) => handleInputChange('subtext', e.target.value)}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                />
                            </div>
                        </>
                    )}

                    {type === 'chart' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Tipo de Gráfico</label>
                                <select 
                                    value={formData.type || 'BAR'} 
                                    onChange={(e) => handleInputChange('type', e.target.value)}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                >
                                    <option value="BAR">Barras Verticais</option>
                                    <option value="HORIZONTAL_BAR">Barras Horizontais</option>
                                    <option value="LINE">Linha</option>
                                    <option value="PIE">Pizza</option>
                                    <option value="DONUT">Rosca</option>
                                    <option value="AREA_BAR_COMBO">Área</option>
                                    <option value="RADAR">Radar</option>
                                </select>
                            </div>

                            {availableColumns.length > 0 && (
                                <>
                                    <div className="pt-2 border-t border-border mt-4">
                                        <p className="text-xs font-bold text-text-secondary uppercase mb-3">Configuração de Dados</p>
                                        
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Eixo X / Categoria</label>
                                        <select 
                                            value={formData.x_axis_column || ''} 
                                            onChange={(e) => handleInputChange('x_axis_column', e.target.value)}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                        >
                                            <option value="">Selecione uma coluna...</option>
                                            {availableColumns.map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Eixo Y / Valor</label>
                                        <select 
                                            value={formData.y_axis_columns?.[0] || formData.value_column || ''} 
                                            onChange={(e) => handleYColumnChange(e.target.value)}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                        >
                                            <option value="">Selecione uma coluna...</option>
                                            {availableColumns.map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                </form>
                
                <footer className="p-5 border-t border-border flex justify-end gap-3 bg-card/50">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-text-secondary hover:bg-slate-500/10 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit}
                        className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        Salvar Alterações
                    </button>
                </footer>
            </div>
        </div>
    );
};