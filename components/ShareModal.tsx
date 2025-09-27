import React, { useState, useEffect, RefObject } from 'react';

declare const html2canvas: any;

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    dashboardRef: RefObject<HTMLElement>;
    title?: string | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, dashboardRef, title }) => {
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && dashboardRef.current) {
            const element = dashboardRef.current;
            setIsLoading(true);
            setPreviewImage(null);
            
            setTimeout(() => {
                const isDarkMode = document.documentElement.classList.contains('dark');
                const backgroundColor = isDarkMode ? '#0f172a' : '#f7f8fa';

                html2canvas(element, {
                    useCORS: true,
                    backgroundColor: backgroundColor,
                    scale: 2, // Higher scale for better resolution
                    windowWidth: element.scrollWidth,
                    windowHeight: element.scrollHeight,
                }).then((sourceCanvas: HTMLCanvasElement) => {
                    const TARGET_WIDTH = 1920;
                    const TARGET_HEIGHT = 1080; // 16:9 aspect ratio
                    const HEADER_HEIGHT = 160;
                    const FOOTER_HEIGHT = 90;
                    const CONTENT_AREA_WIDTH = TARGET_WIDTH - 120; // Add horizontal padding
                    const CONTENT_AREA_HEIGHT = TARGET_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;

                    const finalCanvas = document.createElement('canvas');
                    finalCanvas.width = TARGET_WIDTH;
                    finalCanvas.height = TARGET_HEIGHT;
                    const ctx = finalCanvas.getContext('2d');

                    if (!ctx) {
                        setPreviewImage(sourceCanvas.toDataURL('image/png'));
                        setIsLoading(false);
                        return;
                    }

                    // 1. Fill background of the new 16:9 canvas
                    ctx.fillStyle = backgroundColor;
                    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

                    // 2. Calculate scaling to fit content into the dedicated content area
                    const sourceRatio = sourceCanvas.width / sourceCanvas.height;
                    const contentAreaRatio = CONTENT_AREA_WIDTH / CONTENT_AREA_HEIGHT;
                    let drawWidth, drawHeight;

                    if (sourceRatio > contentAreaRatio) {
                        // Source is wider, fit to width
                        drawWidth = CONTENT_AREA_WIDTH;
                        drawHeight = drawWidth / sourceRatio;
                    } else {
                        // Source is taller, fit to height
                        drawHeight = CONTENT_AREA_HEIGHT;
                        drawWidth = drawHeight * sourceRatio;
                    }

                    const offsetX = (TARGET_WIDTH - drawWidth) / 2;
                    const offsetY = HEADER_HEIGHT + ((CONTENT_AREA_HEIGHT - drawHeight) / 2);

                    // 3. Draw the captured image onto the new 16:9 canvas
                    ctx.drawImage(sourceCanvas, offsetX, offsetY, drawWidth, drawHeight);
                    
                    // 4. Draw Title and Footer
                    const textColor = isDarkMode ? '#f8fafc' : '#111827';
                    const secondaryTextColor = isDarkMode ? '#94a3b8' : '#6b7280';
                    
                    // Title
                    if (title) {
                        ctx.font = 'bold 52px Inter, sans-serif';
                        ctx.fillStyle = textColor;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(title, TARGET_WIDTH / 2, HEADER_HEIGHT / 2);
                    }

                    // Footer
                    ctx.font = '28px Inter, sans-serif';
                    ctx.fillStyle = secondaryTextColor;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('Gerado por TrendsAI', TARGET_WIDTH / 2, TARGET_HEIGHT - (FOOTER_HEIGHT / 2));
                    
                    setPreviewImage(finalCanvas.toDataURL('image/png'));
                    setIsLoading(false);
                }).catch((error: any) => {
                    console.error("Error generating canvas:", error);
                    setIsLoading(false);
                });
            }, 100);
        }
    }, [isOpen, dashboardRef, title]);

    if (!isOpen) return null;

    const handleDownload = () => {
        if (!previewImage) return;
        const link = document.createElement('a');
        link.href = previewImage;
        const safeTitle = title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'dashboard_insight';
        link.download = `${safeTitle}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/40" onClick={onClose}></div>
            <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-2xl flex flex-col m-4 max-h-[90vh]">
                <header className="p-6 border-b border-border flex items-center justify-between flex-shrink-0">
                    <h2 className="text-xl font-bold">Compartilhar Insights</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-500/10">
                        <span className="material-icons">close</span>
                    </button>
                </header>

                <main className="p-6 flex-grow overflow-y-auto">
                    <h3 className="font-semibold text-text mb-2">Pré-visualização</h3>
                    <p className="text-sm text-text-secondary mb-4">
                        Uma imagem do seu painel de insights será gerada para compartilhamento.
                    </p>
                    <div className="border border-border rounded-lg bg-slate-500/5 aspect-video w-full flex items-center justify-center overflow-hidden">
                        {isLoading && (
                             <div className="flex flex-col items-center text-text-secondary">
                                <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Gerando pré-visualização...</span>
                            </div>
                        )}
                        {previewImage && (
                            <img src={previewImage} alt="Pré-visualização do painel" className="object-contain max-h-full max-w-full" />
                        )}
                    </div>
                </main>
                
                <footer className="p-6 border-t border-border bg-card/50 flex justify-end gap-4 flex-shrink-0">
                     <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-card border border-border text-text hover:bg-slate-500/10"
                    >
                        Cancelar
                    </button>
                     <button
                        onClick={handleDownload}
                        disabled={!previewImage || isLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
                    >
                        <span className="material-icons text-base">download</span>
                        Baixar Imagem
                    </button>
                </footer>
            </div>
        </div>
    );
};