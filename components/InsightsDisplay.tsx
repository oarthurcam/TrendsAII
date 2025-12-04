import React from 'react';
import { AnalysisResult, InsightSection, Kpi } from '../services/geminiService';
import { DataRow } from '../App';
import { ChartRenderer } from './ChartRenderer';
import { KpiCard } from './KpiCard';
import { EditableWrapper } from './EditableWrapper';

const SectionContainer: React.FC<{title: string, icon: string, children: React.ReactNode, className?: string}> = ({title, icon, children, className}) => (
    <div className={`bg-card p-6 rounded-xl shadow-sm h-full flex flex-col ${className}`}>
        <h3 className="font-semibold mb-4 flex items-center text-text flex-shrink-0">
            <span className="material-icons text-primary mr-2">{icon}</span>
            {title}
        </h3>
        <div className="flex-grow">
            {children}
        </div>
    </div>
);

// --- Component Renderers for specific Section Types ---

const SummarySection: React.FC<{ content?: string }> = ({ content }) => {
    if (!content) return null;

    // Parse Markdown-lite
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
             elements.push(<div key={index} className="h-2"></div>); // Spacing
             return;
        }

        if (trimmed.startsWith('### ')) {
             elements.push(<h4 key={index} className="text-md font-bold text-text mt-4 mb-2">{trimmed.replace('### ', '')}</h4>);
        } else if (trimmed.startsWith('#### ')) {
             elements.push(<h5 key={index} className="text-sm font-bold text-text mt-3 mb-1">{trimmed.replace('#### ', '')}</h5>);
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
             const text = trimmed.substring(2);
             // Bold formatting
             const parts = text.split(/(\*\*.*?\*\*)/g);
             const formattedLine = parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="text-text font-semibold">{part.slice(2, -2)}</strong>;
                }
                return part;
             });

             elements.push(
                <div key={index} className="flex items-start ml-2 mb-1">
                    <span className="material-icons text-primary text-[6px] mt-2 mr-2">circle</span>
                    <span className="text-sm text-text-secondary leading-relaxed">{formattedLine}</span>
                </div>
             );
        } else {
             // Normal paragraph with bold support
             const parts = trimmed.split(/(\*\*.*?\*\*)/g);
             const formattedLine = parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="text-text font-semibold">{part.slice(2, -2)}</strong>;
                }
                return part;
             });
             
             elements.push(<p key={index} className="text-sm text-text-secondary mb-2 leading-relaxed">{formattedLine}</p>);
        }
    });

    return (
        <div className="whitespace-pre-line leading-relaxed">
            {elements}
        </div>
    );
};

const ListSection: React.FC<{ items?: string[] }> = ({ items }) => {
    if (!items || items.length === 0) return null;
    return (
        <ul className="space-y-3">
            {items.map((item, index) => (
                <li key={index} className="flex items-start text-sm text-text-secondary leading-relaxed">
                    <span className="material-icons text-primary text-xs mt-1 mr-2 flex-shrink-0">check_circle_outline</span>
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
};

const ChartSection: React.FC<{ config?: any, data: DataRow[] }> = ({ config, data }) => {
    if (!config || !data) return <p className="text-sm text-text-secondary">Dados insuficientes para gráfico.</p>;
    
    // Ensure y_axis_columns is an array as expected by ChartRenderer
    const chartInfo = {
        ...config,
        y_axis_columns: Array.isArray(config.y_axis_columns) ? config.y_axis_columns : [config.value_column]
    };

    return (
        <div className="h-64 w-full">
            <ChartRenderer chartInfo={chartInfo} data={data} />
        </div>
    );
};

const KpiGridSection: React.FC<{ items?: Kpi[] }> = ({ items }) => {
    if (!items || items.length === 0) return null;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((kpi, idx) => (
                <div key={idx} className="bg-background/50 p-4 rounded-lg border border-border flex flex-col justify-between">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 truncate">{kpi.title}</p>
                    <p className="text-2xl font-bold text-primary my-1">{kpi.value}</p>
                    <p className="text-xs text-text-secondary opacity-80 border-t border-border/50 pt-2 mt-1">{kpi.subtext}</p>
                </div>
            ))}
        </div>
    );
};

// --- Main Section Factory ---

const renderSectionContent = (section: InsightSection, data: DataRow[]) => {
    switch (section.type) {
        case 'summary':
            return <SummarySection content={section.textContent} />;
        case 'list':
            return <ListSection items={section.listItems} />;
        case 'chart':
            return <ChartSection config={section.chartConfig} data={data} />;
        case 'kpi_grid':
            return <KpiGridSection items={section.kpiItems} />;
        default:
            return <p className="text-sm text-text-secondary">Tipo de seção desconhecido.</p>;
    }
};

const getIconForType = (type: string) => {
    switch(type) {
        case 'summary': return 'article';
        case 'list': return 'format_list_bulleted';
        case 'chart': return 'bar_chart';
        case 'kpi_grid': return 'scoreboard';
        default: return 'widgets';
    }
};

interface InsightsDisplayProps {
    insights: AnalysisResult;
    data: DataRow[];
    fileName: string | null;
    isEditMode: boolean;
    onDelete: (path: string) => void;
    onEdit: (path: string, type: 'kpi' | 'chart', data: any) => void;
}

export const InsightsDisplay: React.FC<InsightsDisplayProps> = ({ insights, data, fileName, isEditMode, onDelete, onEdit }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in pb-8">
            {insights.sections.map((section, index) => (
                <div 
                    key={section.id} 
                    className={section.width === 2 ? 'md:col-span-2' : 'md:col-span-1'}
                >
                    <EditableWrapper
                        isEditMode={isEditMode}
                        onDelete={() => onDelete(`sections.${index}`)}
                        onEdit={() => {
                             // Determine what to edit based on type
                             if (section.type === 'chart') {
                                 onEdit(`sections.${index}.chartConfig`, 'chart', section.chartConfig);
                             } else {
                                 // For now only charts are editable via modal in insights view easily, 
                                 // unless we make a generic text editor for summary/lists.
                                 // Let's allow editing charts only for now or map it correctly.
                                 if (section.type === 'chart') {
                                     onEdit(`sections.${index}.chartConfig`, 'chart', section.chartConfig);
                                 } else {
                                     alert('Edição disponível apenas para gráficos neste momento.');
                                 }
                             }
                        }}
                    >
                        <SectionContainer 
                            title={section.title} 
                            icon={getIconForType(section.type)}
                        >
                            {section.description && (
                                <p className="text-xs text-text-secondary mb-4 italic px-2 border-l-2 border-primary/30">{section.description}</p>
                            )}
                            {renderSectionContent(section, data)}
                        </SectionContainer>
                    </EditableWrapper>
                </div>
            ))}
        </div>
    );
};