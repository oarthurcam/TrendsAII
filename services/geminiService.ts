import { GoogleGenAI, Type } from "@google/genai";

// SHARED TYPES
export interface Kpi {
    title: string;
    value: string;
    subtext: string;
}

export interface DashboardChart {
    title: string;
    type: 'BAR' | 'LINE' | 'PIE' | 'AREA_BAR_COMBO' | 'TREEMAP' | 'DONUT' | 'RADAR' | 'HORIZONTAL_BAR';
    x_axis_column?: string;
    y_axis_columns?: string[];
    category_column?: string;
    value_column?: string;
    data_labels?: string[];
}

export interface ChatChart {
    title: string;
    type: 'BAR' | 'LINE' | 'PIE';
    x_axis_column: string;
    y_axis_column: string;
}

// NEW DYNAMIC INSIGHTS TYPES
export type SectionType = 'summary' | 'list' | 'chart' | 'kpi_grid';

export interface InsightSection {
    id: string; // Unique ID for keying
    type: SectionType;
    title: string;
    description?: string; // Optional context
    width: 1 | 2; // 1 = 50%, 2 = 100%
    
    // Content fields (optional based on type)
    textContent?: string;
    listItems?: string[];
    chartConfig?: DashboardChart;
    kpiItems?: Kpi[];
}

export interface AnalysisResult {
  dashboardTitle: string;
  sections: InsightSection[];
}

// DASHBOARD VIEW TYPES (Legacy/Specific view)
export interface DashboardAnalysisResult {
    dashboardTitle: string;
    kpis: Kpi[];
    charts: {
        admissionByDivision: DashboardChart;
        admissionVsCost: DashboardChart;
        patientSatisfaction: DashboardChart;
        availableStaff: DashboardChart;
        avgWaitTime: DashboardChart;
        treatmentConfidence: DashboardChart;
    }
}

// SMART ANALYSIS TYPES
export type AnalysisDepth = 'simple' | 'intermediate' | 'advanced';

export interface SmartAnalysisResult {
    title: string;
    trends: { title: string; description: string; impact: 'positive' | 'negative' | 'neutral' }[];
    anomalies: { title: string; description: string; severity: 'high' | 'medium' | 'low' }[];
    opportunities: { title: string; action: string }[];
    summary: {
        simple: string;
        intermediate: string;
        advanced: string;
    };
    charts?: DashboardChart[];
}

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Utility to clean JSON strings from Markdown
const cleanJsonString = (str: string): string => {
    return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

const generateInsights = async (csvData: string): Promise<AnalysisResult> => {
    const model = 'gemini-2.5-flash';
    // Truncate CSV more aggressively to prevent truncation of output
    const truncatedCsv = csvData.slice(0, 40000);

    const prompt = `
        Você é um **Data Storyteller** moderno e um **Editor Visual** meticuloso 🚀. 
        Sua missão é analisar os dados CSV e contar a história por trás dos números com uma estrutura impecável.

        **Diretrizes de Linguagem (CRÍTICO):**
        - Escreva em **Português do Brasil (pt-BR)** impecável.
        - **Revise sua própria escrita**: Evite erros de digitação.
        - Use frases claras e diretas.

        **Diretrizes de Formatação Visual (MUITO IMPORTANTE):**
        1.  **Estrutura:** Use Markdown (\`###\`) para subtítulos dentro dos resumos.
        2.  **Escaneabilidade:** Parágrafos CURTOS (máximo 2 linhas).
        3.  **Listas:** Sempre use bullet points (\`-\`).
        4.  **Números:** Formate valores decimais com no máximo 2 casas (ex: 10.55, 12.00%, R$ 50.20).

        **REGRAS CRÍTICAS DE CONCISÃO (PARA NÃO QUEBRAR O JSON):**
        ⚠️ **MUITO IMPORTANTE:** O output JSON tem um limite de tamanho.
        - **Resumos (summary):** MÁXIMO 350 caracteres. Seja direto.
        - **Listas (list):** MÁXIMO 5 itens por lista.
        - **Geral:** Priorize qualidade sobre quantidade.

        **Personalidade:**
        - Use emojis com moderação para destacar (ex: 📈, ⚠️, 💰).
        - Seja direto, evite "corporativês".

        **REGRAS CRÍTICAS (Lista Negra):**
        ⛔ **PROIBIDO:** Gráficos de "Distribuição de X" ou "Proporção de Y" baseados apenas em contagem.
        ⛔ **PROIBIDO:** Gráficos óbvios.
        ⛔ **PROIBIDO:** Listas longas (> 5 itens).

        **Estrutura do Relatório (JSON):**
        1.  **Título Impactante:** Ex: "🚀 Performance de Vendas Q3".
        2.  **Resumo Executivo (summary):** Texto curto e estruturado.
        3.  **KPIs (kpi_grid):** 3 a 6 números vitais (Arredonde floats para 2 casas).
        4.  **Destaques (list):** "🔥 Top 5 Destaques" ou "⚠️ Riscos".
        5.  **Visualizações (chart):** Use \`HORIZONTAL_BAR\` para rankings, \`LINE\` para tendências. Copie EXATAMENTE o nome do cabeçalho do CSV.

        **Dados CSV:**
        ---
        ${truncatedCsv}
        ---
    `;

    // Common Schema Definitions
    const chartSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['BAR', 'LINE', 'PIE', 'AREA_BAR_COMBO', 'TREEMAP', 'DONUT', 'RADAR', 'HORIZONTAL_BAR'] },
            x_axis_column: { type: Type.STRING },
            y_axis_columns: { type: Type.ARRAY, items: { type: Type.STRING } },
            category_column: { type: Type.STRING },
            value_column: { type: Type.STRING },
            data_labels: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "type"]
    };

    const kpiSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            value: { type: Type.STRING },
            subtext: { type: Type.STRING }
        }
    };

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        dashboardTitle: { type: Type.STRING },
        sections: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['summary', 'list', 'chart', 'kpi_grid'] },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    width: { type: Type.NUMBER }, // 1 or 2
                    textContent: { type: Type.STRING }, // For 'summary'
                    listItems: { type: Type.ARRAY, items: { type: Type.STRING } }, // For 'list'
                    chartConfig: chartSchema, // For 'chart'
                    kpiItems: { type: Type.ARRAY, items: kpiSchema } // For 'kpi_grid'
                },
                required: ["id", "type", "title", "width"],
            }
        }
      },
      required: ["dashboardTitle", "sections"],
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2, 
            },
        });
        
        const jsonString = cleanJsonString(response.text);
        return JSON.parse(jsonString) as AnalysisResult;
    } catch (error) {
        console.error("Gemini API Error in generateInsights:", error);
        throw new Error("Erro ao gerar insights. A resposta foi cortada ou os dados são muito complexos. Tente um arquivo menor.");
    }
};

