'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Upload, Loader2, FileDown, BookOpen, ChevronLeft, CreditCard } from 'lucide-react';
import jsPDF from 'jspdf';

// Fontes de Luxo para o motor de tipografia
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;700;900&display=swap";

// --- MOTOR DE TIPOGRAFIA LUMINA v6.0 (ULTIMATE RESILIENCE & GRADIENT FALLBACK) ---
async function generateTypographyLayer(bgUrl: string, config: any): Promise<string> {
    return new Promise(async (resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(bgUrl);

        const pr = config.primary || '#0a0a0f';
        const sr = config.secondary || '#E93DE5';

        // Estabilizamos a URL via Proxy Interno
        let finalUrl = bgUrl;
        if (!bgUrl.startsWith('data:') && !bgUrl.startsWith('blob:')) {
            finalUrl = `/api/proxy-image?url=${encodeURIComponent(bgUrl)}`;
        }

        const renderMasterpiece = (imgObj: HTMLImageElement | null) => {
            // 1. FUNDO: Imagem ou Degradê Premium de Fallback
            if (imgObj) {
                ctx.drawImage(imgObj, 0, 0, 800, 1200);
            } else {
                const bgGrad = ctx.createLinearGradient(0, 0, 800, 1200);
                bgGrad.addColorStop(0, pr);
                bgGrad.addColorStop(1, '#000000');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, 800, 1200);

                // Texture noise simples se for fallback
                for (let i = 0; i < 5000; i++) {
                    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.02})`;
                    ctx.fillRect(Math.random() * 800, Math.random() * 1200, 1, 1);
                }
            }

            // 2. CAMADA EDITORIAL (Contraste Cinematográfico)
            const vignette = ctx.createLinearGradient(0, 0, 0, 1200);
            vignette.addColorStop(0, 'rgba(0,0,0,0.8)');
            vignette.addColorStop(0.3, 'rgba(0,0,0,0.2)');
            vignette.addColorStop(0.7, 'rgba(0,0,0,0.2)');
            vignette.addColorStop(1, 'rgba(0,0,0,0.9)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, 800, 1200);

            // Moldura Editorial High-Contrast v6.0
            ctx.globalAlpha = 0.75;
            ctx.fillStyle = '#111111';
            ctx.fillRect(65, 300, 670, 580); // Design vertical centrado
            ctx.globalAlpha = 1.0;

            // Accent Borders (Double Cinema)
            ctx.strokeStyle = sr;
            ctx.lineWidth = 1;
            ctx.strokeRect(85, 320, 630, 540);
            ctx.strokeRect(90, 325, 620, 530);

            // 3. MOTOR DE TIPOGRAFIA (Multi-Line Focus)
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,1)';
            ctx.shadowBlur = 35;
            ctx.fillStyle = '#FFFFFF';

            const title = (config.title || 'LUMINA').toUpperCase();
            let fontSize = 72;
            if (title.length > 20) fontSize = 52;
            if (title.length > 40) fontSize = 38;
            if (title.length > 70) fontSize = 30;

            ctx.font = `900 ${fontSize}px 'Montserrat', sans-serif`;

            const words = title.split(' ');
            const lines = [];
            let currentLine = '';
            const maxWidth = 560;

            for (let n = 0; n < words.length; n++) {
                const testLine = currentLine + words[n] + ' ';
                if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                    lines.push(currentLine);
                    currentLine = words[n] + ' ';
                } else {
                    currentLine = testLine;
                }
            }
            lines.push(currentLine);

            const totalHeight = lines.length * fontSize * 1.1;
            let startY = 560 - (totalHeight / 2) + (fontSize / 2); // Centralização precisa

            lines.forEach((l, i) => {
                ctx.fillText(l.trim(), 400, startY + (i * fontSize * 1.1));
            });

            // 4. SUBTÍTULO (Sincronizado)
            const lastY = startY + (lines.length * fontSize * 1.1);
            ctx.shadowBlur = 5;
            ctx.font = `700 20px 'Montserrat', sans-serif`;
            const subtitle = (config.subtitle || 'MASTERPIECE EDITORIAL').toUpperCase();
            ctx.fillText(subtitle, 400, Math.min(lastY + 30, 860));

            // 5. NOME DO AUTOR (Branding Sólido)
            ctx.fillStyle = pr;
            ctx.fillRect(0, 1100, 800, 100);

            ctx.font = `700 16px 'Montserrat', sans-serif`;
            ctx.fillStyle = '#FFFFFF';
            ctx.letterSpacing = "8px";
            ctx.fillText(config.author || 'LUMINA STUDIOS', 400, 1150);

            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = finalUrl;

        img.onload = () => renderMasterpiece(img);
        img.onerror = () => {
            console.warn("[v6.0] Background art fail, using Gradient Fallback.");
            renderMasterpiece(null);
        };

        // Segurança máxima de 10s para o carregamento do Canvas
        setTimeout(() => {
            if (canvas.toDataURL().length < 1000) renderMasterpiece(null);
        }, 8000);
    });
}

export default function Home() {
    const [content, setContent] = useState('');
    const [userCredits, setUserCredits] = useState(1000);
    const [requiredCredits, setRequiredCredits] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedEbook, setGeneratedEbook] = useState<any>(null);
    const [coverImageData, setCoverImageData] = useState<string | null>(null);
    const [isGeneratingCover, setIsGeneratingCover] = useState(false);
    const [chapterImages, setChapterImages] = useState<string[]>([]);
    const [isGeneratingChapters, setIsGeneratingChapters] = useState(false);

    useEffect(() => {
        setRequiredCredits(content.trim().length === 0 ? 0 : Math.ceil(content.length / 500));
    }, [content]);

    const handleCreateEbook = async () => {
        if (!content || requiredCredits > userCredits) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/generate-ebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            const data = await res.json();
            setGeneratedEbook(data);
            setUserCredits(prev => prev - requiredCredits);
            generateCoverPreview(data);
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    const generateCoverPreview = async (ebookData: any) => {
        setIsGeneratingCover(true);
        try {
            const theme = ebookData.visual_theme || {};
            const primary = theme.primary_color || '#0a0a0f';
            const secondary = theme.secondary_color || '#E93DE5';

            const finalTitle = ebookData.title || "OBRA PRIMA";
            const artUrl = `https://pollinations.ai/p/${encodeURIComponent(ebookData.visual_theme?.image_generation_prompt || 'Abstract art')}. NO TEXT. 8K?width=800&height=1200&model=flux`;

            const firstPass = await generateTypographyLayer(artUrl, {
                title: finalTitle,
                subtitle: ebookData.subtitle || "Premium Editorial Studio",
                author: ebookData.author_name || "Lumina AI",
                primary: primary,
                secondary: secondary
            });
            setCoverImageData(firstPass);
            setIsGeneratingCover(false);

            // Refinamento via HF se disponível
            fetch('/api/generate-cover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: `FLAT FRONT VIEW. ${ebookData.visual_theme?.image_generation_prompt}. NO TEXT.` })
            }).then(async (res) => {
                if (res.ok) {
                    const data = await res.json();
                    if (data.base64) {
                        const secondPass = await generateTypographyLayer(data.base64, {
                            title: finalTitle,
                            subtitle: ebookData.subtitle || "Premium Editorial Studio",
                            author: ebookData.author_name || "Lumina AI",
                            primary: primary,
                            secondary: secondary
                        });
                        setCoverImageData(secondPass);
                    }
                }
            });

            if (ebookData.chapters) {
                setChapterImages(ebookData.chapters.slice(0, 5).map((c: any) =>
                    `https://pollinations.ai/p/${encodeURIComponent(c.chapter_image_prompt || 'Art')}. NO TEXT. 8K?width=800&height=600&model=flux`
                ));
            }
        } catch (err) { setIsGeneratingCover(false); }
    };

    const downloadEbookPDF = async () => {
        if (!generatedEbook) return;
        setIsLoading(true);
        try {
            const doc = new jsPDF();
            const primary = generatedEbook.visual_theme?.primary_color || '#0a0a0f';
            if (coverImageData) doc.addImage(coverImageData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

            (generatedEbook.chapters || []).forEach((ch: any, i: number) => {
                doc.addPage();
                doc.setFontSize(32);
                doc.setTextColor(primary);
                const titleLines = doc.splitTextToSize(ch.title.toUpperCase(), 170);
                doc.text(titleLines, 105, 100, { align: 'center' });
                doc.addPage();
                doc.setFontSize(11);
                doc.setTextColor(40, 40, 40);
                const lines = doc.splitTextToSize(ch.content || '', 154);
                doc.text(lines, 28, 40);
            });
            doc.save('ebook_lumina_v6.pdf');
        } catch (e) { alert('Falha no PDF'); } finally { setIsLoading(false); }
    };

    return (
        <main className="min-h-screen flex flex-col pt-12 pb-40 bg-[#050508] text-white overflow-hidden relative">
            <style jsx global>{`
                @import url('${GOOGLE_FONTS_URL}');
                body { font-family: 'Montserrat', sans-serif; }
                .glass-card { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); backdrop-filter: blur(50px); border-radius: 3rem; }
                .text-gradient { background: linear-gradient(to right, #E93DE5, #5B33F5); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            `}</style>

            <nav className="fixed top-0 left-0 right-0 h-20 flex items-center justify-between px-12 z-50 border-b border-white/5 bg-[#050508]/80 backdrop-blur-md">
                <span className="text-[10px] font-black tracking-[0.5em] text-white/40">LUMINABOOK MASTERPIECE v6.0</span>
                <span className="px-4 py-2 bg-white/5 rounded-full text-sm font-bold border border-white/10 text-primary">{userCredits} ✨</span>
            </nav>

            <AnimatePresence mode="wait">
                {!generatedEbook ? (
                    <motion.div key="in" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-5xl mx-auto">
                        <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.85] mb-8">
                            ARTE. TEXTO. <br /><span className="text-gradient">PERFEIÇÃO.</span>
                        </h1>
                        <p className="text-white/30 text-2xl font-medium">Motor de Diagramação Editorial Ultra-Resiliente.</p>
                    </motion.div>
                ) : (
                    <motion.div key="out" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="flex-1 p-8 max-w-6xl mx-auto w-full">
                        <div className="glass-card p-12 grid grid-cols-1 md:grid-cols-2 gap-16">
                            <motion.div animate={{ rotateY: -12 }} className="aspect-[1/1.4] rounded-xl overflow-hidden shadow-[40px_40px_80px_rgba(0,0,0,0.9)] border border-white/10 relative">
                                {coverImageData ? <img src={coverImageData} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center space-y-4"><Loader2 className="animate-spin text-primary" /><span className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-30">Renderizando Masterpiece...</span></div>}
                            </motion.div>
                            <div className="flex flex-col justify-center space-y-12">
                                <div className="space-y-4">
                                    <h2 className="text-5xl font-black tracking-tight leading-tight">{generatedEbook.title}</h2>
                                    <p className="text-white/40 font-bold text-xs tracking-[0.3em] uppercase">{generatedEbook.subtitle || 'Premium Editorial Edition'}</p>
                                </div>
                                <div className="space-y-4">
                                    <button onClick={downloadEbookPDF} className="w-full bg-gradient-to-r from-[#E93DE5] to-[#5B33F5] py-8 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-[0_30px_60px_rgba(233,61,229,0.3)] hover:scale-[1.03] transition-all">Baixar Obra Completa</button>
                                    <button onClick={() => setGeneratedEbook(null)} className="w-full text-white/20 hover:text-white transition-all text-xs font-black uppercase tracking-widest pt-2">Novo Projeto</button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!generatedEbook && (
                <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-50">
                    <div className="glass-card p-6 flex flex-col md:flex-row gap-6 shadow-4xl">
                        <textarea
                            value={content} onChange={(e) => setContent(e.target.value)}
                            placeholder="Descreva seu ebook ou cole manuscritos..."
                            className="bg-transparent flex-1 outline-none p-4 min-h-[140px] text-xl font-medium custom-scrollbar placeholder:opacity-20"
                        />
                        <button onClick={handleCreateEbook} disabled={isLoading || !content} className="px-16 rounded-[1.5rem] bg-white text-black font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all disabled:opacity-30">
                            {isLoading ? <Loader2 className="animate-spin" /> : "Publicar"}
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
