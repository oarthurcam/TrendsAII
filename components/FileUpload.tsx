import React, { useState, useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  fileName: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onAnalyze, isLoading, fileName }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleClick = () => {
    if (!isLoading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="bg-card p-6 rounded-xl flex flex-col items-center justify-center text-center gap-4 shadow-sm">
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`w-full p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 ease-in-out
          ${isLoading ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800/50' : 'cursor-pointer'}
          ${isDragging ? 'border-primary bg-primary/10 shadow-lg -translate-y-1' : 'border-border hover:border-primary/70 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:shadow-lg hover:-translate-y-1'}`}
        aria-disabled={isLoading}
      >
        <input 
          ref={fileInputRef} 
          id="file-upload" 
          name="file-upload" 
          type="file" 
          className="sr-only" 
          onChange={handleFileChange} 
          accept=".xlsx, .xls" 
          disabled={isLoading} 
        />
        
        {fileName && !isLoading ? (
          <>
            <span className="material-icons text-5xl text-green-500 mb-4">check_circle</span>
            <p className="mb-1 text-text font-medium">Arquivo pronto:</p>
            <p className="text-sm text-text-secondary font-mono break-all px-2">{fileName}</p>
            <p className="text-xs text-text-secondary mt-4 opacity-70">Clique ou arraste para trocar</p>
          </>
        ) : (
          <>
            <span className="material-icons text-5xl text-primary mb-4">upload_file</span>
            <p className="mb-1 text-text font-semibold">Arraste e solte o arquivo</p>
            <p className="text-sm text-text-secondary">ou clique para selecionar</p>
            <p className="text-xs text-text-secondary mt-4 opacity-70">Suporta .xlsx, .xls</p>
          </>
        )}
      </div>
      
      <button
        onClick={onAnalyze}
        disabled={!fileName || isLoading}
        className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primary/90 disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary transition-all duration-300 ease-in-out enabled:hover:-translate-y-0.5 enabled:hover:shadow-lg enabled:hover:shadow-primary/40"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analisando...
          </>
        ) : (
          'Gerar Insights'
        )}
      </button>
    </div>
  );
};