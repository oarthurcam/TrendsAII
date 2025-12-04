import React from 'react';

interface EditableWrapperProps {
    isEditMode: boolean;
    onEdit: () => void;
    onDelete: () => void;
    children: React.ReactNode;
    className?: string;
}

export const EditableWrapper: React.FC<EditableWrapperProps> = ({ isEditMode, onEdit, onDelete, children, className = '' }) => {
    if (!isEditMode) {
        return <div className={`h-full ${className}`}>{children}</div>;
    }

    return (
        <div className={`relative group h-full transition-all duration-200 ${isEditMode ? 'hover:-translate-y-1' : ''} ${className}`}>
            <div className={`h-full rounded-xl border-2 border-dashed border-amber-400 dark:border-amber-600/50 relative bg-background/50 ${isEditMode ? 'animate-fade-in' : ''}`}>
                 {/* Action Buttons Overlay */}
                 <div className="absolute -top-3 -right-3 flex gap-2 z-20">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-transform hover:scale-110 focus:outline-none"
                        title="Editar"
                    >
                        <span className="material-icons text-sm block">edit</span>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-transform hover:scale-110 focus:outline-none"
                        title="Excluir"
                    >
                        <span className="material-icons text-sm block">close</span>
                    </button>
                </div>
                
                {/* Content Overlay to prevent interaction while editing (optional, but good for drag/drop later) */}
                <div className="h-full w-full opacity-80 pointer-events-none">
                    {children}
                </div>
                
                {/* Visual Indicator of Edit Mode */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none transition-opacity">
                    <div className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border border-border text-xs font-semibold text-text-secondary">
                        Modo Edição
                    </div>
                </div>
            </div>
        </div>
    );
};