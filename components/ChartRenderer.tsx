import React from 'react';
import { 
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    ComposedChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Treemap
} from 'recharts';
import { DashboardChart } from '../services/geminiService';
import { DataRow } from '../App';

interface ChartRendererProps {
  chartInfo: DashboardChart;
  data: DataRow[];
}

// Color palettes for light and dark themes
const LIGHT_COLORS = ['#00B2B2', '#007A8C', '#00D9D9', '#6B7280', '#F59E0B', '#EF4444'];
const DARK_COLORS = ['#00D9D9', '#00B2B2', '#007A8C', '#94A3B8', '#FBBF24', '#F87171'];


const processDataForCharting = (data: DataRow[], chartInfo: DashboardChart): DataRow[] => {
  const { y_axis_columns, value_column } = chartInfo;
  
  const columnsToParse = [
    ...(y_axis_columns || []),
    ...(value_column ? [value_column] : [])
  ];

  if (columnsToParse.length === 0) return data;

  return data.map(row => {
    const newRow = { ...row };
    columnsToParse.forEach(col => {
      if (newRow[col]) {
        newRow[col] = parseFloat(String(newRow[col]).replace(/[^0-9.-]+/g, '')) || 0;
      }
    });
    return newRow;
  }).filter(row => {
    // Ensure at least one of the parsed columns has a valid number
    return columnsToParse.some(col => row[col] !== null && !isNaN(Number(row[col])));
  });
};


export const ChartRenderer: React.FC<ChartRendererProps> = ({ chartInfo, data }) => {
    
    if (!chartInfo || !data || data.length === 0) {
        return <p className="text-text-secondary text-center">Não há dados para exibir o gráfico.</p>;
    }

    const { type, title, x_axis_column, y_axis_columns, category_column, value_column } = chartInfo;

    const allColumns = [x_axis_column, ...(y_axis_columns || []), category_column, value_column].filter(Boolean) as string[];
    const firstRow = data[0];
    const missingColumns = allColumns.filter(col => !firstRow.hasOwnProperty(col));

    if (missingColumns.length > 0) {
        return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md text-sm dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700/40 h-full flex flex-col justify-center">
                <p className="font-bold">Aviso de Gráfico: {title}</p>
                <p>A IA sugeriu colunas ({missingColumns.join(', ')}) que não foram encontradas nos dados. A visualização não pôde ser gerada.</p>
            </div>
        );
    }

    const processedData = processDataForCharting(data, chartInfo);

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
            primary: 'var(--color-primary)', // #00B2B2
            secondary: '#007A8C',
            pie: isDarkMode ? DARK_COLORS : LIGHT_COLORS,
        };
        
        const tooltipStyle = { 
            backgroundColor: themeColors.tooltipBg, 
            border: `1px solid ${themeColors.tooltipBorder}`,
            color: 'var(--color-text)',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
        };

        const tickStyle = { fontSize: 12, fill: themeColors.text };

        switch (type.toUpperCase()) {
            case 'BAR':
                return (
                    <BarChart data={processedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                        <XAxis dataKey={x_axis_column} stroke={themeColors.text} tick={tickStyle} />
                        <YAxis stroke={themeColors.text} tick={tickStyle} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{fill: 'rgba(59, 130, 246, 0.1)'}}/>
                        <Legend wrapperStyle={{ color: themeColors.text, fontSize: '12px' }}/>
                        <Bar dataKey={y_axis_columns![0]} name={y_axis_columns![0]} fill={themeColors.primary} />
                    </BarChart>
                );
            case 'LINE':
                return (
                    <LineChart data={processedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                        <XAxis dataKey={x_axis_column} stroke={themeColors.text} tick={tickStyle} />
                        <YAxis stroke={themeColors.text} tick={tickStyle} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: themeColors.text, fontSize: '12px' }}/>
                        <Line type="monotone" dataKey={y_axis_columns![0]} name={y_axis_columns![0]} stroke={themeColors.primary} />
                    </LineChart>
                );
            case 'PIE':
                const pieData = processedData.map(d => ({ name: d[x_axis_column!], value: d[y_axis_columns![0]] as number}));
                return (
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={themeColors.pie[index % themeColors.pie.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: themeColors.text, fontSize: '12px' }} />
                    </PieChart>
                );
            case 'AREA_BAR_COMBO':
                return (
                    <ComposedChart data={processedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                        <XAxis dataKey={x_axis_column} stroke={themeColors.text} tick={tickStyle} />
                        <YAxis stroke={themeColors.text} tick={tickStyle} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: themeColors.text, fontSize: '12px' }} />
                        <Area type="monotone" dataKey={y_axis_columns?.[0]} fill={themeColors.primary} stroke={themeColors.primary} fillOpacity={0.6} />
                        <Bar dataKey={y_axis_columns?.[1]} fill={themeColors.secondary} />
                    </ComposedChart>
                );
            case 'TREEMAP':
                return (
                    <Treemap
                        data={processedData}
                        dataKey={value_column!}
                        ratio={4 / 3}
                        stroke="#fff"
                        fill={themeColors.primary}
                        nameKey={category_column!}
                    >
                      <Tooltip contentStyle={tooltipStyle} />
                    </Treemap>
                );
            case 'DONUT':
                 const donutData = processedData.map(d => ({ name: d[category_column!], value: d[value_column!] as number}));
                return (
                    <PieChart>
                        <Pie
                            data={donutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            stroke={themeColors.tooltipBg}
                        >
                            {donutData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={themeColors.pie[index % themeColors.pie.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: themeColors.text, fontSize: '12px' }} />
                    </PieChart>
                );
            case 'RADAR':
                 const radarData = processedData.map(d => ({
                    subject: d[x_axis_column!],
                    A: d[y_axis_columns![0]],
                    B: d[y_axis_columns![1]],
                    fullMark: 150, // This might need to be dynamic
                 }));
                return (
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke={themeColors.grid}/>
                      <PolarAngleAxis dataKey="subject" tick={tickStyle}/>
                      <PolarRadiusAxis tick={tickStyle}/>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ color: themeColors.text, fontSize: '12px' }}/>
                      <Radar name={y_axis_columns![0]} dataKey="A" stroke={themeColors.primary} fill={themeColors.primary} fillOpacity={0.6} />
                      <Radar name={y_axis_columns![1]} dataKey="B" stroke={themeColors.secondary} fill={themeColors.secondary} fillOpacity={0.6} />
                    </RadarChart>
                );
            case 'HORIZONTAL_BAR':
                return (
                     <BarChart data={processedData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                        <XAxis type="number" stroke={themeColors.text} tick={tickStyle} />
                        <YAxis type="category" dataKey={x_axis_column} stroke={themeColors.text} width={80} tick={tickStyle} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{fill: 'rgba(59, 130, 246, 0.1)'}}/>
                        <Legend wrapperStyle={{ color: themeColors.text, fontSize: '12px' }}/>
                        <Bar dataKey={y_axis_columns![0]} name={y_axis_columns![0]} fill={themeColors.primary} />
                    </BarChart>
                );
            default:
                return <p className="text-text-secondary text-center">Tipo de gráfico '{type}' não suportado.</p>;
        }
    };

    return (
        <div className="w-full h-full flex flex-col">
            <h3 className="text-md font-semibold text-text mb-4 text-center">{title}</h3>
            <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
            </ResponsiveContainer>
        </div>
    );
};