export const analyzeDocument = async (base64Data: string, mimeType: string): Promise<AnalysisResult> => {
    const model = 'gemini-2.5-flash';
    
    // Prompt focado em análise qualitativa, extração e organização inteligente
    const prompt = `
    Aja como um **Consultor de Negócios Sênior** e um **Especialista em Comunicação Visual**.
    
    Analise este documento e gere um **Diagnóstico Estratégico** visualmente organizado.

    **📍 Regra de Ouro da Formatação (Visual Clean):**
    - Todo texto gerado no campo \`textContent\` DEVE usar Markdown para estrutura.
    - Use **Títulos (###)** para separar ideias.
    - Use **Listas (-)** para enumerar pontos.
    - Use **Negrito** para ênfase.
    - Pule linhas entre parágrafos para dar "respiro" ao texto.
    - **Português Correto:** Escreva sem erros gramaticais ou de digitação.
    - **CONCISÃO:** Seja direto. Evite textos longos que possam quebrar a resposta.
    - **KPIs/Números:** Se encontrar métricas, formate com no máximo 2 casas decimais (ex: 15.50%).

    **1. Contexto:**
    Identifique o tipo de doc (Contrato, Relatório, Slide). Adapte o tom.

    **2. Estrutura de Saída (JSON):**

    *   **SEÇÃO 1: Resumo Inteligente (Smart Summary)**
        *   Resumo executivo de alto nível (Max 500 caracteres).
        *   Estruture com subtítulos se o texto for longo. (ex: ### Objetivo, ### Conclusão).

    *   **SEÇÃO 2: Destaques (Grid de KPIs ou Texto)**
        *   Se houver números: \`kpi_grid\`.
        *   Se for texto: Crie uma seção de destaques.

    *   **SEÇÃO 3: Análise de Riscos e Oportunidades**
        *   Lista de **⚠️ Pontos de Atenção** (Max 5 itens).
        *   Lista de **🚀 Recomendações** (Max 5 itens).

    *   **SEÇÃO 4: Tendências (Texto ou Gráfico)**
        *   Identifique padrões.
        *   Se houver tabela, tente gerar gráfico. Se não, texto estruturado.

    Gere a resposta estritamente no formato JSON definido pelo schema.
    `;

    // Reutilizar schemas definidos (simplificados aqui para o contexto da função)
    const kpiSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            value: { type: Type.STRING },
            subtext: { type: Type.STRING }
        }
    };
    
    const chartSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['BAR', 'LINE', 'PIE', 'HORIZONTAL_BAR'] },
            // Simplificado para docs: IA infere colunas fictícias baseadas no que leu
            x_axis_column: { type: Type.STRING },
            y_axis_columns: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["title", "type"]
    };

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        dashboardTitle: { type: Type.STRING, description: "Título curto e direto" },
        sections: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['summary', 'list', 'chart', 'kpi_grid'] },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    width: { type: Type.NUMBER },
                    textContent: { type: Type.STRING },
                    listItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                    chartConfig: chartSchema,
                    kpiItems: { type: Type.ARRAY, items: kpiSchema }
                },
                required: ["id", "type", "title", "width"],
            }
        }
      },
      required: ["dashboardTitle", "sections"],
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                },
                { text: prompt }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2, // Precision mode
            },
        });

        const jsonString = cleanJsonString(response.text);
        return JSON.parse(jsonString) as AnalysisResult;

    } catch (error) {
        console.error("Gemini API Error in analyzeDocument:", error);
        throw new Error("Não foi possível analisar este documento. Verifique se o arquivo não está corrompido ou protegido por senha.");
    }
};

