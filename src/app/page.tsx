'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Upload, Loader2, FileDown, BookOpen, ChevronLeft, CreditCard } from 'lucide-react';
import jsPDF from 'jspdf';

// Fontes de Luxo para o motor de tipografia
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;700;900&display=swap";

// --- MOTOR DE TIPOGRAFIA LUMINA v5.0 ---
async function generateTypographyLayer(bgUrl: string, config: any): Promise<string> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(bgUrl);

        const renderText = (loadedImg: HTMLImageElement | null) => {
            if (loadedImg) {
                ctx.drawImage(loadedImg, 0, 0, 800, 1200);
            } else {
                const pr = config.primary || '#0a0a0f';
                const bgGrad = ctx.createLinearGradient(0, 0, 800, 1200);
                bgGrad.addColorStop(0, pr);
                bgGrad.addColorStop(1, '#000000');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, 800, 1200);
            }

            const gradient = ctx.createLinearGradient(0, 0, 0, 1200);
            gradient.addColorStop(0, 'rgba(0,0,0,0.4)');
            gradient.addColorStop(0.3, 'rgba(0,0,0,0)');
            gradient.addColorStop(0.7, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 800, 1200);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 5;

            let rawTitle = config.title || 'EBOOK';
            rawTitle = rawTitle.replace(/^.*?:\s*/, '').replace(/:/g, '').trim();
            const title = rawTitle.toUpperCase();

            ctx.fillStyle = '#FFFFFF';
            let fontSize = 80;
            if (title.length > 20) fontSize = 60;
            if (title.length > 40) fontSize = 45;

            ctx.font = `900 ${fontSize}px 'Montserrat', sans-serif`;

            const words = title.split(' ');
            let line = '';
            let y = 450;
            const maxWidth = 700;
            const lineHeight = fontSize * 1.2;

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillText(line, 400, y);
                    line = words[n] + ' ';
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, 400, y);

            ctx.shadowBlur = 5;
            ctx.font = `400 24px 'Montserrat', sans-serif`;
            const subtitle = (config.subtitle || 'O guia prático para transformação').toUpperCase();
            const subWords = subtitle.split(' ');
            let subLine = '';
            let subY = y + 80;

            for (let n = 0; n < subWords.length; n++) {
                const testLine = subLine + subWords[n] + ' ';
                if (ctx.measureText(testLine).width > 600 && n > 0) {
                    ctx.fillText(subLine, 400, subY);
                    subLine = subWords[n] + ' ';
                    subY += 30;
                } else {
                    subLine = testLine;
                }
            }
            ctx.fillText(subLine, 400, subY);

            ctx.font = `700 20px 'Montserrat', sans-serif`;
            ctx.letterSpacing = "4px";
            ctx.fillText(config.author || 'LUMINA STUDIO', 400, 1100);

            ctx.strokeStyle = config.secondary || '#E93DE5';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(350, subY + 40);
            ctx.lineTo(450, subY + 40);
            ctx.stroke();

            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = bgUrl;
        img.onload = () => renderText(img);
        img.onerror = () => renderText(null);
        setTimeout(() => { if (canvas.toDataURL('image/jpeg').length < 1000) renderText(null); }, 6000);
    });
}

