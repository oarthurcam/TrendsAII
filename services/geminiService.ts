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

// --- TEXT CORRECTION UTILITIES ---

const fixTypography = (text: string): string => {
    if (!text) return text;
    let corrected = text;

    // 1. Remove double spaces
    corrected = corrected.replace(/\s+/g, ' ');

    // 2. Fix spaces before punctuation (e.g. "word ." -> "word.")
    corrected = corrected.replace(/\s+([.,;:?!])/g, '$1');

    // 3. Ensure space after punctuation (e.g. "word.Word" -> "word. Word"), avoiding decimals (10.5)
    corrected = corrected.replace(/([.,;:?!])(?=[A-Za-zÀ-ÿ])/g, '$1 ');

    // 4. Fix currency formatting spacing (e.g. "R$ 10,00" -> "R$ 10,00" - keep as is, but ensure consistency)
    // Sometimes AI puts "R$10", standardizing to "R$ 10" looks better or keeping as is if intended.
    // Let's ensure standard currency spacing for BRL
    corrected = corrected.replace(/R\$(\d)/g, 'R$ $1');

    // 5. Capitalize first letter of the string
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);

    return corrected.trim();
};

// Recursive function to apply corrections to all string fields in an object
const applyTextCorrections = (obj: any): any => {
    if (typeof obj === 'string') {
        return fixTypography(obj);
    } else if (Array.isArray(obj)) {
        return obj.map(item => applyTextCorrections(item));
    } else if (typeof obj === 'object' && obj !== null) {
        const newObj: any = {};
        for (const key in obj) {
            // Skip keys that are strictly code identifiers if needed, but usually titles/desc need fixing
            if (key === 'type' || key === 'id' || key === 'x_axis_column' || key === 'y_axis_columns' || key === 'value_column' || key === 'category_column') {
                newObj[key] = obj[key];
            } else {
                newObj[key] = applyTextCorrections(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
};

// ---------------------------------

// Utility to extract headers
const getCsvHeaders = (csvData: string): string[] => {
    const firstLine = csvData.split('\n')[0];
    if (!firstLine) return [];
    return firstLine.split(',').map(h => h.trim());
};

const generateInsights = async (csvData: string): Promise<AnalysisResult> => {
    const model = 'gemini-2.5-flash';
    // Truncate CSV to prevent token overflow, but keep enough for context
    const truncatedCsv = csvData.slice(0, 35000); 
    const validHeaders = getCsvHeaders(csvData);

    const prompt = `
        Atue como um **Analista de Dados Sênior** e **Editor Chefe**. 🧐
        Sua missão é analisar os dados CSV fornecidos e gerar um relatório de insights **extremamente preciso, factual e gramaticalmente perfeito**.

        **REGRAS DE OURO PARA PRECISÃO (CRÍTICO):**
        1.  **Fidelidade aos Dados:** Baseie-se APENAS nos dados fornecidos. Não invente números, datas ou conclusões.
        2.  **Validação de Colunas:** Ao criar gráficos, use **ESTRITAMENTE** os nomes das colunas listados abaixo.
        3.  **Português Impecável:** Escreva em Português do Brasil formal.
        4.  **Revisão Final:** Antes de gerar o JSON, releia seus textos. Corrija erros de concordância, regência e digitação.

        **LISTA DE COLUNAS VÁLIDAS:** [${validHeaders.join(', ')}]

        **Diretrizes de Formatação Visual:**
        1.  **Estrutura:** Use Markdown (\`###\`) para subtítulos claros nos resumos.
        2.  **Conciso:** Vá direto ao ponto.
        3.  **Listas:** Use bullet points (\`-\`) para facilitar a leitura.
        4.  **Numeração:** Formate valores decimais com no máximo 2 casas (ex: 10.55, 12.00%, R$ 50.20).

        **Visualizações (Charts) - INSTRUÇÕES TÉCNICAS:**
        - **Muitos dados?** Se uma coluna tiver muitos valores únicos (ex: > 10 produtos), configure o gráfico para focar nos "Top 10".
        - **Tipos:**
          - \`HORIZONTAL_BAR\`: Ideal para rankings (ex: Top Vendedores).
          - \`LINE\`: Apenas para séries temporais (Datas no eixo X).
          - \`PIE/DONUT\`: Apenas para poucas categorias (max 5).

        **Estrutura do Relatório (JSON):**
        1.  **Título Profissional:** Ex: "Relatório de Performance - Q3".
        2.  **Resumo Executivo (summary):** Análise textual de alto nível.
        3.  **KPIs (kpi_grid):** 3 a 6 métricas chave (Total, Média, Máximo).
        4.  **Destaques (list):** Lista de pontos de atenção ou oportunidades.
        5.  **Visualizações (chart):** 2 a 3 gráficos essenciais para visualizar tendências.

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
                temperature: 0.1, 
            },
        });
        
        const jsonString = cleanJsonString(response.text);
        const parsed = JSON.parse(jsonString);
        return applyTextCorrections(parsed) as AnalysisResult;
    } catch (error) {
        console.error("Gemini API Error in generateInsights:", error);
        throw new Error("Erro ao gerar insights. A resposta foi cortada ou os dados são muito complexos. Tente um arquivo menor.");
    }
};

export const analyzeDocument = async (base64Data: string, mimeType: string): Promise<AnalysisResult> => {
    const model = 'gemini-2.5-flash';
    
    // Prompt focado em análise qualitativa, extração e organização inteligente
    const prompt = `
    Atue como um **Auditor de Documentos Sênior**.
    
    **MISSÃO:** Analisar o documento anexo e extrair informações com **precisão cirúrgica** e **português impecável**.

    **REGRAS DE QUALIDADE:**
    1.  **Não Alucine:** Se a informação não consta no documento, não a invente.
    2.  **Correção:** Revise a ortografia e gramática do texto gerado antes de finalizar.
    3.  **Estrutura:** Use Markdown para organizar o texto visualmente.
    4.  **Sintese:** Seja conciso.

    **Estrutura de Saída (JSON):**

    *   **SEÇÃO 1: Resumo Executivo**
        *   Resumo claro do conteúdo (Max 500 caracteres).
    
    *   **SEÇÃO 2: Destaques Chave**
        *   Extraia números ou pontos principais em formato de KPIs ou Lista.

    *   **SEÇÃO 3: Riscos e Recomendações**
        *   Identifique pontos de atenção ou próximos passos sugeridos pelo documento.

    *   **SEÇÃO 4: Análise Adicional**
        *   Identifique tendências ou padrões se houver.

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
                temperature: 0.1, // Precision mode
            },
        });

        const jsonString = cleanJsonString(response.text);
        const parsed = JSON.parse(jsonString);
        return applyTextCorrections(parsed) as AnalysisResult;

    } catch (error) {
        console.error("Gemini API Error in analyzeDocument:", error);
        throw new Error("Não foi possível analisar este documento. Verifique se o arquivo não está corrompido ou protegido por senha.");
    }
};

