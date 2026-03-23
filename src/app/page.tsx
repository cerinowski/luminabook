'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Upload, Loader2, FileDown, BookOpen, ChevronLeft, CreditCard } from 'lucide-react';
import jsPDF from 'jspdf';

export default function Home() {
    const [content, setContent] = useState('');
    const [userCredits, setUserCredits] = useState(1000);
    const [requiredCredits, setRequiredCredits] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedEbook, setGeneratedEbook] = useState<any>(null);
    const [coverImageData, setCoverImageData] = useState<string | null>(null);
    const [isGeneratingCover, setIsGeneratingCover] = useState(false);
    const [isAiTextCover, setIsAiTextCover] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [showDebug, setShowDebug] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (content.trim().length === 0) {
            setRequiredCredits(0);
        } else {
            const calculated = Math.ceil(content.length / 500);
            setRequiredCredits(calculated);
        }
    }, [content]);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const addLog = (msg: string) => {
        setDebugLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleCreateEbook = async () => {
        if (!content || requiredCredits > userCredits || cooldown > 0) return;

        setIsLoading(true);
        setDebugLogs([]);
        addLog("Iniciando motor de criação ultra-resiliente...");
        addLog("Camada 1: Testando modelos Flash em cascata (0s delay)");

        try {
            const response = await fetch('/api/generate-ebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorDetail = data.details || data.error || 'Falha na geração';
                addLog(`INFO: ${errorDetail}`);

                if (errorDetail.includes("429") || errorDetail.includes("quota")) {
                    addLog("AVISO: Cota Google excedida. Tentando modo de resiliência local...");
                }

                // If it's a hard 500 but we have a fallback object, the above might not apply
                // But our new backend ALWAYS returns a 200 with is_fallback: true or a simplified object
            }

            if (data.is_fallback) {
                addLog("⚠️ MODO DE SEGURANÇA ATIVO: IA do Google indisponível.");
                addLog("Diagramação finalizada via Motor de Ressonância Local.");
            } else {
                addLog("Sucesso! Diagramação via IA de alta performance.");
            }

            setGeneratedEbook(data);
            setUserCredits(prev => prev - requiredCredits);

            // Inicia geração oficial da capa gráfica
            generateCoverPreview(data);
        } catch (error: any) {
            console.error('Error:', error);
            addLog(`ESTADO CRÍTICO: ${error.message}`);
            setShowDebug(true);
        } finally {
            setIsLoading(false);
        }
    };

    const generateCoverPreview = async (ebookData: any) => {
        setIsGeneratingCover(true);
        try {
            const theme = ebookData.visual_theme || {};
            const primary = theme.primary_color || '#1a1830';
            const secondary = theme.secondary_color || '#E93DE5';

            const coverPrompt = theme.image_generation_prompt || `A premium, professionally designed minimalist book cover. The title text is EXACTLY "${ebookData.title}". Beautiful elegant typography, high-end editorial graphic design. Visuals: abstract luxury elements, colors: ${primary} and ${secondary}. Masterpiece, 8k, award-winning book cover.`;

            console.log("Definindo Capa AI via HuggingFace (FLUX.1-schnell)...");

            // Usamos nosso próprio backend para buscar a imagem usando a Chave do HF (bypass CORS/WAF)
            const hfResponse = await fetch('/api/generate-cover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: coverPrompt })
            });

            if (hfResponse.ok) {
                const data = await hfResponse.json();
                if (data.base64) {
                    setCoverImageData(data.base64); // Sucesso garantido: Base64 nativa direto na img tag!
                } else {
                    console.error("HF Proxy não retornou o Base64.");
                    setCoverImageData(`https://picsum.photos/seed/${Math.floor(Math.random() * 1000)}/840/1188`);
                }
            } else {
                console.error("HF Proxy Falhou:", hfResponse.status);
                const errorData = await hfResponse.json().catch(() => ({}));
                console.error("Detalhes:", errorData);

                if (hfResponse.status === 403 || hfResponse.status === 401) {
                    alert('⚠️ AVISO: Seu Token do HuggingFace não tem permissão para usar as APIs de Inferência Gratuita! Por favor, crie um novo Access Token em huggingface.co/settings/tokens e marque a opção "Make calls to the Serverless Inference API".');
                } else if (hfResponse.status === 500 && JSON.stringify(errorData).includes('missing')) {
                    alert('⚠️ AVISO: A chave do HuggingFace não foi detectada. Se você acabou de salvar no .env.local, você precisa REINICIAR O SERVIDOR (derrubar o terminal e rodar npm run dev de novo).');
                } else if (hfResponse.status === 503) {
                    alert('⚠️ AVISO: A inteligência artificial do HuggingFace está aquecendo no momento. Tente novamente em 20 segundos.');
                }

                // Fallback fotográfico cego caso a HuggingFace falhe / exceda limites
                setCoverImageData(`https://picsum.photos/seed/${Math.floor(Math.random() * 1000)}/840/1188`);
            }

        } catch (err) {
            console.error('Falha geral na geração Visual da Capa:', err);
        } finally {
            setIsGeneratingCover(false);
        }
    };

    // (Função getBase64ImageFromUrl deletada, substituída por lógica nativa do Backend NodeJS)

    const downloadEbookPDF = async () => {
        if (!generatedEbook) return;

        setIsLoading(true);
        try {
            console.log('Initiating Masterpiece Editorial Studio...');
            const doc = new jsPDF();
            const theme = generatedEbook.visual_theme || {};
            const primary = theme.primary_color || '#1a1830';
            const secondary = theme.color_palette?.secondary || '#E93DE5'; // Use color_palette for secondary

            const margin = 28;
            const pageWidth = 210;
            const pageHeight = 297;
            const contentWidth = pageWidth - (margin * 2);
            const bodyLineHeight = 8;
            const paragraphSpacing = 4;

            const hexToRgb = (hex: string) => {
                const h = hex.replace('#', '');
                const r = parseInt(h.slice(0, 2), 16) || 0;
                const g = parseInt(h.slice(2, 4), 16) || 0;
                const b = parseInt(h.slice(4, 6), 16) || 0;
                return [r, g, b];
            };

            const [pr, pg, pb] = hexToRgb(primary);
            const [sr, sg, sb] = hexToRgb(secondary);

            doc.setFillColor(pr, pg, pb);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');

            try {
                if (coverImageData) {
                    // O PDF requere um Base64 estrito injetado nas entranhas ou buga na Vercel. 
                    // Vamos faturar ele na hora H do download usando a rede pública do usuário passando pelo proxy aberto "AllOrigins":
                    console.log("Criptografando Capa para o Motor PDF via AllOrigins...");

                    let pdfSafeBase64 = null;

                    // 1. Primeira tentativa: Extrair imagem JÁ CARREGADA da tela (Canvas) - 0 delay
                    const imgEl = document.getElementById('cover-img-element') as HTMLImageElement;
                    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = imgEl.naturalWidth;
                            canvas.height = imgEl.naturalHeight;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.drawImage(imgEl, 0, 0);
                                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                                if (dataUrl && dataUrl.length > 100) {
                                    pdfSafeBase64 = dataUrl;
                                    console.log("Capa extraída do Canvas da UI perfeitamente!");
                                }
                            }
                        } catch (e) {
                            console.warn("Canvas cross-origin taint, caindo para fetch...");
                        }
                    }

                    // 2. Segunda tentativa: Se o Canvas falhar, tenta buscar os dados
                    if (!pdfSafeBase64) {
                        if (coverImageData.startsWith('data:image')) {
                            pdfSafeBase64 = coverImageData;
                        } else {
                            const urlsToTry = [
                                coverImageData,
                                'https://corsproxy.io/?' + encodeURIComponent(coverImageData),
                                'https://api.allorigins.win/raw?url=' + encodeURIComponent(coverImageData)
                            ];

                            for (const fetchUrl of urlsToTry) {
                                try {
                                    console.log("Buscando imagem para PDF nativo via:", fetchUrl);
                                    const res = await fetch(fetchUrl);
                                    if (res.ok) {
                                        const blob = await res.blob();
                                        const bufferBase64 = await new Promise<string>((resolve, reject) => {
                                            const reader = new FileReader();
                                            reader.onloadend = () => resolve(reader.result as string);
                                            reader.onerror = reject;
                                            reader.readAsDataURL(blob);
                                        });

                                        // Forçar que seja interpretado como imagem
                                        if (bufferBase64) {
                                            if (bufferBase64.startsWith('data:image')) {
                                                pdfSafeBase64 = bufferBase64;
                                            } else if (bufferBase64.startsWith('data:application/octet-stream')) {
                                                pdfSafeBase64 = bufferBase64.replace('data:application/octet-stream', 'data:image/jpeg');
                                            }
                                        }

                                        if (pdfSafeBase64 && pdfSafeBase64.startsWith('data:image')) {
                                            break; // Sucesso real!
                                        }
                                    }
                                } catch (e) {
                                    console.warn("Falha na rota da imagem:", fetchUrl);
                                }
                            }
                        }
                    }

                    if (pdfSafeBase64 && pdfSafeBase64.startsWith('data:image')) {
                        const imgRatio = 840 / 1188;
                        const pageRatio = pageWidth / pageHeight;

                        let drawWidth = pageWidth;
                        let drawHeight = pageHeight;
                        let dx = 0;
                        let dy = 0;

                        if (imgRatio > pageRatio) {
                            drawHeight = pageHeight;
                            drawWidth = pageHeight * imgRatio;
                            dx = (pageWidth - drawWidth) / 2;
                        } else {
                            drawWidth = pageWidth;
                            drawHeight = pageWidth / imgRatio;
                            dy = (pageHeight - drawHeight) / 2;
                        }

                        doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
                        const imgFormat = pdfSafeBase64.toLowerCase().includes('image/png') ? 'PNG' : 'JPEG';
                        doc.addImage(pdfSafeBase64, imgFormat, dx, dy, drawWidth, drawHeight, undefined, 'FAST');

                        // Overlay preto para destaque da tipografia (igual na UI)
                        doc.setGState(new (doc as any).GState({ opacity: 0.45 }));
                        doc.setFillColor(0, 0, 0);
                        doc.rect(0, 0, pageWidth, pageHeight, 'F');

                        // Tipografia Super Nítida em Vetor na Capa do PDF
                        doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
                        doc.setTextColor(sr, sg, sb);
                        doc.setFont('helvetica', 'bold');

                        const coverTitleSize = generatedEbook.title.length > 40 ? 30 : 45;
                        doc.setFontSize(coverTitleSize);

                        const upperTitle = generatedEbook.title.toUpperCase();
                        const titleVectorLines = doc.splitTextToSize(upperTitle, pageWidth - 30);

                        // Renderiza do bottom para o top (igual justify-end no flex)
                        let titleY = pageHeight - 30 - ((titleVectorLines.length - 1) * (coverTitleSize * 0.45));
                        doc.text(titleVectorLines, 15, titleY);

                        console.log("Capa AI (Z-Image Turbo) Ancorada no PDF com Sucesso Extremo.");
                    } else {
                        console.warn("A ancoragem da imagem da Capa AI Falhou. Emitindo PDF cego (apenas com cores).");
                    }
                }
            } catch (e) {
                console.error('Motor jsPDF destruído subitamente:', e);
            }

            generatedEbook.chapters?.forEach((chapter: any, idx: number) => {
                doc.addPage();
                let curY = 50;

                doc.setDrawColor(sr, sg, sb); // Sync divider with secondary color
                doc.line(margin, 25, pageWidth - margin, 25);

                doc.setTextColor(sr, sg, sb); // Sync header text with secondary color
                doc.setFontSize(8);
                doc.text(generatedEbook.title.toUpperCase(), margin, 20);
                doc.text(`CAPÍTULO ${idx + 1}`, pageWidth - margin, 20, { align: 'right' });

                doc.setTextColor(pr, pg, pb); // Header color using primary
                doc.setFont('helvetica', 'bold');

                const cleanTitle = chapter.title.replace(/^[:\-\s]+/, '').trim();
                let chapterTitleSize = 32;
                if (cleanTitle.length > 30) chapterTitleSize = 24;
                if (cleanTitle.length > 60) chapterTitleSize = 18;
                doc.setFontSize(chapterTitleSize);

                const cTitleLines = doc.splitTextToSize(cleanTitle, contentWidth);

                doc.text(cTitleLines, margin, curY);
                curY += (cTitleLines.length * (chapterTitleSize * 0.45)) + 15;

                const paragraphs = (chapter.content || '').split('\n').filter((p: string) => p.trim());
                doc.setFontSize(11);
                doc.setTextColor(40, 40, 40); // Darker text for readability
                doc.setFont('helvetica', 'normal');

                paragraphs.forEach((para: string) => {
                    const lines = doc.splitTextToSize(para, contentWidth);
                    lines.forEach((line: string) => {
                        if (curY > 275) {
                            doc.addPage();
                            doc.setDrawColor(sr, sg, sb);
                            doc.line(margin, 25, pageWidth - margin, 25);
                            doc.setTextColor(sr, sg, sb);
                            doc.setFontSize(7);
                            doc.text(`... ${chapter.title.toUpperCase()}`, margin, 20);
                            curY = 35;
                            doc.setFontSize(11);
                            doc.setTextColor(40, 40, 40); // Reset body text color
                        }
                        doc.text(line, margin, curY);
                        curY += bodyLineHeight;
                    });
                    curY += paragraphSpacing;
                });

                const pNum = (doc as any).internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(sr, sg, sb); // Sync page number with secondary color
                doc.text(`— ${pNum} —`, pageWidth / 2, 288, { align: 'center' });
            });

            const safeFileName = (generatedEbook.title || 'ebook').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            doc.save(`${safeFileName}.pdf`);
            console.log('Premium PDF Studio Success.');
        } catch (error: any) {
            console.error('Critical Layout Error:', error);
            alert('Erro de diagramação. O conteúdo pode ser complexo demais.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col pt-20 pb-40 relative overflow-hidden">
            <nav className="fixed top-0 left-0 right-0 h-16 flex items-center justify-center px-6 studio-toolbar z-50">
                <div className="absolute left-6 flex items-center gap-2 text-sm font-medium text-white/50">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="bg-white/5 px-2 py-1 rounded-md text-white/80">LumiaBook Beta</span>
                </div>
                <div className="flex items-center">
                    <img src="/logo.png" alt="LumiaBook" className="h-10 transition-all hover:scale-105 cursor-pointer" />
                </div>
                <div className="absolute right-6 flex items-center gap-4">
                    <div className="flex flex-col items-end hidden md:flex">
                        <span className="text-[10px] text-white/40 uppercase font-black">Seus Créditos</span>
                        <span className="text-sm font-bold text-primary">{userCredits} ✨</span>
                    </div>
                </div>
            </nav>

            <AnimatePresence>
                {showDebug && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-32 left-1/2 -translate-x-1/2 w-full max-w-2xl z-[100] px-4"
                    >
                        <div className="bg-[#1a1830]/95 border border-primary/30 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                                <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Zap className="w-3 h-3" /> System Diagnostics
                                </h4>
                                <button onClick={() => setShowDebug(false)} className="text-white/30 hover:text-white text-[10px] font-bold">FECHAR</button>
                            </div>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar font-mono text-[11px]">
                                {debugLogs.map((log, i) => (
                                    <div key={i} className={`p-2 rounded ${log.includes('ERRO') || log.includes('FALHA') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-white/60'}`}>
                                        {log}
                                    </div>
                                ))}
                                {debugLogs.length === 0 && <div className="text-white/20 italic">Aguardando telemetria...</div>}
                            </div>
                            {isLoading && (
                                <div className="mt-4 flex items-center gap-3">
                                    <Loader2 className="w-3 h-3 text-primary animate-spin" />
                                    <span className="text-[10px] text-white/40 animate-pulse font-medium">IA está processando múltiplos modelos em cascata...</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {!generatedEbook ? (
                    <motion.section
                        key="input-section" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                        className="flex-1 flex flex-col items-center justify-center px-4 space-y-8 animate-in fade-in duration-1000 relative z-10"
                    >
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-2">
                                <Sparkles className="w-3 h-3 text-primary" />
                                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Next-Gen Publishing</span>
                            </div>
                            <h1 className="text-5xl md:text-[84px] font-extrabold tracking-tighter text-center leading-[0.95] max-w-4xl pb-4 text-white">
                                Crie eBooks completos <br /> com <span className="text-gradient">IA em minutos.</span>
                            </h1>
                            <p className="text-white/50 text-xl md:text-2xl font-medium max-w-2xl tracking-tight">Estrutura, escreve e entrega seu ebook pronto.</p>
                        </div>
                    </motion.section>
                ) : (
                    <motion.section
                        key="result-section" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                        className="flex-1 flex flex-col items-center px-4 pt-12 space-y-8 relative z-10 overflow-y-auto"
                    >
                        <div className="max-w-6xl w-full tech-balloon p-8 md:p-12 space-y-10">
                            <div className="flex items-center justify-between border-b border-white/5 pb-8">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-4xl font-black text-white tracking-tighter">{generatedEbook.title}</h2>
                                        {generatedEbook.is_fallback && (
                                            <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-[10px] font-black rounded border border-amber-500/30 animate-pulse">MODO DE SEGURANÇA</span>
                                        )}
                                    </div>
                                    <p className="text-white/40 text-sm font-medium">Layout único gerado especialmente para este conteúdo.</p>
                                </div>
                                <button onClick={() => { setGeneratedEbook(null); setCoverImageData(null); }} className="h-12 px-6 rounded-xl flex items-center gap-2 text-white/60 hover:text-white transition-all bg-white/5 hover:bg-white/10">
                                    <ChevronLeft className="w-4 h-4" /> Novo Projeto
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                <div className="lg:col-span-5 flex justify-center perspective-1000">
                                    <motion.div initial={{ rotateY: 30 }} animate={{ rotateY: -10 }} whileHover={{ rotateY: -20, rotateX: 5 }} className="relative group transition-all duration-700 ease-out" style={{ transformStyle: 'preserve-3d' }}>
                                        <div className="w-[300px] md:w-[380px] aspect-[1/1.4] rounded-r-lg shadow-[25px_25px_50px_rgba(0,0,0,0.6)] relative overflow-hidden border border-white/10" style={{ backgroundColor: generatedEbook.visual_theme?.primary_color || '#1a1830' }}>
                                            {coverImageData ? (
                                                <img
                                                    id="cover-img-element"
                                                    src={coverImageData}
                                                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-100"
                                                    alt="Book Cover"
                                                    onError={(e) => {
                                                        console.warn("Imagem original falhou na UI.");
                                                    }}
                                                />
                                            ) : isGeneratingCover ? (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-black/40 backdrop-blur-sm z-20">
                                                    <Loader2 className="w-8 h-8 text-white/50 animate-spin mb-4" />
                                                    <span className="text-[10px] font-black tracking-widest text-[#E93DE5] uppercase text-center animate-pulse">
                                                        PINTANDO A ARTE 8K (POLLINATIONS)...
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </motion.div>
                                </div>

                                <div className="lg:col-span-7 space-y-8">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Estilo Sugerido</p>
                                            <p className="text-lg font-bold text-white uppercase">{generatedEbook.visual_theme?.design_mood || 'Professional'}</p>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Design Status</p>
                                            <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                                <Zap className="w-3 h-3" /> 100% IA GENERATIVA
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={downloadEbookPDF} className="w-full bg-gradient-to-r from-[#E93DE5] to-[#5B33F5] text-white py-6 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all">
                                        <FileDown className="w-6 h-6" /> Baixar PDF Customizado
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            {!generatedEbook && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-50">
                    <div className="tech-balloon p-3 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-2xl">
                        <div className="flex-1 flex items-center studio-input-container px-5 py-2 group">
                            <Upload className="w-5 h-5 text-white/20 mr-4" />
                            <textarea
                                value={content} onChange={(e) => setContent(e.target.value)} disabled={isLoading}
                                placeholder="Cole o conteúdo completo do seu eBook aqui..."
                                className="bg-transparent border-none outline-none w-full text-lg text-white placeholder:text-white/20 py-3 min-h-[120px] resize-none custom-scrollbar"
                            />
                        </div>
                        <button
                            onClick={handleCreateEbook}
                            disabled={content.length === 0 || isLoading || cooldown > 0}
                            className="px-10 py-5 rounded-2xl bg-gradient-to-r from-[#E93DE5] to-[#5B33F5] text-white font-black uppercase tracking-widest hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                            ) : cooldown > 0 ? (
                                `Aguarde ${cooldown}s`
                            ) : (
                                "Criar eBook"
                            )}
                        </button>
                    </div>
                </div>
            )}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full" />
            </div>
        </main>
    );
}