export default function Home() {
    const [content, setContent] = useState('');
    const [customTitle, setCustomTitle] = useState('');
    const [coverDescription, setCoverDescription] = useState('');
    const [approvedTheme, setApprovedTheme] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [userCredits, setUserCredits] = useState(1000);
    const [requiredCredits, setRequiredCredits] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isCoverPreviewing, setIsCoverPreviewing] = useState(false);
    const [generatedEbook, setGeneratedEbook] = useState<any>(null);
    const [coverImageData, setCoverImageData] = useState<string | null>(null);
    const [isGeneratingCover, setIsGeneratingCover] = useState(false);
    const [chapterImages, setChapterImages] = useState<string[]>([]);
    const [isGeneratingChapters, setIsGeneratingChapters] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [showDebug, setShowDebug] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const addLog = (msg: string) => {
        setDebugLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    useEffect(() => {
        if (content.trim().length === 0) setRequiredCredits(0);
        else setRequiredCredits(Math.ceil(content.length / 500));
    }, [content]);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleGenerateCoverPreview = async () => {
        if (!customTitle && !coverDescription) return addLog("Erro: Digite título ou descrição.");
        setIsCoverPreviewing(true);
        addLog("Solicitando design de capa...");
        try {
            const res = await fetch('/api/generate-cover-theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: customTitle, description: coverDescription }),
            });
            const theme = await res.json();
            setApprovedTheme(theme);
            addLog(`Design "${theme.design_mood}" selecionado.`);
            await generateVisualCover(theme);
        } catch (error) { addLog("Erro ao gerar prévia."); }
        finally { setIsCoverPreviewing(false); }
    };

    const generateVisualCover = async (theme: any) => {
        setIsGeneratingCover(true);
        const artUrl = `https://pollinations.ai/p/${encodeURIComponent(theme.image_generation_prompt + ". NO TEXT")}?width=800&height=1200&seed=${Math.floor(Math.random() * 1000)}&model=flux&nologo=true`;
        const merged = await generateTypographyLayer(artUrl, {
            title: theme.title || customTitle,
            subtitle: "Premium Editorial Series",
            author: "LUMINA STUDIO",
            primary: theme.primary_color,
            secondary: theme.secondary_color
        });
        setCoverImageData(merged);
        setIsGeneratingCover(false);
    };

    const handleCreateEbook = async () => {
        if (!content || requiredCredits > userCredits || cooldown > 0) return;
        setIsLoading(true);
        setDebugLogs([]);
        addLog("Compilando eBook...");
        try {
            const response = await fetch('/api/generate-ebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, approvedTitle: customTitle, approvedTheme }),
            });
            const data = await response.json();
            setGeneratedEbook(data);
            setUserCredits(prev => prev - requiredCredits);
            if (data.chapters) {
                setIsGeneratingChapters(true);
                const images = data.chapters.map((c: any) =>
                    `https://pollinations.ai/p/${encodeURIComponent(c.chapter_image_prompt || c.title)}?width=800&height=600&seed=${Math.floor(Math.random() * 1000)}&model=flux&nologo=true`
                );
                setChapterImages(images);
                setIsGeneratingChapters(false);
            }
        } catch (error: any) { addLog(`Erro: ${error.message}`); }
        finally { setIsLoading(false); }
    };

    const downloadEbookPDF = async () => {
        if (!generatedEbook) return;
        setIsLoading(true);
        try {
            const doc = new jsPDF();
            const theme = generatedEbook.visual_theme || {};
            const [pr, pg, pb] = theme.primary_color ? [parseInt(theme.primary_color.slice(1, 3), 16), parseInt(theme.primary_color.slice(3, 5), 16), parseInt(theme.primary_color.slice(5, 7), 16)] : [26, 24, 48];
            const [sr, sg, sb] = theme.secondary_color ? [parseInt(theme.secondary_color.slice(1, 3), 16), parseInt(theme.secondary_color.slice(3, 5), 16), parseInt(theme.secondary_color.slice(5, 7), 16)] : [233, 61, 229];

            const margin = 28;
            const pageWidth = 210;
            const contentWidth = pageWidth - (margin * 2);

            // Capa
            if (coverImageData) {
                const imgFormat = coverImageData.includes('png') ? 'PNG' : 'JPEG';
                doc.addImage(coverImageData, imgFormat, 0, 0, 210, 297, undefined, 'FAST');
            }

            // Capítulos
            for (let idx = 0; idx < (generatedEbook.chapters || []).length; idx++) {
                const chapter = generatedEbook.chapters[idx];
                doc.addPage();
                doc.setDrawColor(sr, sg, sb);
                doc.rect(10, 10, 190, 277);

                doc.setTextColor(sr, sg, sb);
                doc.setFontSize(140);
                doc.text(`${idx + 1}`, 105, 120, { align: 'center' });

                const chapterTitle = (chapter.title || '').toUpperCase();
                let fontSize = chapterTitle.length > 50 ? 15 : 24;
                doc.setFontSize(fontSize);
                doc.setFont('helvetica', 'bold');
                doc.text(doc.splitTextToSize(chapterTitle, 170), 105, 140, { align: 'center' });

                if (chapterImages[idx]) {
                    try {
                        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(chapterImages[idx])}`;
                        const imgRes = await fetch(proxyUrl);
                        if (imgRes.ok) {
                            const blob = await imgRes.blob();
                            const base64 = await new Promise<string>((res) => {
                                const reader = new FileReader();
                                reader.onloadend = () => res(reader.result as string);
                                reader.readAsDataURL(blob);
                            });
                            doc.addImage(base64, 'JPEG', 30, 160, 150, 112, undefined, 'FAST');
                        }
                    } catch (e) { }
                }

                // Conteúdo
                doc.addPage();
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(sr, sg, sb);
                doc.text(generatedEbook.title.toUpperCase(), margin, 15);
                doc.text(`CAPÍTULO ${idx + 1}`, 210 - margin, 15, { align: 'right' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(11);
                doc.setTextColor(40, 40, 40);
                let curY = 35;
                const paragraphs = (chapter.content || '').split('\n').filter((p: string) => p.trim());
                paragraphs.forEach((para: string) => {
                    const lines = doc.splitTextToSize(para, contentWidth);
                    lines.forEach((line: string) => {
                        if (curY > 275) {
                            doc.addPage();
                            doc.setFont('helvetica', 'normal');
                            curY = 35;
                        }
                        doc.text(line, margin, curY);
                        curY += 8;
                    });
                    curY += 4;
                });
            }
            doc.save(`${(generatedEbook.title || 'ebook').replace(/[^a-z0-9]/gi, '_')}.pdf`);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    return (
        <main className="min-h-screen flex flex-col pt-20 pb-40 bg-[#050510] text-white overflow-x-hidden">
            <style jsx global>{` @import url('${GOOGLE_FONTS_URL}'); body { font-family: 'Montserrat', sans-serif; background: #050510; } `}</style>

            <div className="max-w-6xl mx-auto px-6 w-full relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-16">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-xl flex items-center justify-center">
                            <Sparkles className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter uppercase">LUMINA <span className="text-purple-400">STUDIO</span></h1>
                            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Motor Editorial de Luxo v5.0</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-left">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4 mb-2">
                            {[1, 2].map(s => (
                                <div key={s} className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${currentStep >= s ? 'bg-purple-600' : 'bg-white/10 text-gray-500'}`}>{s}</div>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${currentStep === s ? 'text-white' : 'text-gray-500'}`}>{s === 1 ? 'Capa' : 'Conteúdo'}</span>
                                </div>
                            ))}
                        </div>

                        <AnimatePresence mode="wait">
                            {currentStep === 1 ? (
                                <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 bg-white/5 p-8 rounded-3xl border border-white/10">
                                    <h2 className="text-xl font-black uppercase tracking-tighter">1. Design da Capa</h2>
                                    <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Título do eBook" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold" />
                                    <textarea value={coverDescription} onChange={(e) => setCoverDescription(e.target.value)} placeholder="Descrição visual da capa..." rows={4} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold resize-none" />
                                    <button onClick={handleGenerateCoverPreview} disabled={isCoverPreviewing} className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-purple-200 transition-all flex items-center justify-center gap-3">
                                        {isCoverPreviewing ? <Loader2 className="animate-spin" /> : <Zap className="fill-current w-5 h-5" />} GERAR PRÉVIA
                                    </button>
                                    {coverImageData && <button onClick={() => setCurrentStep(2)} className="w-full py-4 bg-purple-600/20 text-purple-400 border border-purple-500/30 font-black rounded-2xl hover:bg-purple-600/30 transition-all">AVANÇAR PARA CONTEÚDO</button>}
                                </motion.div>
                            ) : (
                                <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 bg-white/5 p-8 rounded-3xl border border-white/10">
                                    <div className="flex justify-between items-center"><h2 className="text-xl font-black uppercase tracking-tighter">2. Projeto Editorial</h2><button onClick={() => setCurrentStep(1)} className="text-[10px] font-black text-gray-500 uppercase">Voltar</button></div>
                                    <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Cole o texto aqui..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white text-sm font-medium leading-relaxed min-h-[400px] resize-none" />
                                    <div className="flex justify-between items-center p-4 bg-purple-900/20 rounded-2xl">
                                        <div className="flex flex-col"><span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Investimento</span><span className="text-xl font-black">{requiredCredits} Créditos</span></div>
                                        <button onClick={handleCreateEbook} disabled={isLoading || !content || requiredCredits > userCredits} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black rounded-2xl">
                                            {isLoading ? <Loader2 className="animate-spin" /> : "GERAR EBOOK"}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="relative aspect-[2/3] bg-black/40 border border-white/10 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl">
                            {coverImageData ? (
                                <img id="cover-img-element" src={coverImageData} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                                <div className="text-center opacity-20"><Upload className="w-12 h-12 mx-auto mb-4" /><p className="font-black uppercase text-xs">Aguardando Design</p></div>
                            )}
                            {(isCoverPreviewing || isGeneratingCover || isLoading) && (
                                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-20">
                                    <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                                    <p className="font-black uppercase tracking-tighter animate-pulse italic">Processando...</p>
                                </div>
                            )}
                        </div>
                        {generatedEbook && <button onClick={downloadEbookPDF} className="w-full py-6 bg-white text-black font-black rounded-3xl flex items-center justify-center gap-3"><FileDown className="w-6 h-6" /> BAIXAR PDF FINAL</button>}
                    </div>
                </div>
            </div>
        </main>
    );
}
