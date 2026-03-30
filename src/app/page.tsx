'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Upload, Loader2, FileDown, BookOpen, ChevronLeft, CreditCard, LayoutDashboard, Palette, Type, MessageSquare, Download, CheckCircle2, RefreshCw, AlertCircle, Image as ImageIcon, Cpu } from 'lucide-react';
import jsPDF from 'jspdf';

const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;700;900&display=swap";

export default function Home() {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [description, setDescription] = useState('');
    const [content, setContent] = useState('');
    const [activeTab, setActiveTab] = useState('config');
    const [isLoading, setIsLoading] = useState(false);
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

    const [selectedPalette, setSelectedPalette] = useState('Cyberpunk');
    const [selectedLayout, setSelectedLayout] = useState('Impact');
    const [selectedModel, setSelectedModel] = useState('auto');

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
        setIsLoading(true);
        setActiveTab('gallery');
        setSelectedCoverIndex(null);

        // Estado Único e Focado G28
        setCovers([{ id: 1, status: 'loading', image: null }]);
        addLog(`G27.1 Anthology Architecting...`);

        try {
            // STEP 1: ARCHITECT THE DOCUMENT (Gemini 2.0)
            const anthoRes = await fetch('/api/generate-anthology', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            });
            if (!anthoRes.ok) throw new Error("Falha ao arquitetar o documento");
            const dataAntho = await anthoRes.json();
            setBlueprint(dataAntho);
            addLog(`Arquitetura OK.`);

            const style = dataAntho?.global_style || { global_mood: 'Luxury', primary_color: '#ffffff' };
            const coverPage = dataAntho?.pages?.find((p: any) => p.type === 'cover');

            // Geração Única G28
            const illustrationPrompt = coverPage?.illustration_prompt || description || "High-end conceptual art";
            const basePrompt = `Professional book cover art for "${title.toUpperCase()}". Style: ${selectedPalette}. Mood: ${style.global_mood}. Detail: ${illustrationPrompt}. Flat 2D digital illustration, editorial design, NO 3D MOCKUPS, NO PHYSICAL BOOKS, 8k, centered. Author: ${author || 'Lumina Studio'}.`;

            const updateCard = (id: number, patch: Partial<CoverCard>) => {
                setCovers(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
            };

            const generateOne = async (id: number, customPrompt: string) => {
                try {
                    addLog(`Gerando via OpenAI...`);
                    const res = await fetch('/api/generate-cover', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: customPrompt, title }),
                    });
                    const data = await res.json();

                    if (data.ok && data.relayUrl) {
                        addLog(`OpenAI iniciada. Aguardando arte...`);

                        // Busca a imagem do Relay (SEM LIMITE DE 10S)
                        const proxyRes = await fetch('/api/proxy-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: data.relayUrl })
                        });
                        const proxyData = await proxyRes.json();

                        if (proxyData.base64) {
                            addLog(`Sucesso OpenAI DALL-E 3.`);
                            updateCard(id, { status: 'success', image: proxyData.base64, engine: 'OpenAI' });
                        } else {
                            throw new Error("Falha na renderização");
                        }
                    } else {
                        throw new Error(data.error || "Erro na OpenAI");
                    }
                } catch (e: any) {
                    addLog(`Erro: ${e.message}`);
                    updateCard(id, { status: 'error', error: e.message });
                }
            };

            await generateOne(1, basePrompt);
            setIsLoading(false);
            setSelectedCoverIndex(0);

        } catch (e: any) {
            addLog(`Erro: ${e?.message?.substring(0, 20) || 'erro desconhecido'}`);
            setIsLoading(false);
        }
    };

    // --- A4 PAGE RENDERER ---
    const A4Page = ({ page, index }: { page: AnthologyPage; index: number }) => {
        return (
            <div className="relative w-full aspect-[210/297] bg-black overflow-hidden shadow-2xl border border-white/5 rounded-3xl mb-20 group">
                {page.image ? (
                    <img src={page.image} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-black to-[#050510]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
                <div className="absolute inset-0 p-16 flex flex-col justify-between z-10">
                    <div className="space-y-6">
                        <span className="text-white/30 text-[10px] font-black tracking-[8px] uppercase">Page {index + 1} // {page.type}</span>
                        <h2 className="text-5xl font-black tracking-tighter text-white italic leading-none max-w-[80%]">{page.title}</h2>
                        {page.subtitle && <p className="text-white/60 text-lg font-medium tracking-wide">{page.subtitle}</p>}
                    </div>
                    <div className="space-y-8">
                        {page.items && (
                            <div className="grid grid-cols-1 gap-6">
                                {page.items.map((item, i) => (
                                    <div key={i} className="flex items-center gap-6 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/5">
                                        <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,1)]" />
                                        <span className="text-white/90 font-bold tracking-tight">{item}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {page.status === 'loading' && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-20">
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                    </div>
                )}
            </div>
        );
    };

    const handleStartFullGeneration = async () => {
        if (!blueprint) return;
        setActiveTab('editorial');
        addLog("Iniciando Geração da Antologia A4...");

        blueprint.pages.forEach(async (page, idx) => {
            if (page.type === 'cover') {
                const activeImg = selectedCoverIndex !== null ? covers[selectedCoverIndex].image : null;
                setBlueprint(prev => {
                    const newPages = [...(prev?.pages || [])];
                    newPages[idx] = { ...newPages[idx], status: 'success', image: activeImg };
                    return { ...prev!, pages: newPages };
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

                if (data.ok && data.image && !data.engine?.includes('Safety') && !data.engine?.includes('Fatal')) {
                    setBlueprint(prev => {
                        const newPages = [...(prev?.pages || [])];
                        newPages[idx] = { ...newPages[idx], status: 'success', image: data.image };
                        return { ...prev!, pages: newPages };
                    });
                } else {
                    addLog(`[Pág ${idx + 1}] Fallback: ${data.engine}. Bypass...`);
                    // Browser Bypass Fallback
                    try {
                        const seed = Math.floor(Math.random() * 999999);
                        const pollUrl = `https://pollinations.ai/p/${encodeURIComponent(page.illustration_prompt.substring(0, 400))}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
                        const proxyRes = await fetch('/api/proxy-image', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: pollUrl })
                        });
                        if (proxyRes.ok) {
                            const proxyData = await proxyRes.json();
                            if (proxyData.base64) {
                                setBlueprint(prev => {
                                    const newPages = [...(prev?.pages || [])];
                                    newPages[idx] = { ...newPages[idx], status: 'success', image: proxyData.base64 };
                                    return { ...prev!, pages: newPages };
                                });
                                return;
                            }
                        }
                    } catch (e) {
                        addLog(`[Pág ${idx + 1}] Falha no Bypass.`);
                    }

                    setBlueprint(prev => {
                        const newPages = [...(prev?.pages || [])];
                        newPages[idx] = { ...newPages[idx], status: 'error' };
                        return { ...prev!, pages: newPages };
                    });
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
        setIsLoading(true);
        setActiveTab('export');
        addLog("Preparando Exportação...");
        setTimeout(() => setIsLoading(false), 2000);
    };

    const downloadPDF = async () => {
        if (!blueprint) return;
        setIsLoading(true);
        const doc = new jsPDF();

        blueprint.pages.forEach((page, i) => {
            if (page.image) {
                const imageType = page.image.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                doc.addImage(page.image, imageType, 0, 0, 210, 297, undefined, 'FAST');

                if (page.type !== 'cover') {
                    doc.setTextColor(255, 255, 255);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(28);
                    doc.text(page.title.toUpperCase(), 20, 50);

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(14);
                    if (page.subtitle) {
                        const splitText = doc.splitTextToSize(page.subtitle, 170);
                        doc.text(splitText, 20, 70);
                    }
                    if (page.items) {
                        page.items.forEach((item, idx) => {
                            doc.text(`• ${item}`, 25, 120 + (idx * 10));
                        });
                    }
                }

                if (i < blueprint.pages.length - 1) doc.addPage();
            }
        });

        doc.save(`${title.replace(/\s/g, '_')}.pdf`);
        setIsLoading(false);
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
                        <TabButton icon={<LayoutDashboard />} label="Workshop" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
                        <TabButton icon={<Palette />} label="Design" active={activeTab === 'design'} onClick={() => setActiveTab('design')} />
                        <TabButton icon={<Cpu />} label="Motores AI" active={activeTab === 'engines'} onClick={() => setActiveTab('engines')} />
                        <TabButton icon={<BookOpen />} label="Galeria" active={activeTab === 'gallery'} onClick={() => (covers.length > 0 || isLoading) && setActiveTab('gallery')} disabled={covers.length === 0 && !isLoading} />
                        <TabButton icon={<MessageSquare />} label="Escrita" active={activeTab === 'editorial'} onClick={() => setActiveTab('editorial')} disabled={!blueprint} />
                        <TabButton icon={<Download />} label="Salvar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} disabled={!blueprint} />
                    </nav>
                </aside>

                <section className="flex-1 flex flex-col relative h-screen overflow-hidden">
                    <header className="h-24 border-b border-white/5 flex items-center justify-between px-16 bg-[#020205]/95 backdrop-blur-3xl sticky top-0 z-40">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
                            <span className="text-[10px] font-black uppercase tracking-[8px] text-white/30 italic">Anthology G27.1 DYNAMIC</span>
                        </div>
                        {blueprint && activeTab === 'editorial' && (
                            <button onClick={handleCreateEbook} className="bg-white text-black px-12 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all font-bold shadow-2xl">Finalizar Documento</button>
                        )}
                    </header>

                    <div className="flex-1 overflow-y-auto p-12 md:p-24 h-full custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeTab === 'config' && (
                                <motion.div key="config" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-3xl pb-20">
                                    <h1 className="text-8xl font-black tracking-tighter mb-8 text-gradient italic leading-none">O Infalível.</h1>
                                    <p className="text-white/30 mb-20 text-lg max-w-sm font-medium leading-relaxed">Antologia Dinâmica A4: Diagramação automática de múltiplos layouts em alta definição.</p>

                                    <div className="space-y-12">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Título da Obra</label>
                                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: O Futuro da IA" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none text-white" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Autor</label>
                                                <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Seu Nome" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none text-white" />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Contexto para Diagramação</label>
                                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva os tópicos principais..." rows={3} className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-xl font-medium focus:border-purple-500/50 transition-all outline-none resize-none text-white" />
                                        </div>
                                        <button onClick={handleGenerateCover} disabled={isLoading || !title} className="group relative w-full py-10 bg-white text-black font-black uppercase tracking-[6px] rounded-[50px] hover:bg-white/90 transition-all flex items-center justify-center gap-6 shadow-2xl">
                                            {isLoading ? <Loader2 className="animate-spin w-10 h-10" /> : <Zap className="w-10 h-10 fill-current" />} ARQUITETAR A4
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'gallery' && (
                                <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 pb-40">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl w-full">
                                        {covers.map((c, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.1 }}
                                                className={`relative aspect-[2.2/3.5] rounded-[60px] overflow-hidden border-2 cursor-pointer transition-all ${selectedCoverIndex === i ? 'border-purple-600 shadow-[0_40px_80px_-20px_rgba(168,85,247,0.4)] scale-105 z-10' : 'border-white/5 opacity-40 hover:opacity-100 hover:border-white/20'} ${c.status === 'loading' ? 'bg-white/[0.01] animate-pulse' : ''}`}
                                                onClick={() => c.status === 'success' && setSelectedCoverIndex(i)}
                                            >
                                                {c.status === 'loading' && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                                                        <div className="w-12 h-12 rounded-full border-t-2 border-blue-500 animate-spin"></div>
                                                        <span className="text-[10px] font-black uppercase tracking-[4px] text-white/20 italic">Slot {c.id}...</span>
                                                    </div>
                                                )}
                                                {c.status === 'success' && c.image && (
                                                    <>
                                                        <img src={c.image} className="w-full h-full object-cover" />
                                                        {selectedCoverIndex === i && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                                                <button onClick={handleStartFullGeneration} className="bg-white text-black px-10 py-5 rounded-full font-black uppercase tracking-[4px] shadow-2xl hover:scale-110 transition-all text-[11px]">Selecionar esta Capa</button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                    <button onClick={handleGenerateCover} className="mt-20 flex items-center gap-6 text-white/30 hover:text-white transition-all font-black uppercase tracking-[8px] text-[12px] group"><RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700" /> Gerar Novas Opções</button>
                                </motion.div>
                            )}

                            {activeTab === 'editorial' && (
                                <motion.div key="editorial" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-12 pb-40">
                                    <div className="max-w-4xl w-full flex justify-between items-end mb-10">
                                        <h1 className="text-7xl font-black tracking-tighter text-gradient italic leading-none">Diagramação.</h1>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase tracking-[4px] text-white/20 mb-2">Sincronização Ativa</p>
                                            <div className="flex gap-2 justify-end">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_blue]" />
                                                <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_purple]" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="max-w-4xl w-full space-y-20">
                                        {blueprint?.pages.map((p, i) => (
                                            <A4Page key={i} page={p} index={i} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'export' && (
                                <motion.div key="export" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-60 text-center space-y-24">
                                    <div className="w-60 h-60 bg-green-500/5 rounded-full flex items-center justify-center shadow-[0_0_150px_rgba(34,197,94,0.4)] border border-green-500/10"><CheckCircle2 className="w-32 h-32 text-green-500" /></div>
                                    <div className="space-y-6">
                                        <h1 className="text-9xl font-black tracking-tighter italic text-gradient leading-none">Pronto.</h1>
                                        <p className="text-white/20 text-3xl font-medium tracking-[15px] uppercase mt-10">G27.1 Anthology Edition</p>
                                    </div>
                                    <button onClick={downloadPDF} className="bg-white text-black px-32 py-16 rounded-[70px] font-black uppercase text-2xl flex items-center gap-12 hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-white/5"><FileDown className="w-16 h-16" /> SALVAR DOCUMENTO A4</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="fixed bottom-14 right-14 w-[500px] bg-[#050510]/98 backdrop-blur-3xl border border-white/5 p-16 rounded-[80px] flex flex-col gap-12 z-50 shadow-2xl border-t border-blue-500/20">
                        <div className="flex items-center justify-between border-b border-white/5 pb-10">
                            <span className="text-[14px] font-black uppercase tracking-[12px] text-white/30 italic">ANTHOLOGY MONITOR G27</span>
                            <div className="flex gap-3">
                                <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_blue]"></span>
                            </div>
                        </div>
                        <div className="space-y-8">
                            {debugLogs.map((l, i) => <div key={i} className="text-[14px] font-bold text-white/30 font-mono flex gap-10 leading-none select-none hover:text-white transition-colors cursor-default tracking-wide"><span className="text-blue-600/70">»</span> {l}</div>)}
                        </div>
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
