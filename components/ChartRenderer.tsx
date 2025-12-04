import React, { useState, useMemo } from 'react';
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
const LIGHT_COLORS = ['#00B2B2', '#007A8C', '#00D9D9', '#6B7280', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const DARK_COLORS = ['#00D9D9', '#00B2B2', '#007A8C', '#94A3B8', '#FBBF24', '#F87171', '#A78BFA', '#F472B6'];

const MAX_BAR_ITEMS = 10;
const MAX_PIE_ITEMS = 5;
const MAX_LABEL_LENGTH = 10; // Reduced to 10 to prevent overlap

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
        // Handle strings with currency, percentage, or commas as decimals
        let val = String(newRow[col]);
        // Simple heuristic: if it has a comma and no dot, replace comma with dot.
        if (val.includes(',') && !val.includes('.')) {
            val = val.replace(',', '.');
        }
        const parsed = parseFloat(val.replace(/[^0-9.-]+/g, ''));
        newRow[col] = isNaN(parsed) ? 0 : parsed;
      }
    });
    return newRow;
  });
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({ chartInfo, data }) => {
    const [showAllData, setShowAllData] = useState(false);

    const { processedData, missingColumns, availableColumns, isTruncated, limitUsed } = useMemo(() => {
        if (!chartInfo || !data || data.length === 0) {
            return { processedData: [], missingColumns: [], availableColumns: [], isTruncated: false, limitUsed: 10 };
        }

        const { x_axis_column, y_axis_columns, category_column, value_column, type } = chartInfo;
        const allRequiredColumns = [x_axis_column, ...(y_axis_columns || []), category_column, value_column].filter(Boolean) as string[];
        const firstRow = data[0];
        const rowKeys = Object.keys(firstRow);
        
        // Validation: Check if columns exist
        const missing = allRequiredColumns.filter(col => !firstRow.hasOwnProperty(col));

        if (missing.length > 0) {
            return { processedData: [], missingColumns: missing, availableColumns: rowKeys, isTruncated: false, limitUsed: 10 };
        }

        let processed = processDataForCharting(data, chartInfo);
        let isTruncatedData = false;
        
        // Determine limit based on chart type
        const isCircular = ['PIE', 'DONUT', 'RADAR'].includes(type);
        const dynamicLimit = isCircular ? MAX_PIE_ITEMS : MAX_BAR_ITEMS;

        // Auto-Limit Logic for Categorical Charts
        const categoricalTypes = ['BAR', 'PIE', 'DONUT', 'HORIZONTAL_BAR', 'RADAR'];
        
        if (categoricalTypes.includes(type) && processed.length > dynamicLimit) {
            isTruncatedData = true;
            if (!showAllData) {
                // Sort by the primary value column to show top items
                const sortKey = (y_axis_columns?.[0] || value_column) as string;
                if (sortKey) {
                    processed = [...processed].sort((a, b) => (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0));
                }
                processed = processed.slice(0, dynamicLimit);
            }
        }

        return { processedData: processed, missingColumns: [], availableColumns: [], isTruncated: isTruncatedData, limitUsed: dynamicLimit };

    }, [chartInfo, data, showAllData]);

    // Helper to abbreviate X-Axis labels
    const formatAxisLabel = (value: any) => {
        if (typeof value !== 'string') return value;
        return value.length > MAX_LABEL_LENGTH 
            ? `${value.substring(0, MAX_LABEL_LENGTH)}..` 
            : value;
    };

    if (!chartInfo || !data || data.length === 0) {
        return <p className="text-text-secondary text-center text-sm p-4">Não há dados para exibir o gráfico.</p>;
    }

    if (missingColumns.length > 0) {
        return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700/40 h-full flex flex-col justify-center overflow-auto">
                <div className="flex items-start gap-2 mb-2">
                    <span className="material-icons text-yellow-600 dark:text-yellow-400">warning</span>
                    <p className="font-bold">Colunas não encontradas</p>
                </div>
                <p className="mb-2">A IA tentou usar: <span className="font-mono bg-yellow-100 dark:bg-yellow-800 px-1 rounded">{missingColumns.join(', ')}</span></p>
                
                <div className="mt-2">
                    <p className="font-semibold mb-1 text-xs uppercase tracking-wider opacity-80">Colunas Disponíveis no Arquivo:</p>
                    <div className="flex flex-wrap gap-1">
                        {availableColumns.slice(0, 10).map(col => (
                            <span key={col} className="text-xs bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-800 px-1.5 py-0.5 rounded text-text-secondary">
                                {col}
                            </span>
                        ))}
                        {availableColumns.length > 10 && <span className="text-xs text-text-secondary self-center">...e mais {availableColumns.length - 10}</span>}
                    </div>
                </div>
            </div>
        );
    }

    if (processedData.length === 0) {
       return <p className="text-text-secondary text-center text-sm p-4">Os dados para o gráfico não puderam ser processados.</p>;
    }
    
    const { type, title, x_axis_column, y_axis_columns, category_column, value_column } = chartInfo;

    const getYCol = (index: number) => {
        if (y_axis_columns && y_axis_columns.length > index) {
            return y_axis_columns[index];
        }
        if (index === 0 && value_column) return value_column;
        return undefined; 
    };

    const primaryY = getYCol(0);
    const secondaryY = getYCol(1);

    if (!primaryY && ['BAR', 'LINE', 'AREA_BAR_COMBO', 'HORIZONTAL_BAR', 'RADAR', 'PIE', 'DONUT'].includes(type)) {
         return (
            <div className="h-full flex items-center justify-center text-center p-4">
                 <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                    <p>Erro de Configuração: Coluna de valor não definida.</p>
                 </div>
            </div>
         );
    }

    const renderChart = () => {
        const isDarkMode = document.documentElement.classList.contains('dark');
        
        const themeColors = {
            grid: isDarkMode ? 'var(--color-border)' : '#e5e7eb',
            text: isDarkMode ? 'var(--color-text-secondary)' : '#6b7280',
            tooltipBg: isDarkMode ? 'var(--color-card)' : 'var(--color-card)',
            tooltipBorder: isDarkMode ? 'var(--color-border)' : 'var(--color-border)',
            primary: 'var(--color-primary)', 
            secondary: '#007A8C',
            pie: isDarkMode ? DARK_COLORS : LIGHT_COLORS,
        };
        
        const tooltipStyle = { 
            backgroundColor: themeColors.tooltipBg, 
            border: `1px solid ${themeColors.tooltipBorder}`,
            color: 'var(--color-text)',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            fontSize: '12px'
        };

        const tickStyle = { fontSize: 11, fill: themeColors.text };

        // Determine if we need to rotate labels
        // If there are more than 3 items, rotate to be safe
        const shouldRotateLabels = processedData.length > 3;

        // Common XAxis configuration with conditional rotation
        const xAxisCommonProps = {
            dataKey: x_axis_column,
            stroke: themeColors.text,
            tick: shouldRotateLabels 
                ? { ...tickStyle, angle: -40, textAnchor: 'end', dy: 3 } 
                : tickStyle,
            height: shouldRotateLabels ? 60 : 30,
            interval: 0, // Force show all ticks, relying on rotation to fit
            tickFormatter: formatAxisLabel
        };

        switch (type.toUpperCase()) {
            case 'BAR':
                return (
                    <BarChart data={processedData} margin={{ bottom: shouldRotateLabels ? 10 : 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} vertical={false} />
                        <XAxis {...xAxisCommonProps} />
                        <YAxis stroke={themeColors.text} tick={tickStyle} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{fill: 'rgba(59, 130, 246, 0.05)'}}/>
                        <Legend wrapperStyle={{ color: themeColors.text, fontSize: '11px', paddingTop: '10px' }}/>
                        {primaryY && <Bar dataKey={primaryY} name={primaryY} fill={themeColors.primary} radius={[4, 4, 0, 0]} />}
                    </BarChart>
                );
            case 'LINE':
                return (
                    <LineChart data={processedData} margin={{ bottom: shouldRotateLabels ? 10 : 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} vertical={false} />
                        <XAxis {...xAxisCommonProps} />
                        <YAxis stroke={themeColors.text} tick={tickStyle} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: themeColors.text, fontSize: '11px', paddingTop: '10px' }}/>
                        {primaryY && <Line type="monotone" dataKey={primaryY} name={primaryY} stroke={themeColors.primary} strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />}
                    </LineChart>
                );
            case 'PIE':
                if (!primaryY) return null;
                const pieData = processedData.map(d => ({ name: d[x_axis_column!] || 'Sem categoria', value: d[primaryY!] as number}));
                return (
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            paddingAngle={2}
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={themeColors.pie[index % themeColors.pie.length]} stroke="transparent" />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: themeColors.text, fontSize: '11px' }} layout="vertical" align="right" verticalAlign="middle" />
                    </PieChart>
                );
            case 'AREA_BAR_COMBO':
                return (
                    <ComposedChart data={processedData} margin={{ bottom: shouldRotateLabels ? 10 : 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} vertical={false} />
                        <XAxis {...xAxisCommonProps} />
                        <YAxis stroke={themeColors.text} tick={tickStyle} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: themeColors.text, fontSize: '11px', paddingTop: '10px' }} />
                        {primaryY && <Area type="monotone" dataKey={primaryY} fill={themeColors.primary} stroke={themeColors.primary} fillOpacity={0.2} />}
                        {secondaryY && <Bar dataKey={secondaryY} fill={themeColors.secondary} radius={[4, 4, 0, 0]} />}
                    </ComposedChart>
                );
            case 'TREEMAP':
                if (!value_column || !category_column) return null;
                return (
                    <Treemap
                        data={processedData}
                        dataKey={value_column}
                        ratio={4 / 3}
                        stroke="#fff"
                        fill={themeColors.primary}
                        nameKey={category_column}
                    >
                      <Tooltip contentStyle={tooltipStyle} />
                    </Treemap>
                );
            case 'DONUT':
                 if (!value_column || !category_column) return null;
                 const donutData = processedData.map(d => ({ name: d[category_column], value: d[value_column] as number}));
                return (
                    <PieChart>
                        <Pie
                            data={donutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            stroke={themeColors.tooltipBg}
                            paddingAngle={2}
                        >
                            {donutData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={themeColors.pie[index % themeColors.pie.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: themeColors.text, fontSize: '11px' }} layout="vertical" align="right" verticalAlign="middle" />
                    </PieChart>
                );
            case 'RADAR':
                 if (!primaryY) return null;
                 const radarData = processedData.map(d => ({
                    subject: d[x_axis_column!] || 'Item',
                    A: d[primaryY!],
                    B: secondaryY ? d[secondaryY] : 0,
                    fullMark: 150, 
                 }));
                return (
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke={themeColors.grid}/>
                      <PolarAngleAxis 
                          dataKey="subject" 
                          tick={tickStyle} 
                          tickFormatter={formatAxisLabel}
                      />
                      <PolarRadiusAxis tick={tickStyle} angle={30} domain={[0, 'auto']}/>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ color: themeColors.text, fontSize: '11px' }}/>
                      <Radar name={primaryY} dataKey="A" stroke={themeColors.primary} fill={themeColors.primary} fillOpacity={0.5} />
                      {secondaryY && <Radar name={secondaryY} dataKey="B" stroke={themeColors.secondary} fill={themeColors.secondary} fillOpacity={0.5} />}
                    </RadarChart>
                );
            case 'HORIZONTAL_BAR':
                return (
                     <BarChart data={processedData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} horizontal={false} />
                        <XAxis type="number" stroke={themeColors.text} tick={tickStyle} />
                        <YAxis 
                            type="category" 
                            dataKey={x_axis_column} 
                            stroke={themeColors.text} 
                            width={100} 
                            tick={tickStyle} 
                            tickFormatter={formatAxisLabel}
                        />
                        <Tooltip contentStyle={tooltipStyle} cursor={{fill: 'rgba(59, 130, 246, 0.05)'}}/>
                        <Legend wrapperStyle={{ color: themeColors.text, fontSize: '11px', paddingTop: '10px' }}/>
                        {primaryY && <Bar dataKey={primaryY} name={primaryY} fill={themeColors.primary} radius={[0, 4, 4, 0]} barSize={20} />}
                    </BarChart>
                );
            default:
                return <p className="text-text-secondary text-center text-sm p-4">Tipo de gráfico '{type}' não suportado.</p>;
        }
    };

    return (
        <div className="w-full h-full flex flex-col relative group">
            <h3 className="text-md font-semibold text-text mb-2 text-center truncate px-4" title={title}>{title}</h3>
            
            <div className="flex-grow w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>

            {/* View Toggle for Truncated Data */}
            {isTruncated && (
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                        onClick={() => setShowAllData(!showAllData)}
                        className="bg-card/90 backdrop-blur-sm border border-border shadow-sm text-xs font-medium text-primary px-2 py-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        title={showAllData ? `Mostrar apenas Top ${limitUsed}` : "Mostrar todos os dados"}
                    >
                        {showAllData ? `Ver Top ${limitUsed}` : "Ver Tudo"}
                    </button>
                </div>
            )}
        </div>
    );
};