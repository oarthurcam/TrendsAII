import { GoogleGenAI, Type } from "@google/genai";

// Define the structure for the AI's response
export interface AnalysisResult {
  dashboardTitle: string;
  executiveSummary: string;
  keyInsights: string;
  suggestedChart: {
    title: string;
    type: 'BAR' | 'LINE' | 'PIE';
    x_axis_column: string;
    y_axis_column: string;
  };
  quickQuestions: {
    question: string;
    answer: string;
  }[];
  layout: {
      cells: {
          componentKey: 'EXECUTIVE_SUMMARY' | 'KEY_INSIGHTS' | 'CHART' | 'QUICK_QA';
          width: 1 | 2; // 1 for half-width, 2 for full-width
      }[];
  }[];
}

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Define the JSON schema for the model's response
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    dashboardTitle: {
      type: Type.STRING,
      description: "Um título curto e descritivo para o painel, resumindo o tópico principal dos dados (ex: 'Análise de Vendas T1', 'Desempenho da Campanha de Marketing').",
    },
    executiveSummary: {
      type: Type.STRING,
      description: "Um resumo breve e de alto nível das descobertas mais importantes nos dados, escrito em um parágrafo.",
    },
    keyInsights: {
      type: Type.STRING,
      description: "Os insights-chave da análise. Apresente SEMPRE como uma lista de tópicos claros e legíveis. Cada tópico deve começar com um asterisco ('* ') seguido pelo insight. Formate como uma única string com os tópicos separados por quebras de linha. Exemplo: '* A categoria X lidera as vendas.\\n* O produto Y teve uma queda de performance.'",
    },
    suggestedChart: {
      type: Type.OBJECT,
      description: "Detalhes para um gráfico sugerido para visualizar um achado chave. Escolha o tipo de gráfico e as colunas mais apropriadas. Varie o tipo de gráfico (Barra, Linha, Pizza) com base no que melhor representa os dados; não use sempre o mesmo tipo.",
      properties: {
        title: { 
          type: Type.STRING, 
          description: "Um título descritivo para o gráfico." 
        },
        type: {
          type: Type.STRING,
          description: "O tipo de gráfico recomendado. Escolha entre 'BAR', 'LINE' ou 'PIE'.",
        },
        x_axis_column: {
          type: Type.STRING,
          description: "O nome da coluna do CSV a ser usada para o eixo X (para gráficos de BARRA e LINHA) ou para os rótulos (para gráficos de PIZZA). Deve corresponder exatamente a um nome de coluna.",
        },
        y_axis_column: {
          type: Type.STRING,
          description: "O nome da coluna do CSV a ser usada para o eixo Y (para gráficos de BARRA e LINHA) ou para os valores (para gráficos de PIZZA). Deve corresponder exatamente a um nome de coluna e deve ser uma coluna numérica.",
        },
      },
      required: ["title", "type", "x_axis_column", "y_axis_column"],
    },
    quickQuestions: {
      type: Type.ARRAY,
      description: "Uma lista de 2 a 3 perguntas e respostas curtas sobre a análise geral, para ajudar o leitor a interpretar os resultados.",
      items: {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING,
            description: "Uma pergunta curta e direta sobre os dados."
          },
          answer: {
            type: Type.STRING,
            description: "Uma resposta curta e clara para a pergunta."
          }
        },
        required: ["question", "answer"],
      }
    },
    layout: {
        type: Type.ARRAY,
        description: "Projete um layout de painel dinâmico e flexível. A estrutura é uma grade de 2 colunas. Você pode colocar um componente em uma linha de largura total (definindo sua largura como 2) ou colocar dois componentes lado a lado (definindo a largura de cada um como 1). A soma das larguras em cada linha deve ser 2. Use os quatro componentes ('EXECUTIVE_SUMMARY', 'KEY_INSIGHTS', 'CHART', 'QUICK_QA') exatamente uma vez em todo o layout. Seja criativo e varie a estrutura do layout entre as análises.",
        items: {
            type: Type.OBJECT,
            properties: {
                cells: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            componentKey: { type: Type.STRING, description: "O identificador do componente ('EXECUTIVE_SUMMARY', 'KEY_INSIGHTS', 'CHART', ou 'QUICK_QA')." },
                            width: { type: Type.NUMBER, description: "A largura da célula na grade de 2 colunas (1 para meia largura, 2 para largura total)." }
                        },
                        required: ["componentKey", "width"],
                    }
                }
            },
            required: ["cells"],
        }
    }
  },
  required: ["dashboardTitle", "executiveSummary", "keyInsights", "suggestedChart", "quickQuestions", "layout"],
};