const generateDashboard = async (csvData: string): Promise<DashboardAnalysisResult> => {
    const model = 'gemini-2.5-flash';
    // Truncate CSV for Dashboard as well
    const truncatedCsv = csvData.slice(0, 50000);

    const prompt = `
        Você é um especialista em visualização de dados e Business Intelligence 📊.
        
        **Personalidade:**
        Moderno, focado em métricas de negócio. Use emojis nos títulos dos KPIs para dar contexto (💰, 👥, ⏱️).

        **Qualidade do Texto:**
        Garanta que todos os títulos e textos estejam em português correto, sem erros de digitação.
        
        **Formatação Numérica (IMPORTANTE):**
        - Arredonde todos os valores numéricos decimais para 2 casas (ex: 12.34).
        - Mantenha a moeda ou símbolo (ex: R$ 12,34 ou 15%).

        Instruções:
        1.  **Título do Dashboard**: Conciso e profissional.
        2.  **KPIs**: 3 métricas de alto nível.
        3.  **Gráficos**: 6 gráficos variados.
        4.  **Mapeamento de Colunas**: Use EXATAMENTE os nomes das colunas do CSV fornecido.

        Dados CSV:
        ---
        ${truncatedCsv}
        ---
    `;
    
    const chartSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING },
            x_axis_column: { type: Type.STRING },
            y_axis_columns: { type: Type.ARRAY, items: { type: Type.STRING } },
            category_column: { type: Type.STRING },
            value_column: { type: Type.STRING },
            data_labels: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "type"]
    };

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            dashboardTitle: { type: Type.STRING },
            kpis: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        value: { type: Type.STRING },
                        subtext: { type: Type.STRING }
                    },
                    required: ["title", "value", "subtext"]
                }
            },
            charts: {
                type: Type.OBJECT,
                properties: {
                    admissionByDivision: chartSchema,
                    admissionVsCost: chartSchema,
                    patientSatisfaction: chartSchema,
                    availableStaff: chartSchema,
                    avgWaitTime: chartSchema,
                    treatmentConfidence: chartSchema
                },
                required: ["admissionByDivision", "admissionVsCost", "patientSatisfaction", "availableStaff", "avgWaitTime", "treatmentConfidence"]
            }
        },
        required: ["dashboardTitle", "kpis", "charts"]
    };

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.2,
        },
    });
    const jsonString = cleanJsonString(response.text);
    return JSON.parse(jsonString) as DashboardAnalysisResult;
}

export const chatWithData = async (userMessage: string, context: { type: 'csv' | 'document', data: string, mimeType?: string }): Promise<string> => {
    const model = 'gemini-2.5-flash';
    
    let prompt = '';
    let contents: any[] = [];

    const basePrompt = `
        Você é um **Assistente de Dados Conciso e Direto** 🤖.
        
        **REGRA DE OURO: SEJA BREVE E GRAMATICALMENTE CORRETO.**
        O usuário deseja respostas rápidas e objetivas.
        
        **Diretrizes:**
        1. **Tamanho:** Máximo de 2 a 3 parágrafos curtos. Se possível, responda em uma frase.
        2. **Estilo:** Vá direto ao ponto. Não use introduções como "Com base nos dados..." ou "Analisando o arquivo...".
        3. **Formatação:** Use **negrito** para destacar números e conclusões chave. Use listas (\`-\`) curtas apenas se necessário.
        4. **Foco:** Responda EXCLUSIVAMENTE ao que foi perguntado, usando os dados fornecidos.
        5. **Escrita:** Verifique se não há palavras escritas erradas ou letras duplicadas antes de responder.
        6. **Números:** Arredonde valores quebrados para 2 casas decimais.
    `;

    if (context.type === 'csv') {
        // Truncate CSV for Chat to maintain conversation flow speed
        const truncatedCsv = context.data.slice(0, 40000);
        prompt = `
            ${basePrompt}

            **Contexto (Dados CSV):**
            ---
            ${truncatedCsv}
            ---
            
            **Instruções Específicas:**
            - Se o usuário pedir um gráfico, gere o JSON no formato: \`<chart_json>{"title": "...", "type": "BAR|LINE|PIE", "x_axis_column": "ExactColName", "y_axis_column": "ExactColName"}</chart_json>\`.
            - Use nomes de colunas exatos.

            **Pergunta:**
            "${userMessage}"
        `;
        contents = [{ text: prompt }];

    } else {
        // Document Analysis (Multimodal)
        prompt = `
            ${basePrompt}

            **Instruções Específicas para Documentos:**
            - Resuma ou responda de forma ultra-resumida.
            - Extraia apenas a informação essencial solicitada.

            **Pergunta:**
            "${userMessage}"
        `;
        
        contents = [
            {
                inlineData: {
                    mimeType: context.mimeType || 'application/pdf',
                    data: context.data // Base64
                }
            },
            { text: prompt }
        ];
    }

    const response = await ai.models.generateContent({
        model,
        contents: contents,
        config: {
            temperature: 0.2, // Low for correctness
        }
    });
    
    return response.text;
};


