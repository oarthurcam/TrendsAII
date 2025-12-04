import React from 'react';
import { Kpi } from '../services/geminiService';

interface KpiCardProps {
    kpi: Kpi;
}

export const KpiCard: React.FC<KpiCardProps> = ({ kpi }) => {
    return (
        <div className="bg-card p-6 rounded-xl shadow-sm h-full">
            <h3 className="text-md font-semibold text-text-secondary mb-2 truncate">{kpi.title}</h3>
            <p className="text-4xl font-bold text-primary truncate">{kpi.value}</p>
            <p className="text-sm text-text-secondary mt-1 truncate">{kpi.subtext}</p>
        </div>
    );
};
