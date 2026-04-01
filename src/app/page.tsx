'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Upload, Loader2, FileDown, BookOpen, ChevronLeft, CreditCard, LayoutDashboard, Palette, Type, MessageSquare, Download, CheckCircle2, RefreshCw, AlertCircle, Image as ImageIcon, Cpu } from 'lucide-react';
import jsPDF from 'jspdf';

const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;700;900&display=swap";

export default function Home() {
    const [title, setTitle] = useState('Título da Obra');
    const [subtitle, setSubtitle] = useState('');
    const [author, setAuthor] = useState('Autor');
    const [authorLogo, setAuthorLogo] = useState<string | null>(null);
    const [coverPrompt, setCoverPrompt] = useState('');
    const [fullContent, setFullContent] = useState('');
    const [activeTab, setActiveTab] = useState('config');
    const [isLoadingAntho, setIsLoadingAntho] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    type CoverCard = {
        id: number;
        status: 'idle' | 'loading' | 'success' | 'error';
        image: string | null;
        engine?: string;
        error?: string;
    };

    const [covers, setCovers] = useState<CoverCard[]>(
        Array.from({ length: 1 }, (_, i) => ({ id: i + 1, status: 'idle', image: null }))
    );
    const [selectedCoverIndex, setSelectedCoverIndex] = useState<number | null>(null);

    const [selectedPalette, setSelectedPalette] = useState('#A855F7');
    const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('dark');
    const [selectedFont, setSelectedFont] = useState('Montserrat');
    const [titleSize, setTitleSize] = useState(100);
    const [titleColor, setTitleColor] = useState('#ffffff');
    const [titleOpacity, setTitleOpacity] = useState(100);
    const [titleShadow, setTitleShadow] = useState(false);

    const [subtitleSize, setSubtitleSize] = useState(100);
    const [subtitleColor, setSubtitleColor] = useState('#e2e8f0');
    const [subtitleOpacity, setSubtitleOpacity] = useState(100);
    const [subtitleShadow, setSubtitleShadow] = useState(false);

    const [coverOverlayColor, setCoverOverlayColor] = useState('#000000');
    const [coverOverlayOpacity, setCoverOverlayOpacity] = useState(80);

    const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 0;
        const b = parseInt(hex.slice(5, 7), 16) || 0;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // --- ANTHOLOGY G27.1 ---
    type AnthologyPage = {
        type: string;
        title: string;
        subtitle: string;
        items?: string[];
        illustration_prompt: string;
        image?: string | null;
        status: 'idle' | 'loading' | 'success' | 'error';
    };

    const [blueprint, setBlueprint] = useState<{
        global_style: { primary_color: string; secondary_color: string; global_mood: string; };
        pages: AnthologyPage[];
    } | null>(null);

    const addLog = (msg: string) => {
        setDebugLogs(p => [...p.slice(-10), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    };

    const handleGenerateCover = async () => {
        if (!title) return alert("Título é obrigatório!");
        setActiveTab('gallery');
        setSelectedCoverIndex(null);
        setCovers([{ id: 1, status: 'loading', image: null }]);

        try {
            const style = { global_mood: 'Luxury', primary_color: '#ffffff' };
            const basePrompt = `${coverPrompt}
            --
            IMPORTANT RULES FOR THIS IMAGE: 
            1. DO NOT include any text, letters, or words at all.
            2. DO NOT make a mockup of a physical 3D book on a table. Provide ONLY the flat artwork directly.`;

            const updateCard = (id: number, patch: Partial<CoverCard>) => {
                setCovers(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
            };

            const generateOne = async (id: number, customPrompt: string) => {
                try {
                    addLog(`Iniciando OpenAI (Deep-Client)...`);
                    const keyRes = await fetch('/api/get-key');
                    const { key } = await keyRes.json();
                    if (!key) throw new Error("Chave não encontrada");

                    const oaiRes = await fetch('https://api.openai.com/v1/images/generations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                        body: JSON.stringify({ model: "dall-e-3", prompt: customPrompt, n: 1, size: "1024x1024", quality: "standard" })
                    });
                    if (!oaiRes.ok) {
                        const err = await oaiRes.json();
                        throw new Error(err.error?.message || "Erro na OpenAI");
                    }
                    const oaiData = await oaiRes.json();
                    const imageUrl = oaiData.data[0].url;

                    if (imageUrl) {
                        const proxyRes = await fetch('/api/proxy-image', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: imageUrl })
                        });
                        const proxyData = await proxyRes.json();
                        if (proxyData.base64) {
                            updateCard(id, { status: 'success', image: proxyData.base64, engine: 'OpenAI' });
                        }
                    }
                } catch (e: any) {
                    addLog(`Erro: ${e.message}`);
                    updateCard(id, { status: 'error', error: e.message });
                }
            };

            await generateOne(1, basePrompt);
            setSelectedCoverIndex(0);
        } catch (e: any) {
            addLog(`Erro: ${e.message}`);
        }
    };

    const handleArchitectContent = async () => {
        if (!fullContent) return alert("Cole o conteúdo do eBook primeiro!");
        setIsLoadingAntho(true);
        addLog(`Arquitetando Conteúdo com Gemini...`);

        try {
            const anthoRes = await fetch('/api/generate-anthology', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description: fullContent }),
            });
            if (!anthoRes.ok) throw new Error("Falha ao arquitetar o documento");
            const dataAntho = await anthoRes.json();
            setBlueprint(dataAntho);
            addLog(`Diagramação Concluída.`);
            setIsLoadingAntho(false);
            handleStartFullGeneration(dataAntho);
        } catch (e: any) {
            addLog(`Erro na Diagramação: ${e.message}`);
            setIsLoadingAntho(false);
        }
    };

    const A4Page = ({ page, index }: { page: AnthologyPage; index: number }) => {
        const isDark = selectedTheme === 'dark';
        const updatePage = (patch: Partial<AnthologyPage>) => {
            setBlueprint(prev => {
                if (!prev) return prev;
                const newPages = [...prev.pages];
                newPages[index] = { ...newPages[index], ...patch };
                return { ...prev, pages: newPages };
            });
        };

        return (
            <div
                className={`relative w-full aspect-[210/297] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] border border-white/5 rounded-[40px] mb-32 group transition-all hover:border-purple-500/20 ${isDark ? 'bg-[#050510] text-white' : 'bg-white text-black'}`}
                style={{ fontFamily: selectedFont }}
            >
                {page.image ? (
                    <img src={page.image} className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ${isDark ? 'opacity-10' : 'opacity-5'}`} />
                ) : (
                    <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-[#0c0c15] to-black' : 'bg-white'}`} />
                )}
                {page.image && (
                    <div className={`absolute inset-0 bg-gradient-to-b ${isDark ? 'from-black/80 via-black/40 to-black/90' : 'from-white/90 via-white/60 to-white/90'}`} />
                )}
                <div className="absolute inset-0 p-12 md:p-20 pb-20 md:pb-28 flex flex-col z-10">
                    <div className="space-y-6 mb-8">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black tracking-[6px] uppercase px-4 py-1 rounded-full border" style={{ color: selectedPalette, backgroundColor: `${selectedPalette}1A`, borderColor: `${selectedPalette}33` }}>Página {index + 1}</span>
                        </div>
                        {page.title && (
                            <h2 className={`w-full bg-transparent text-3xl md:text-4xl font-black tracking-tighter italic leading-tight outline-none border-none ${isDark ? 'text-white' : 'text-black'}`}>
                                {page.title}
                            </h2>
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden space-y-4">
                        {page.items && (
                            <div className="flex flex-col gap-4 w-full text-justify">
                                {page.items.map((item, i) => {
                                    const isSubtitle = item.length < 120 && !/[.?!]$/.test(item.trim()) && item.split(' ').length <= 15;
                                    return (
                                        <p key={i} className={`text-sm md:text-base leading-normal tracking-wide ${isSubtitle ? 'font-black mt-4 mb-2' : 'font-medium'} ${isDark ? (isSubtitle ? 'text-white' : 'text-white/80') : (isSubtitle ? 'text-black' : 'text-black/80')}`}>
                                            {item}
                                        </p>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                {page.status === 'loading' && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-20">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-[8px] text-white/40">Renderizando...</span>
                    </div>
                )}
            </div>
        );
    };

    const handleStartFullGeneration = async (currentBlueprintView?: any) => {
        const bp = currentBlueprintView || blueprint;
        if (!bp) return;
        addLog("Iniciando Geração de Ilustrações...");

        bp.pages.forEach(async (page: any, idx: number) => {
            if (page.type === 'cover') {
                const activeImg = selectedCoverIndex !== null ? covers[selectedCoverIndex].image : null;
                setBlueprint(prev => {
                    if (!prev) return prev;
                    const newPages = [...prev.pages];
                    newPages[idx] = { ...newPages[idx], status: 'success', image: activeImg };
                    return { ...prev, pages: newPages };
                });
                return;
            }

            setBlueprint(prev => {
                const newPages = [...(prev?.pages || [])];
                newPages[idx] = { ...newPages[idx], status: 'loading' };
                return { ...prev!, pages: newPages };
            });

            try {
                const res = await fetch('/api/generate-cover', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: page.illustration_prompt, title: page.title, model: 'auto' }),
                    signal: AbortSignal.timeout(15000)
                });
                const data = await res.json();

                if (data.ok && data.image) {
                    setBlueprint(prev => {
                        const newPages = [...(prev?.pages || [])];
                        newPages[idx] = { ...newPages[idx], status: 'success', image: data.image };
                        return { ...prev!, pages: newPages };
                    });
                } else {
                    throw new Error("Erro na API de imagem");
                }
            } catch (e) {
                addLog(`Erro Página ${idx + 1}`);
                setBlueprint(prev => {
                    const newPages = [...(prev?.pages || [])];
                    newPages[idx] = { ...newPages[idx], status: 'error' };
                    return { ...prev!, pages: newPages };
                });
            }
        });
    };

    const handleCreateEbook = () => {
        if (!blueprint) return;
        setActiveTab('export');
        addLog("Preparando Arquivo Final...");
    };

    const downloadPDF = async () => {
        if (!blueprint) return;
        setIsLoadingAntho(true);
        addLog("Capturando layouts WYSIWYG...");
        try {
            const { default: html2canvas } = await import('html2canvas-pro');
            const doc = new jsPDF({ format: 'a4', unit: 'mm' });

            for (let i = 0; i < blueprint.pages.length; i++) {
                const el = document.getElementById(`pdf-page-${i}`);
                if (el) {
                    const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false });
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    if (i > 0) doc.addPage();
                    doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
                }
            }
            doc.save(`${title.replace(/\s/g, '_')}.pdf`);
            addLog("PDF exportado com sucesso.");
        } catch (e: any) {
            addLog(`Erro ao gerar PDF: ${e.message}`);
            alert(`Erro ao exportar PDF: ${e.message}`);
        }
        setIsLoadingAntho(false);
    };

    return (
        <main className="min-h-screen bg-[#020205] text-[#eef2f7]">
            <style jsx global>{` @import url('${GOOGLE_FONTS_URL}'); body { background: #020205; font-family: 'Montserrat', sans-serif; overflow: hidden; } .text-gradient { background: linear-gradient(135deg, #fff 0%, #a855f7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; } ::-webkit-scrollbar { display: none; width: 0; background: transparent; } * { -ms-overflow-style: none; scrollbar-width: none; } `}</style>

            <div className="flex flex-col md:flex-row h-screen">
                <aside className="w-full md:w-80 lg:w-96 bg-[#050510] border-b md:border-b-0 md:border-r border-white/5 flex flex-row md:flex-col py-0 md:py-12 z-50 shrink-0 overflow-x-auto md:overflow-x-visible items-center md:items-stretch">
                    <div className="px-6 md:px-10 lg:px-12 my-6 md:my-0 mb-6 md:mb-20 flex items-center justify-center md:justify-start gap-4 shrink-0">
                        <img src="/logo.png" alt="LumiaBook" className="h-10 md:h-14 object-contain" />
                    </div>

                    <nav className="flex-1 flex flex-row md:flex-col px-4 md:px-10 lg:pl-12 lg:pr-16 space-x-2 md:space-x-0 md:space-y-4 shrink-0 md:shrink items-center md:items-stretch">
                        <TabButton icon={<Sparkles />} label="Capa" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
                        <TabButton icon={<Palette />} label="Design" active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} />
                        <TabButton icon={<Type />} label="Escrita" active={activeTab === 'editorial'} onClick={() => setActiveTab('editorial')} />
                        <TabButton icon={<Download />} label="Salvar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} disabled={!blueprint} />
                    </nav>
                </aside>

                <section className="flex-1 flex flex-col relative h-screen overflow-hidden">
                    <header className="h-24 border-b border-white/5 flex items-center justify-between px-16 bg-[#020205]/95 backdrop-blur-3xl sticky top-0 z-40">
                        <div className="flex items-center gap-3">
                        </div>
                        {blueprint && activeTab === 'editorial' && (
                            <button onClick={handleCreateEbook} className="bg-white text-black px-12 py-3 rounded-full text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all font-bold shadow-2xl">Visualizar Exportação</button>
                        )}
                    </header>

                    <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-24 h-full custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeTab === 'config' && (
                                <motion.div key="config" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-3xl pb-20">
                                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 md:mb-8 text-gradient italic leading-none text-white">Seu ebook pronto em poucos minutos</h1>
                                    <p className="text-white/30 mb-20 text-lg max-w-sm font-medium leading-relaxed uppercase tracking-widest">Defina a identidade visual e o propósito do seu eBook.</p>
                                    <div className="space-y-12">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Título da Obra</label>
                                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: O Futuro da IA" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none text-white" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Subtítulo (Opcional)</label>
                                                <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Ex: Guia Completo 2026" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none text-white" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Autor</label>
                                                <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Seu Nome" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none text-white" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Logo do Autor (Opcional - Apenas PNG)</label>
                                                <label className="cursor-pointer flex items-center justify-between w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 hover:bg-white/[0.05] transition-all">
                                                    <input type="file" accept="image/png" className="hidden" onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => setAuthorLogo(ev.target?.result as string);
                                                            reader.readAsDataURL(e.target.files[0]);
                                                        }
                                                    }} />
                                                    <span className="text-white/50 text-xl font-bold uppercase tracking-widest">{authorLogo ? 'Trocar Logo' : 'Anexar Logo'}</span>
                                                    {authorLogo ? <img src={authorLogo} className="h-8 w-auto object-contain" /> : <Upload className="w-6 h-6 text-white/30" />}
                                                </label>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Inspiração para a Capa</label>
                                            <textarea value={coverPrompt} onChange={e => setCoverPrompt(e.target.value)} placeholder="Ex: Uma cidade futurista flutuante com luzes neon azul e roxo, estilo digital painting..." rows={3} className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-xl font-medium focus:border-purple-500/50 transition-all outline-none resize-none text-white" />
                                        </div>
                                        <button onClick={handleGenerateCover} disabled={covers[0]?.status === 'loading'} className="group relative w-full py-10 bg-white text-black font-black uppercase tracking-[6px] rounded-[50px] hover:bg-white/90 transition-all flex items-center justify-center gap-6 shadow-2xl">
                                            {covers[0]?.status === 'loading' ? <Loader2 className="animate-spin w-10 h-10" /> : <Zap className="w-10 h-10 fill-current" />} GERAR ARTE DA CAPA
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'gallery' && (
                                <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col xl:flex-row h-full gap-6 xl:gap-10">
                                    <div className="flex-1 flex flex-col items-center justify-center py-10 xl:py-20 pb-20 xl:pb-40 overflow-y-auto">
                                        <div className="w-full max-w-md">
                                            {covers.map((c, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                                    className={`relative aspect-[1/1.4] rounded-[50px] overflow-hidden border-4 transition-all ${selectedCoverIndex === i ? 'border-purple-600 shadow-[0_40px_80px_-20px_rgba(168,85,247,0.4)]' : 'border-white/5 opacity-80 hover:opacity-100 hover:border-white/20'}`}
                                                    onClick={() => c.status === 'success' && setSelectedCoverIndex(i)}
                                                >
                                                    {c.status === 'loading' && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                                                            <div className="w-12 h-12 rounded-full border-t-2 border-blue-500 animate-spin"></div>
                                                            <span className="text-[10px] font-black uppercase tracking-[4px] text-white/20 italic">Criando Arte...</span>
                                                        </div>
                                                    )}
                                                    {c.status === 'success' && c.image && (
                                                        <div className="relative w-full h-full">
                                                            <img src={c.image} className="w-full h-full object-cover" />
                                                            {/* G32 Typography Overlay - Bottom Aligned */}
                                                            <div className="absolute inset-0 flex flex-col items-center justify-end py-16 px-6 text-center pointer-events-none" style={{ background: `linear-gradient(to top, ${hexToRgba(coverOverlayColor, coverOverlayOpacity / 100)} 0%, ${hexToRgba(coverOverlayColor, (coverOverlayOpacity / 100) * 0.5)} 50%, transparent 100%)` }}>
                                                                <div className="space-y-3">
                                                                    <h2 className="font-black leading-tight uppercase tracking-tighter" style={{ fontSize: `calc(clamp(1rem, 5vw, 2.5rem) * ${titleSize / 100})`, fontFamily: selectedFont, color: titleColor, opacity: titleOpacity / 100, textShadow: titleShadow ? '0px 4px 30px rgba(0,0,0,0.8)' : 'none' }}>{title}</h2>
                                                                    {subtitle && <p className="font-medium tracking-widest uppercase" style={{ fontSize: `calc(10px * ${subtitleSize / 100})`, color: subtitleColor, opacity: subtitleOpacity / 100, textShadow: subtitleShadow ? '0px 4px 20px rgba(0,0,0,0.8)' : 'none' }}>{subtitle}</p>}
                                                                    <div className="pt-6">
                                                                        <p className="text-white/40 font-bold tracking-[8px] text-[8px] uppercase">{author}</p>
                                                                    </div>
                                                                    {authorLogo && (
                                                                        <div className="pt-2 w-full flex justify-center">
                                                                            <img src={authorLogo} className="w-16 md:w-20 h-auto object-contain opacity-90" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}
                                            <button onClick={handleGenerateCover} className="mt-10 w-full flex justify-center items-center gap-6 text-white/30 hover:text-white transition-all font-black uppercase tracking-[8px] text-[10px] group"><RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" /> Tentar Nova Arte</button>
                                        </div>
                                    </div>

                                    {/* Sidebar de Design */}
                                    <div className="w-full xl:w-96 bg-white/[0.02] border-t xl:border-t-0 xl:border-l border-white/5 p-6 xl:p-12 space-y-8 xl:space-y-12 overflow-y-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20">Cor de Destaque</label>
                                            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5">
                                                <input type="color" value={selectedPalette} onChange={(e) => setSelectedPalette(e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-0 p-0" />
                                                <span className="text-white/80 text-sm font-bold tracking-widest uppercase">{selectedPalette}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20">Tema do Conteúdo</label>
                                            <div className="flex gap-4">
                                                <button onClick={() => setSelectedTheme('light')} className={`flex-1 py-4 rounded-2xl text-[10px] font-bold tracking-widest uppercase transition-all ${selectedTheme === 'light' ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>Light</button>
                                                <button onClick={() => setSelectedTheme('dark')} className={`flex-1 py-4 rounded-2xl text-[10px] font-bold tracking-widest uppercase transition-all ${selectedTheme === 'dark' ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>Dark</button>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20">Fonte do Texto</label>
                                            <div className="grid grid-cols-1 gap-4">
                                                {['Montserrat', 'Playfair Display', 'Roboto', 'Inter'].map(f => (
                                                    <button key={f} onClick={() => setSelectedFont(f)} className={`py-4 rounded-2xl text-[10px] font-bold tracking-widest uppercase transition-all text-left px-6 ${selectedFont === f ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`} style={{ fontFamily: f }}>{f}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20">Ajustes do Título</label>
                                            <div className="space-y-6 bg-white/5 p-6 rounded-3xl border border-white/5">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Tamanho ({titleSize}%)</span></div>
                                                    <input type="range" min="50" max="150" value={titleSize} onChange={e => setTitleSize(Number(e.target.value))} className="w-full accent-purple-500" />
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Cor principal</span>
                                                    <div className="flex items-center gap-3">
                                                        <input type="color" value={titleColor} onChange={e => setTitleColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0" />
                                                        <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">{titleColor}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Opacidade ({titleOpacity}%)</span></div>
                                                    <input type="range" min="0" max="100" value={titleOpacity} onChange={e => setTitleOpacity(Number(e.target.value))} className="w-full accent-purple-500" />
                                                </div>
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input type="checkbox" checked={titleShadow} onChange={e => setTitleShadow(e.target.checked)} className="w-5 h-5 accent-purple-500 rounded bg-black/50 border-white/20" />
                                                    <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Ativar Sombra (Drop Shadow)</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20">Ajustes do Subtítulo</label>
                                            <div className="space-y-6 bg-white/5 p-6 rounded-3xl border border-white/5">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Tamanho ({subtitleSize}%)</span></div>
                                                    <input type="range" min="50" max="150" value={subtitleSize} onChange={e => setSubtitleSize(Number(e.target.value))} className="w-full accent-purple-500" />
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Cor principal</span>
                                                    <div className="flex items-center gap-3">
                                                        <input type="color" value={subtitleColor} onChange={e => setSubtitleColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0" />
                                                        <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">{subtitleColor}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Opacidade ({subtitleOpacity}%)</span></div>
                                                    <input type="range" min="0" max="100" value={subtitleOpacity} onChange={e => setSubtitleOpacity(Number(e.target.value))} className="w-full accent-purple-500" />
                                                </div>
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input type="checkbox" checked={subtitleShadow} onChange={e => setSubtitleShadow(e.target.checked)} className="w-5 h-5 accent-purple-500 rounded bg-black/50 border-white/20" />
                                                    <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Ativar Sombra (Drop Shadow)</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20">Degradê da Capa</label>
                                            <div className="flex items-center gap-5 bg-white/5 p-4 rounded-3xl border border-white/5">
                                                <input type="color" value={coverOverlayColor} onChange={e => setCoverOverlayColor(e.target.value)} className="w-12 h-12 shrink-0 rounded-xl cursor-pointer bg-transparent border-0 p-0" />
                                                <div className="flex-1 flex flex-col gap-2">
                                                    <div className="flex justify-between items-center"><span className="text-white/80 text-[10px] font-bold tracking-widest uppercase">COR E OPACIDADE ({coverOverlayOpacity}%)</span></div>
                                                    <input type="range" min="0" max="100" value={coverOverlayOpacity} onChange={e => setCoverOverlayOpacity(Number(e.target.value))} className="w-full accent-purple-500" />
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setActiveTab('editorial')} className="w-full py-8 bg-purple-600 text-white font-black uppercase tracking-[4px] rounded-3xl hover:bg-purple-500 transition-all shadow-xl shadow-purple-900/20 text-[10px]">Ir para Escrita <ChevronLeft className="inline w-4 h-4 rotate-180" /></button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'editorial' && (
                                <motion.div key="editorial" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-8 md:gap-12 pb-20 md:pb-40">
                                    <div className="max-w-4xl w-full mb-8 md:mb-10">
                                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-gradient italic leading-none mb-4">Escrita.</h1>
                                        <p className="text-white/30 text-base md:text-lg font-medium tracking-wide leading-relaxed">Cole o conteúdo real do seu eBook abaixo. A IA irá diagramar as páginas automaticamente usando o design que você escolheu.</p>
                                    </div>

                                    {!blueprint ? (
                                        <div className="max-w-4xl w-full space-y-10">
                                            <textarea value={fullContent} onChange={e => setFullContent(e.target.value)} placeholder="Cole aqui o texto completo do seu eBook..." rows={15} className="w-full bg-white/[0.03] border border-white/10 rounded-[40px] p-12 text-xl font-medium focus:border-purple-500/50 transition-all outline-none resize-none text-white leading-relaxed" />
                                            <button onClick={handleArchitectContent} disabled={isLoadingAntho || !fullContent} className="group relative w-full py-10 bg-white text-black font-black uppercase tracking-[6px] rounded-[50px] hover:bg-white/90 transition-all flex items-center justify-center gap-6 shadow-2xl">
                                                {isLoadingAntho ? <Loader2 className="animate-spin w-10 h-10" /> : <Sparkles className="w-8 h-8" />} GERAR DIAGRAMAÇÃO PROFISSIONAL
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="max-w-4xl w-full space-y-20">
                                            <div className="flex justify-between items-center mb-10 bg-white/5 p-8 rounded-[30px] border border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <CheckCircle2 className="text-green-500 w-8 h-8" />
                                                    <span className="text-[10px] font-black uppercase tracking-[4px] text-white/40">Conteúdo Diagramado</span>
                                                </div>
                                                <button onClick={() => setBlueprint(null)} className="text-[10px] font-black uppercase tracking-[4px] text-white/20 hover:text-red-500 transition-colors">Reiniciar</button>
                                            </div>
                                            {blueprint.pages.map((p, i) => (
                                                <A4Page key={i} page={p} index={i} />
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'export' && (
                                <motion.div key="export" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 md:py-60 text-center space-y-12 md:space-y-16">
                                    <div className="w-24 h-24 md:w-40 md:h-40 bg-green-500/5 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(34,197,94,0.4)] border border-green-500/10"><CheckCircle2 className="w-12 h-12 md:w-20 md:h-20 text-green-500" /></div>
                                    <div className="space-y-4">
                                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic text-gradient leading-none">Pronto.</h1>
                                        <p className="text-white/20 text-lg md:text-xl font-medium tracking-[8px] md:tracking-[10px] uppercase mt-6 text-white">LumiaBook PDF</p>
                                    </div>
                                    <button onClick={downloadPDF} className="bg-white text-black px-12 md:px-16 py-6 md:py-8 rounded-[40px] font-black uppercase text-sm md:text-base flex items-center gap-6 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"><FileDown className="w-6 h-6 md:w-8 md:h-8" /> BAIXAR EBOOK</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </section>
            </div>

            {/* Hidden PDF Render Container guarantees 1:1 perfect WYSIWYG export */}
            {blueprint && (
                <div style={{ position: 'absolute', top: 0, left: 0, opacity: 0.01, pointerEvents: 'none', zIndex: -50 }}>
                    <div id="pdf-render-container" className="w-[794px]">
                        {blueprint.pages.map((page, idx) => {
                            const isDark = selectedTheme === 'dark';

                            // COVER PAGE
                            if (idx === 0) {
                                return (
                                    <div key={idx} id={`pdf-page-${idx}`} className="w-[794px] h-[1123px] relative bg-black overflow-hidden" style={{ fontFamily: selectedFont }}>
                                        {page.image && (
                                            <div className="relative w-full h-full">
                                                <img src={page.image} crossOrigin="anonymous" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex flex-col items-center justify-end py-16 px-6 text-center" style={{ background: `linear-gradient(to top, ${hexToRgba(coverOverlayColor, coverOverlayOpacity / 100)} 0%, ${hexToRgba(coverOverlayColor, (coverOverlayOpacity / 100) * 0.5)} 50%, transparent 100%)` }}>
                                                    <div className="space-y-4">
                                                        <h2 className="font-black leading-tight uppercase tracking-tighter" style={{ fontSize: `calc(3.5rem * ${titleSize / 100})`, color: titleColor, opacity: titleOpacity / 100, textShadow: titleShadow ? '0px 10px 50px rgba(0,0,0,0.8)' : 'none' }}>{title}</h2>
                                                        {subtitle && <p className="font-medium tracking-widest uppercase" style={{ fontSize: `calc(1.125rem * ${subtitleSize / 100})`, color: subtitleColor, opacity: subtitleOpacity / 100, textShadow: subtitleShadow ? '0px 10px 30px rgba(0,0,0,0.8)' : 'none' }}>{subtitle}</p>}
                                                        <div className="pt-10 pb-4">
                                                            <p className="text-white/40 font-bold tracking-[8px] text-xs uppercase">{author}</p>
                                                        </div>
                                                        {authorLogo && (
                                                            <div className="pt-2 w-full flex justify-center">
                                                                <img src={authorLogo} className="w-32 h-auto object-contain opacity-90" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // CONTENT PAGES
                            return (
                                <div key={idx} id={`pdf-page-${idx}`} className="w-[794px] h-[1123px] relative bg-black overflow-hidden border border-white/5" style={{ fontFamily: selectedFont }}>
                                    <div className={`w-full h-full ${isDark ? 'bg-[#050510] text-white' : 'bg-white text-black'}`}>
                                        {page.image ? (
                                            <img src={page.image} crossOrigin="anonymous" className={`absolute inset-0 w-full h-full object-cover ${isDark ? 'opacity-10' : 'opacity-5'}`} />
                                        ) : (
                                            <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-[#0c0c15] to-black' : 'bg-white'}`} />
                                        )}
                                        {page.image && (
                                            <div className={`absolute inset-0 bg-gradient-to-b ${isDark ? 'from-black/80 via-black/40 to-black/90' : 'from-white/90 via-white/60 to-white/90'}`} />
                                        )}
                                        <div className="absolute inset-0 px-[72px] pt-[72px] pb-[140px] flex flex-col z-10">
                                            <div className="space-y-6 mb-12">
                                                <div className="flex items-center gap-6">
                                                    <span className="text-sm font-black tracking-[8px] uppercase px-8 py-3 rounded-full border" style={{ color: selectedPalette, backgroundColor: `${selectedPalette}1A`, borderColor: `${selectedPalette}33` }}>Página {idx + 1}</span>
                                                </div>
                                                {page.title && (
                                                    <h2 className={`w-full bg-transparent text-[42px] font-black tracking-tighter italic leading-tight ${isDark ? 'text-white' : 'text-black'}`}>{page.title}</h2>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-8 text-justify">
                                                {page.items && (
                                                    <div className="flex flex-col gap-5 w-full">
                                                        {page.items.map((item, i) => {
                                                            const isSubtitle = item.length < 120 && !/[.?!]$/.test(item.trim()) && item.split(' ').length <= 15;
                                                            return (
                                                                <p key={i} className={`text-[19px] tracking-wide leading-[1.6] ${isSubtitle ? 'font-black text-[22px] mt-6 mb-2' : 'font-medium'} ${isDark ? (isSubtitle ? 'text-white' : 'text-white/90') : (isSubtitle ? 'text-black' : 'text-black/90')}`}>
                                                                    {item}
                                                                </p>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </main>
    );
}

function TabButton({ icon, label, active, onClick, disabled }: any) {
    return (
        <button disabled={disabled} onClick={onClick} className={`flex items-center gap-4 md:gap-10 py-4 px-6 md:py-10 md:px-14 rounded-2xl md:rounded-[50px] transition-all w-full text-left group overflow-hidden md:overflow-visible shrink-0 ${active ? 'bg-white/10 text-white shadow-xl md:shadow-[0_20px_40px_rgba(0,0,0,0.5)] md:translate-x-8 scale-100 md:scale-105' : 'text-white/40 md:text-gray-800 hover:text-white hover:bg-white/[0.08]'} ${disabled ? 'opacity-10' : ''}`}>
            <span className={`w-6 h-6 md:w-10 md:h-10 transition-all duration-700 flex items-center justify-center shrink-0 ${active ? 'text-blue-500 scale-110' : 'group-hover:text-blue-500/70 -rotate-12 group-hover:rotate-0'}`}>{icon}</span>
            <span className="hidden md:inline text-[14px] uppercase font-black tracking-[8px] leading-none">{label}</span>
        </button>
    );
}