const generateDashboard = async (csvData: string): Promise<DashboardAnalysisResult> => {
    const model = 'gemini-2.5-flash';
    // Truncate CSV for Dashboard as well
    const truncatedCsv = csvData.slice(0, 45000);
    const validHeaders = getCsvHeaders(csvData);

    const prompt = `
        Atue como um **Engenheiro de Analytics Sênior**. 📊
        
        **OBJETIVO:** Transformar os dados CSV brutos em um Dashboard executivo de alta precisão.

        **REGRAS DE INTEGRIDADE DE DADOS E CORREÇÃO:**
        1. **Mapeamento de Colunas:** Use **EXATAMENTE** e **APENAS** os nomes das colunas listados abaixo.
           **COLUNAS DISPONÍVEIS:** [${validHeaders.join(', ')}]
           
        2. **Tipagem:**
           - Para Eixo Y (Valores), escolha apenas colunas numéricas.
           - Para Eixo X (Categorias), escolha colunas descritivas.

        3. **Texto e Ortografia:**
           - Revise os títulos e subtítulos para garantir Português correto.
           - Evite abreviações obscuras.

        **Regras de Visualização:**
        - **Cardinalidade:** Se uma categoria tiver > 10 itens, o título do gráfico deve indicar "Top 10" ou "Principais".
        - **KPIs:** Gere métricas agregadas (Soma, Média) que realmente façam sentido para o negócio.

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
          temperature: 0.1, // High precision
        },
    });
    const jsonString = cleanJsonString(response.text);
    const parsed = JSON.parse(jsonString);
    return applyTextCorrections(parsed) as DashboardAnalysisResult;
}

export const chatWithData = async (userMessage: string, context: { type: 'csv' | 'document', data: string, mimeType?: string }): Promise<string> => {
    const model = 'gemini-2.5-flash';
    
    let prompt = '';
    let contents: any[] = [];

    const basePrompt = `
        Você é um **Assistente de Dados Analítico** 🤖.
        
        **OBJETIVO:** Responder à pergunta do usuário com base ESTRITAMENTE nos dados fornecidos.

        **REGRAS DE RESPOSTA:**
        1. **Fidelidade:** Não invente informações.
        2. **Conciso:** Responda de forma direta.
        3. **Português:** Use Português do Brasil correto. Revise sua resposta antes de enviar.
        4. **Formatação:** Use **negrito** para destacar os números ou conclusões mais importantes.
        
        **Pergunta do Usuário:**
        "${userMessage}"
    `;

    if (context.type === 'csv') {
        const truncatedCsv = context.data.slice(0, 40000);
        const validHeaders = getCsvHeaders(context.data);

        prompt = `
            ${basePrompt}

            **CONTEXTO (DADOS CSV):**
            ---
            ${truncatedCsv}
            ---

            **SOLICITAÇÃO DE GRÁFICOS:**
            - Se o usuário pedir um gráfico, gere um JSON no formato: \`<chart_json>{"title": "...", "type": "BAR|LINE|PIE", "x_axis_column": "COLUNA_EXATA", "y_axis_column": "COLUNA_EXATA"}</chart_json>\`.
            - ⚠️ **IMPORTANTE:** Use APENAS estes nomes de colunas: [${validHeaders.join(', ')}].
        `;
        contents = [{ text: prompt }];

    } else {
        // Document Analysis (Multimodal)
        prompt = `
            ${basePrompt}

            **Instruções para Documentos:**
            - Analise o documento anexo para encontrar a resposta.
            - Seja breve. Responda apenas o que foi perguntado.
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
            temperature: 0.1, // Low for correctness
        }
    });
    
    // Apply correction to the chat response text as well
    return fixTypography(response.text);
};


export const generateSmartAnalysis = async (csvData: string): Promise<SmartAnalysisResult> => {
    const model = 'gemini-2.5-flash';
    const truncatedCsv = csvData.slice(0, 40000);
    const validHeaders = getCsvHeaders(csvData);

    const prompt = `
        Atue como uma **IA de BI de Alta Precisão** 🧠.
        Analise os dados e gere uma análise estratégica factual.

        **REGRAS DE QUALIDADE:**
        1. **Fatos:** Apenas fatos contidos no CSV. Sem alucinações.
        2. **Ortografia:** Português do Brasil perfeito. Revise erros gramaticais.
        3. **Clareza:** Textos concisos, organizados com Markdown.
        4. **Precisão Numérica:** Arredonde valores para 2 casas decimais.

        **COLUNAS VÁLIDAS:** [${validHeaders.join(', ')}]

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
                temperature: 0.1,
            },
        });

        const jsonString = cleanJsonString(response.text);
        const parsed = JSON.parse(jsonString);
        return applyTextCorrections(parsed) as SmartAnalysisResult;

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