export const analyzeExcelData = async (csvData: string): Promise<AnalysisResult> => {
  const model = 'gemini-2.5-flash';
  const prompt = `
    Você é um analista de dados sênior e um designer de painéis, especializado em criar diagnósticos de dados rápidos, criativos e visualmente dinâmicos. Sua tarefa é examinar os dados CSV a seguir e gerar um "Painel de Descobertas" em formato JSON.

    Instruções:
    1.  **Analisar**: Identifique as tendências, padrões ou anomalias mais importantes nos dados.
    2.  **Layout Dinâmico (layout)**: Projete um layout de painel flexível. Em vez de uma grade 2x2 fixa, defina uma estrutura de linhas e células. A grade base tem 2 colunas.
        -   Para um componente ocupar uma linha inteira, coloque-o em uma célula com \`"width": 2\`.
        -   Para colocar dois componentes lado a lado, coloque cada um em uma célula com \`"width": 1\` dentro da mesma linha.
        -   A soma das larguras das células em uma linha DEVE ser 2.
        -   Utilize os quatro componentes ('EXECUTIVE_SUMMARY', 'KEY_INSIGHTS', 'CHART', 'QUICK_QA') exatamente uma vez em todo o layout. Varie o layout para tornar cada painel único.
    3.  **Título do Painel**: Crie um título conciso e descritivo para o painel.
    4.  **Resumo Executivo**: Escreva um resumo conciso que um líder de negócios possa entender rapidamente.
    5.  **Insights-Chave (Formato de Tópicos)**: Apresente os insights mais importantes SEMPRE como uma lista de tópicos. Cada tópico deve começar com um asterisco ('* '). Isso cria uma apresentação clara, legível e confortável para o usuário separar e entender cada ponto da análise.
    6.  **Visualização (Variada)**: Determine o melhor gráfico único (Barra, Linha ou Pizza) para representar um aspecto crítico dos dados. Evite usar sempre o mesmo tipo de gráfico; escolha o que for mais eficaz.
    7.  **Dúvidas Rápidas**: Crie uma pequena seção de Q&A com 2 a 3 perguntas e respostas curtas para facilitar a interpretação.
    8.  **Formato**: Você DEVE fornecer sua resposta em formato JSON de acordo com o esquema especificado. Não inclua nenhum texto introdutório ou formatação markdown.

    Aqui estão os dados:
    ---
    ${csvData}
    ---
  `;

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
    });
    
    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);

    // Basic validation
    if (!result.dashboardTitle || !result.executiveSummary || !result.keyInsights || !result.suggestedChart || !result.quickQuestions || !result.layout) {
      throw new Error("A resposta da IA está faltando campos obrigatórios.");
    }
    
    const allComponents = result.layout.flatMap((row: any) => row.cells.map((cell: any) => cell.componentKey));
    if (allComponents.length !== 4) {
      throw new Error("O layout da IA não contém todos os quatro componentes necessários.");
    }
    
    return result as AnalysisResult;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    let errorMessage = "Falha ao obter insights da IA. Por favor, tente novamente mais tarde.";
    if (error instanceof Error && error.message.includes("SAFETY")) {
        errorMessage = "A resposta foi bloqueada devido a políticas de segurança. Tente com um arquivo diferente."
    } else if (error instanceof Error && error.message.includes("required fields")) {
        errorMessage = "A IA retornou uma resposta em um formato inesperado. Por favor, tente novamente."
    }
    throw new Error(errorMessage);
  }
};