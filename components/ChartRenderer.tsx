import React from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AnalysisResult } from '../services/geminiService';
import { DataRow } from '../App';

interface ChartRendererProps {
  chartInfo: AnalysisResult['suggestedChart'];
  data: DataRow[];
}

// Color palettes for light and dark themes
const LIGHT_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
const DARK_COLORS = ['#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#f87171'];


const processDataForCharting = (data: DataRow[], xKey: string, yKey: string): DataRow[] => {
  return data.map(row => ({
    ...row,
    [yKey]: parseFloat(String(row[yKey]).replace(/[^0-9.-]+/g, '')) || 0,
    [xKey]: row[xKey]
  })).filter(row => row[yKey] !== null && !isNaN(Number(row[yKey])));
};


export const ChartRenderer: React.FC<ChartRendererProps> = ({ chartInfo, data }) => {
    
    if (!chartInfo || !data || data.length === 0) {
        return <p className="text-text-secondary text-center">Não há dados para exibir o gráfico.</p>;
    }

    const { type, title, x_axis_column, y_axis_column } = chartInfo;

    const firstRow = data[0];
    if (!firstRow.hasOwnProperty(x_axis_column) || !firstRow.hasOwnProperty(y_axis_column)) {
        return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md text-sm dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700/40">
                <p className="font-bold">Aviso de Gráfico</p>
                <p>A IA sugeriu um gráfico com colunas ('{x_axis_column}', '{y_axis_column}') que não foram encontradas nos dados. A visualização não pôde ser gerada.</p>
            </div>
        );
    }

    const processedData = processDataForCharting(data, x_axis_column, y_axis_column);

    if (processedData.length === 0) {
       return <p className="text-text-secondary text-center">Os dados para o gráfico não puderam ser processados.</p>;
    }
    
    const renderChart = () => {
        const isDarkMode = document.documentElement.classList.contains('dark');
        
        const themeColors = {
            grid: isDarkMode ? 'var(--color-border)' : '#e5e7eb',
            text: isDarkMode ? 'var(--color-text-secondary)' : '#6b7280',
            tooltipBg: isDarkMode ? 'var(--color-card)' : 'var(--color-card)',
            tooltipBorder: isDarkMode ? 'var(--color-border)' : 'var(--color-border)',
            primary: isDarkMode ? '#3b82f6' : '#3b82f6',
            secondary: isDarkMode ? '#a78bfa' : '#8b5cf6',
            pie: isDarkMode ? DARK_COLORS : LIGHT_COLORS,
        };
        
        const tooltipStyle = { 
            backgroundColor: themeColors.tooltipBg, 
            border: `1px solid ${themeColors.tooltipBorder}`,
            color: 'var(--color-text)',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
        };

        switch (type.toUpperCase()) {
            case 'BAR':
                return (
                    <BarChart data={processedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                        <XAxis dataKey={x_axis_column} stroke={themeColors.text} tick={{ fontSize: 12, fill: themeColors.text }} />
                        <YAxis stroke={themeColors.text} tick={{ fontSize: 12, fill: themeColors.text }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{fill: 'rgba(59, 130, 246, 0.1)'}}/>
                        <Legend wrapperStyle={{ color: themeColors.text }}/>
                        <Bar dataKey={y_axis_column} name={y_axis_column} fill={themeColors.primary} />
                    </BarChart>
                );
            case 'LINE':
                return (
                    <LineChart data={processedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                        <XAxis dataKey={x_axis_column} stroke={themeColors.text} tick={{ fontSize: 12, fill: themeColors.text }}/>
                        <YAxis stroke={themeColors.text} tick={{ fontSize: 12, fill: themeColors.text }}/>
                        <Tooltip contentStyle={tooltipStyle} cursor={{stroke: themeColors.primary, strokeWidth: 1, strokeDasharray: '3 3'}}/>
                        <Legend wrapperStyle={{ color: themeColors.text }} />
                        <Line type="monotone" dataKey={y_axis_column} name={y_axis_column} stroke={themeColors.secondary} activeDot={{ r: 8 }} />
                    </LineChart>
                );
             case 'PIE':
                const pieData = processedData.map(d => ({ name: d[x_axis_column], value: d[y_axis_column] as number}));
                return (
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${((Number(percent) || 0) * 100).toFixed(0)}%`}
                            stroke={themeColors.tooltipBg}
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={themeColors.pie[index % themeColors.pie.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: themeColors.text }} />
                    </PieChart>
                );
            default:
                return <p className="text-text-secondary text-center">Tipo de gráfico '{type}' não suportado.</p>;
        }
    };

    return (
        <div className="w-full h-96 flex flex-col items-center">
            <h3 className="text-md font-semibold text-text mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
            </ResponsiveContainer>
        </div>
    );
};