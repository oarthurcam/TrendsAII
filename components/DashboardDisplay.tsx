import React from 'react';
import { DashboardAnalysisResult } from '../services/geminiService';
import { DataRow } from '../App';
import { KpiCard } from './KpiCard';
import { ChartRenderer } from './ChartRenderer';
import { EditableWrapper } from './EditableWrapper';

interface DashboardDisplayProps {
    dashboard: DashboardAnalysisResult;
    data: DataRow[];
    isEditMode: boolean;
    onDelete: (path: string) => void;
    onEdit: (path: string, type: 'kpi' | 'chart', data: any) => void;
}

const ChartCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="bg-card p-4 rounded-xl shadow-sm h-96 flex flex-col">
        {children}
    </div>
);

export const DashboardDisplay: React.FC<DashboardDisplayProps> = ({ dashboard, data, isEditMode, onDelete, onEdit }) => {
    const { kpis, charts } = dashboard;
    
    // Fallback for safety, though the API schema should enforce this.
    if (!kpis || !charts) {
        return <p>Dados do dashboard incompletos.</p>;
    }

    return (
        <div className="grid grid-cols-12 gap-6 animate-fade-in">
            {/* KPIs */}
            <div className="col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
                 {kpis.map((kpi, index) => (
                    <EditableWrapper 
                        key={`kpi-${index}`}
                        isEditMode={isEditMode}
                        onDelete={() => onDelete(`kpis.${index}`)}
                        onEdit={() => onEdit(`kpis.${index}`, 'kpi', kpi)}
                    >
                        <KpiCard kpi={kpi} />
                    </EditableWrapper>
                ))}
            </div>

            {/* Helper to render editable chart */}
            {Object.entries(charts).map(([key, chartConfig]) => {
                // Mapping chart keys to grid spans manually to maintain layout
                // Or we can just map them linearly if we want full flexibility, 
                // but let's try to preserve the layout structure if the key exists.
                
                let spanClass = "col-span-12 lg:col-span-4";
                if (key === 'admissionVsCost') spanClass = "col-span-12 lg:col-span-8";
                if (key === 'treatmentConfidence') spanClass = "col-span-12";

                if (!chartConfig) return null; // If deleted

                return (
                    <div key={key} className={spanClass}>
                        <EditableWrapper
                            isEditMode={isEditMode}
                            onDelete={() => onDelete(`charts.${key}`)}
                            onEdit={() => onEdit(`charts.${key}`, 'chart', chartConfig)}
                        >
                            <ChartCard>
                                <ChartRenderer chartInfo={chartConfig} data={data} />
                            </ChartCard>
                        </EditableWrapper>
                    </div>
                );
            })}
        </div>
    );
};