import React from 'react';
import { DashboardAnalysisResult } from '../services/geminiService';
import { DataRow } from '../App';
import { KpiCard } from './KpiCard';
import { ChartRenderer } from './ChartRenderer';

interface DashboardDisplayProps {
    dashboard: DashboardAnalysisResult;
    data: DataRow[];
}

const ChartCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="bg-card p-4 rounded-xl shadow-sm h-96 flex flex-col">
        {children}
    </div>
);

export const DashboardDisplay: React.FC<DashboardDisplayProps> = ({ dashboard, data }) => {
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
                    <KpiCard key={`kpi-${index}`} kpi={kpi} />
                ))}
            </div>

            {/* Main Charts */}
            <div className="col-span-12 lg:col-span-4">
                <ChartCard>
                    <ChartRenderer chartInfo={charts.admissionByDivision} data={data} />
                </ChartCard>
            </div>
            <div className="col-span-12 lg:col-span-8">
                <ChartCard>
                    <ChartRenderer chartInfo={charts.admissionVsCost} data={data} />
                </ChartCard>
            </div>

            {/* Secondary Charts */}
             <div className="col-span-12 lg:col-span-4">
                <ChartCard>
                    <ChartRenderer chartInfo={charts.patientSatisfaction} data={data} />
                </ChartCard>
            </div>
             <div className="col-span-12 lg:col-span-4">
                 <ChartCard>
                    <ChartRenderer chartInfo={charts.availableStaff} data={data} />
                </ChartCard>
            </div>
             <div className="col-span-12 lg:col-span-4">
                 <ChartCard>
                    <ChartRenderer chartInfo={charts.avgWaitTime} data={data} />
                </ChartCard>
            </div>

            {/* Tertiary Chart */}
             <div className="col-span-12">
                 <ChartCard>
                    <ChartRenderer chartInfo={charts.treatmentConfidence} data={data} />
                </ChartCard>
            </div>
        </div>
    );
};
