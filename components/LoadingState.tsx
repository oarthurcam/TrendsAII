import React, { useState, useEffect } from 'react';

const LOADING_STEPS = [
  "Lendo arquivo e estruturando dados...",
  "Identificando padrões e anomalias...",
  "Calculando métricas principais...",
  "Cruzando informações para insights...",
  "Gerando visualizações inteligentes...",
  "Finalizando organização do relatório..."
];

export const LoadingState: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Change step every 2.5 seconds
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        // Stop at the last step to prevent overflow
        if (prev < LOADING_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 animate-fade-in w-full">
      <div className="relative mb-8">
        {/* Pulsing Outer Ring */}
        <div className="absolute inset-0 rounded-full bg-primary/10 w-24 h-24 -ml-2 -mt-2 animate-ping opacity-75"></div>
        
        {/* Rotating Spinner */}
        <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            
            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-icons text-primary text-3xl animate-pulse">auto_awesome</span>
            </div>
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-text mb-3 text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
        Gerando Insights
      </h3>
      
      <div className="max-w-sm text-center space-y-1 h-12 flex flex-col justify-center">
        <p className="text-text-secondary text-sm font-medium animate-fade-in key={currentStep}">
          {LOADING_STEPS[currentStep]}
        </p>
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
                className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStep + 1) / LOADING_STEPS.length) * 100}%` }}
            ></div>
        </div>
      </div>
    </div>
  );
};