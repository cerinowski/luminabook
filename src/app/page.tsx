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

    const [selectedPalette, setSelectedPalette] = useState('Luxury');
    const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('dark');
    const [selectedFont, setSelectedFont] = useState('Montserrat');

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
            const basePrompt = `Professional A4 Digital Illustration for an eBook cover: ${coverPrompt}. 
            STRICT RULES: 
            1. NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS. 
            2. FLAT 2D STYLE, NO 3D MOCKUPS, NO PHYSICAL BOOKS. 
            3. CINEMATIC LIGHTING, HIGH CONTRAST, 8K.`;

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
                    <img src={page.image} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0c0c15] to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
                <div className="absolute inset-0 p-12 md:p-20 flex flex-col justify-between z-10">
                    <div className="space-y-8">
                        <div className="flex items-center gap-4">
                            <span className="text-purple-500 text-[10px] font-black tracking-[6px] uppercase px-4 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">Seção {index + 1}</span>
                            <span className="text-white/20 text-[9px] font-bold uppercase tracking-[4px]">{page.type}</span>
                        </div>
                        <input value={page.title} onChange={(e) => updatePage({ title: e.target.value })} className={`w-full bg-transparent text-6xl md:text-7xl font-black tracking-tighter italic leading-[0.9] outline-none border-b border-transparent focus:border-purple-500/30 transition-all placeholder:text-white/10 ${isDark ? 'text-white' : 'text-black'}`} placeholder="Título da Seção" />
                        <textarea value={page.subtitle} onChange={(e) => updatePage({ subtitle: e.target.value })} className={`w-full bg-transparent text-xl font-medium tracking-wide leading-relaxed outline-none resize-none border-l-2 border-transparent focus:border-purple-500/30 pl-4 transition-all placeholder:text-white/5 ${isDark ? 'text-white/50' : 'text-black/60'}`} placeholder="Descreva o conteúdo desta seção..." rows={3} />
                    </div>
                    <div className="space-y-6">
                        {page.items && (
                            <div className="grid grid-cols-1 gap-4 max-w-xl">
                                {page.items.map((item, i) => (
                                    <div key={i} className={`flex items-center gap-5 backdrop-blur-xl p-5 rounded-2xl border border-white/5 group/item transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 group-hover/item:scale-150 transition-transform" />
                                        <input value={item} onChange={(e) => {
                                            const newItems = [...(page.items || [])];
                                            newItems[i] = e.target.value;
                                            updatePage({ items: newItems });
                                        }} className={`bg-transparent font-bold tracking-tight outline-none w-full ${isDark ? 'text-white/80' : 'text-black/80'}`} />
                                    </div>
                                ))}
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
                }
            } catch (e) {
                addLog(`Erro Página ${idx + 1}`);
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
        const doc = new jsPDF();
        blueprint.pages.forEach((page, i) => {
            if (page.image) {
                const imageType = page.image.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                doc.addImage(page.image, imageType, 0, 0, 210, 297, undefined, 'FAST');

                if (i === 0) { // CAPA G31
                    // Overlay superior
                    doc.setFillColor(0, 0, 0);
                    doc.setGState(new (doc as any).GState({ opacity: 0.6 }));
                    doc.rect(0, 0, 210, 80, 'F');

                    doc.setGState(new (doc as any).GState({ opacity: 1 }));
                    doc.setTextColor(255, 255, 255);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(36);
                    const titleLines = doc.splitTextToSize(title.toUpperCase(), 170);
                    doc.text(titleLines, 105, 40, { align: 'center' });

                    if (subtitle) {
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(16);
                        const subLines = doc.splitTextToSize(subtitle.toUpperCase(), 170);
                        doc.text(subLines, 105, 65, { align: 'center' });
                    }

                    // Overlay inferior (Autor)
                    doc.setGState(new (doc as any).GState({ opacity: 0.6 }));
                    doc.rect(0, 260, 210, 37, 'F');
                    doc.setGState(new (doc as any).GState({ opacity: 1 }));
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(12);
                    doc.text(author.toUpperCase(), 105, 280, { align: 'center' });
                } else if (page.type !== 'cover') {
                    doc.setTextColor(selectedTheme === 'dark' ? 255 : 0, selectedTheme === 'dark' ? 255 : 0, selectedTheme === 'dark' ? 255 : 0);
                    doc.setFont("helvetica", "bold"); doc.setFontSize(28);
                    doc.text(page.title.toUpperCase(), 20, 50);
                    doc.setFont("helvetica", "normal"); doc.setFontSize(14);
                    if (page.subtitle) {
                        const splitText = doc.splitTextToSize(page.subtitle, 170);
                        doc.text(splitText, 20, 70);
                    }
                }
                if (i < blueprint.pages.length - 1) doc.addPage();
            }
        });
        doc.save(`${title.replace(/\s/g, '_')}.pdf`);
        setIsLoadingAntho(false);
    };

    return (
        <main className="min-h-screen bg-[#020205] text-[#eef2f7]">
            <style jsx global>{` @import url('${GOOGLE_FONTS_URL}'); body { background: #020205; font-family: 'Montserrat', sans-serif; overflow: hidden; } .text-gradient { background: linear-gradient(135deg, #fff 0%, #a855f7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; } `}</style>

            <div className="flex h-screen">
                <aside className="w-20 md:w-80 bg-[#050510] border-r border-white/5 flex flex-col py-12 z-50">
                    <div className="px-10 mb-20 flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/30"><Sparkles className="w-7 h-7 text-white" /></div>
                        <span className="hidden md:inline font-black text-3xl italic tracking-tighter text-white">LUMINA</span>
                    </div>

                    <nav className="flex-1 px-8 space-y-4">
                        <TabButton icon={<Sparkles />} label="Capa" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
                        <TabButton icon={<Palette />} label="Design" active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} />
                        <TabButton icon={<Type />} label="Escrita" active={activeTab === 'editorial'} onClick={() => setActiveTab('editorial')} />
                        <TabButton icon={<Download />} label="Salvar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} disabled={!blueprint} />
                    </nav>
                </aside>

                <section className="flex-1 flex flex-col relative h-screen overflow-hidden">
                    <header className="h-24 border-b border-white/5 flex items-center justify-between px-16 bg-[#020205]/95 backdrop-blur-3xl sticky top-0 z-40">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
                            <span className="text-[10px] font-black uppercase tracking-[8px] text-white/30 italic">LuminaBook Engine v2.0 // Active</span>
                        </div>
                        {blueprint && activeTab === 'editorial' && (
                            <button onClick={handleCreateEbook} className="bg-white text-black px-12 py-3 rounded-full text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all font-bold shadow-2xl">Visualizar Exportação</button>
                        )}
                    </header>

                    <div className="flex-1 overflow-y-auto p-12 md:p-24 h-full custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeTab === 'config' && (
                                <motion.div key="config" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-3xl pb-20">
                                    <h1 className="text-8xl font-black tracking-tighter mb-8 text-gradient italic leading-none text-white">Sua Obra.</h1>
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
                                <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full gap-10">
                                    <div className="flex-1 flex flex-col items-center justify-center py-20 pb-40 overflow-y-auto">
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
                                                            {/* G31 Typography Overlay */}
                                                            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 flex flex-col items-center justify-between py-12 px-6 text-center pointer-events-none">
                                                                <div className="mt-8 space-y-2">
                                                                    <h2 className="text-white font-black leading-tight uppercase tracking-tighter" style={{ fontSize: 'clamp(1rem, 5vw, 2.5rem)', fontFamily: selectedFont }}>{title}</h2>
                                                                    {subtitle && <p className="text-white/80 font-medium tracking-widest text-[10px] uppercase">{subtitle}</p>}
                                                                </div>
                                                                <div className="mb-4">
                                                                    <p className="text-white/40 font-bold tracking-[8px] text-[8px] uppercase">{author}</p>
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
                                    <div className="w-96 bg-white/[0.02] border-l border-white/5 p-12 space-y-12 overflow-y-auto">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20">Paleta de Cores</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                {['Luxury', 'Cyber', 'Minimal', 'Nature'].map(p => (
                                                    <button key={p} onClick={() => setSelectedPalette(p)} className={`py-4 rounded-2xl text-[10px] font-bold tracking-widest uppercase transition-all ${selectedPalette === p ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>{p}</button>
                                                ))}
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
                                        <button onClick={() => setActiveTab('editorial')} className="w-full py-8 bg-purple-600 text-white font-black uppercase tracking-[4px] rounded-3xl hover:bg-purple-500 transition-all shadow-xl shadow-purple-900/20 text-[10px]">Ir para Escrita <ChevronLeft className="inline w-4 h-4 rotate-180" /></button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'editorial' && (
                                <motion.div key="editorial" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-12 pb-40">
                                    <div className="max-w-4xl w-full mb-10">
                                        <h1 className="text-7xl font-black tracking-tighter text-gradient italic leading-none mb-4">Escrita.</h1>
                                        <p className="text-white/30 text-lg font-medium tracking-wide leading-relaxed">Cole o conteúdo real do seu eBook abaixo. A IA irá diagramar as páginas automaticamente usando o design que você escolheu.</p>
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
                                <motion.div key="export" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-60 text-center space-y-24">
                                    <div className="w-60 h-60 bg-green-500/5 rounded-full flex items-center justify-center shadow-[0_0_150px_rgba(34,197,94,0.4)] border border-green-500/10"><CheckCircle2 className="w-32 h-32 text-green-500" /></div>
                                    <div className="space-y-6">
                                        <h1 className="text-9xl font-black tracking-tighter italic text-gradient leading-none">Pronto.</h1>
                                        <p className="text-white/20 text-3xl font-medium tracking-[15px] uppercase mt-10 text-white">LuminaBook Professional PDF</p>
                                    </div>
                                    <button onClick={downloadPDF} className="bg-white text-black px-24 py-10 rounded-[50px] font-black uppercase text-xl flex items-center gap-8 hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-white/5"><FileDown className="w-10 h-10" /> BAIXAR EBOOK PDF</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </section>
            </div>
        </main>
    );
}

function TabButton({ icon, label, active, onClick, disabled }: any) {
    return (
        <button disabled={disabled} onClick={onClick} className={`flex items-center gap-10 py-10 px-14 rounded-[50px] transition-all w-full text-left group ${active ? 'bg-white/10 text-white shadow-[0_20px_40px_rgba(0,0,0,0.5)] translate-x-8 scale-105' : 'text-gray-800 hover:text-white hover:bg-white/[0.08]'} ${disabled ? 'opacity-10' : ''}`}>
            <span className={`w-10 h-10 transition-all duration-700 ${active ? 'text-blue-500 rotate-0 scale-110' : 'group-hover:text-blue-500/70 -rotate-12 group-hover:rotate-0'}`}>{icon}</span>
            <span className="hidden md:inline text-[14px] uppercase font-black tracking-[8px] leading-none">{label}</span>
        </button>
    );
}