export const generateSmartAnalysis = async (csvData: string): Promise<SmartAnalysisResult> => {
    const model = 'gemini-2.5-flash';
    const truncatedCsv = csvData.slice(0, 40000);

    const prompt = `
        Você é uma IA de BI Avançada 🧠. Analise os dados e gere uma Análise Estratégica.

        **Instruções de Estilo:**
        - **Sem Jargões Vazios:** Seja direto.
        - **Português Perfeito:** Cuidado extremo com erros de ortografia.
        - **Formatação Markdown:** Nos textos de resumo ('summary'), use \`###\` para subtítulos, bullet points e negrito para organizar as ideias. O texto deve ser visualmente limpo e escaneável.
        - **CONCISÃO:** Mantenha os textos dos resumos (simple, intermediate, advanced) com no máximo 500 caracteres cada.
        - **NÚMEROS:** Todo valor float deve ter no máximo 2 casas decimais (Ex: 10.45, 99.99%).

        **Dados CSV:**
        ${truncatedCsv}

        **Multinível:**
        - **Simples:** Linguagem coloquial, tópicos curtos.
        - **Intermediário:** Foco em KPIs.
        - **Avançado:** Detalhes técnicos.
        
        **Formato de Saída (JSON):**
        Siga rigorosamente o schema fornecido.
    `;

    const chartSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['BAR', 'LINE', 'PIE', 'AREA_BAR_COMBO'] },
            x_axis_column: { type: Type.STRING },
            y_axis_columns: { type: Type.ARRAY, items: { type: Type.STRING } },
        }
    };

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            trends: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        impact: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] }
                    }
                }
            },
            anomalies: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        severity: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
                    }
                }
            },
            opportunities: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        action: { type: Type.STRING }
                    }
                }
            },
            summary: {
                type: Type.OBJECT,
                properties: {
                    simple: { type: Type.STRING },
                    intermediate: { type: Type.STRING },
                    advanced: { type: Type.STRING }
                }
            },
            charts: {
                type: Type.ARRAY,
                items: chartSchema
            }
        },
        required: ["title", "trends", "anomalies", "opportunities", "summary"]
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2,
            },
        });

        const jsonString = cleanJsonString(response.text);
        return JSON.parse(jsonString) as SmartAnalysisResult;

    } catch (error) {
        console.error("Smart Analysis Error:", error);
        throw new Error("Erro ao gerar Análise Inteligente.");
    }
};

export const analyzeExcelData = async (csvData: string, analysisType: 'insights' | 'dashboards'): Promise<AnalysisResult | DashboardAnalysisResult> => {
    try {
        if (analysisType === 'dashboards') {
            const result = await generateDashboard(csvData);
            if (!result.dashboardTitle || !result.kpis || result.kpis.length < 3 || !result.charts) {
              throw new Error("Resposta inválida do Dashboard.");
            }
            return result;
        } else {
            const result = await generateInsights(csvData);
            if (!result.dashboardTitle || !result.sections || result.sections.length === 0) {
              throw new Error("Resposta inválida de Insights.");
            }
            return result;
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        let errorMessage = "Falha ao obter insights. Tente novamente.";
        if (error instanceof Error) {
            if (error.message.includes("SAFETY")) {
                errorMessage = "Conteúdo bloqueado por segurança."
            } else if (error.message.includes("required fields") || error instanceof SyntaxError) {
                errorMessage = "Erro de formato na resposta da IA. Tente um arquivo menor."
            } else {
                errorMessage = error.message;
            }
        }
        throw new Error(errorMessage);
    }
};