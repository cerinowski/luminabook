'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Upload, Loader2, FileDown, BookOpen, ChevronLeft, CreditCard, LayoutDashboard, Palette, Type, MessageSquare, Download, CheckCircle2, RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react';
import jsPDF from 'jspdf';

// Fontes de Luxo
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;700;900&display=swap";

export default function Home() {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [description, setDescription] = useState('');
    const [content, setContent] = useState('');
    const [activeTab, setActiveTab] = useState('config');
    const [isLoading, setIsLoading] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [variations, setVariations] = useState<string[]>([]);
    const [selectedCover, setSelectedCover] = useState<string | null>(null);
    const [approvedTheme, setApprovedTheme] = useState<any>(null);
    const [generatedEbook, setGeneratedEbook] = useState<any>(null);
    const [variationsStatus, setVariationsStatus] = useState<('loading' | 'done' | 'fail')[]>([]);

    const addLog = (msg: string) => {
        setDebugLogs(p => [...p.slice(-10), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleGenerateVariations = async () => {
        if (!title) return alert("Título é obrigatório!");
        setIsLoading(true);
        setActiveTab('gallery');
        setVariations([]);
        setVariationsStatus(['loading', 'loading', 'loading', 'loading']);
        addLog(`Nano-Banana G13 Hyper-Shield Start...`);

        try {
            const themeRes = await fetch('/api/generate-cover-theme', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            });
            const theme = await themeRes.json();
            setApprovedTheme(theme);

            for (let i = 0; i < 4; i++) {
                addLog(`V${i + 1}: Pintando...`);
                // PROMPT ULTRA CONCISO PARA EVITAR TRUNCAÇÃO
                const basePrompt = theme.image_generation_prompt;
                const artPrompt = `Book cover art, cinematic 3d text "${title.toUpperCase()}". ${basePrompt}. 8k resolution.`;

                let success = false;

                // TENTATIVA 1: NANO-SERVER (G13 ELITE)
                try {
                    const res = await fetch('/api/generate-cover', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: artPrompt })
                    });
                    const data = await res.json();
                    if (data.base64 && data.base64.length > 5000) {
                        addLog(`V${i + 1}: OK via Gemini/Flux`);
                        updateVariation(i, data.base64, 'done'); success = true;
                    }
                } catch (e) { }

                // TENTATIVA 2: HYPER-PROXY (G13 SNIFFER)
                if (!success) {
                    addLog(`V${i + 1}: Validando via Hyper-Proxy...`);
                    try {
                        const seed = Math.floor(Math.random() * 999999);
                        const pollUrl = `https://pollinations.ai/p/${encodeURIComponent(artPrompt.substring(0, 400))}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;

                        const pRes = await fetch('/api/proxy-image', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: pollUrl })
                        });
                        const pData = await pRes.json();
                        if (pData.base64 && pData.base64.length > 2000) {
                            addLog(`V${i + 1}: Capturada (${Math.round(pData.size / 1024)}KB)`);
                            updateVariation(i, pData.base64, 'done'); success = true;
                        }
                    } catch (e) { }
                }

                if (!success) {
                    addLog(`V${i + 1}: Limite de Tempo Excedido.`);
                    updateVariation(i, "", 'fail');
                }
            }
        } catch (e) { addLog("Critical CPU Error."); }
        finally { setIsLoading(false); }
    };

    const updateVariation = (index: number, content: string, status: 'done' | 'fail') => {
        setVariations(p => { const n = [...p]; n[index] = content; return n; });
        setVariationsStatus(p => { const n = [...p]; n[index] = status; return n; });
    };

    const handleCreateEbook = async () => {
        if (!content || !selectedCover) return;
        setIsLoading(true); setActiveTab('export');
        addLog("Compilando Projeto Final...");
        try {
            const res = await fetch('/api/generate-ebook', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, approvedTitle: title, approvedTheme, approvedAuthor: author, description }),
            });
            const data = await res.json();
            setGeneratedEbook(data);
        } catch (e) { addLog("Erro na compilação."); }
        finally { setIsLoading(false); }
    };

    const downloadPDF = async () => {
        if (!generatedEbook || !selectedCover) return;
        setIsLoading(true);
        const doc = new jsPDF();
        doc.addImage(selectedCover, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        doc.save(`${title.replace(/\s/g, '_')}.pdf`);
        setIsLoading(false);
    };

    return (
        <main className="min-h-screen bg-[#050510] text-[#f0f0f5] selection:bg-purple-500/30">
            <style jsx global>{` @import url('${GOOGLE_FONTS_URL}'); body { background: #050510; font-family: 'Montserrat', sans-serif; overflow-x: hidden; } .text-gradient { background: linear-gradient(to right, #fff, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; } `}</style>

            <div className="flex min-h-screen">
                <aside className="w-20 md:w-64 bg-[#0a0a1f] border-r border-white/5 flex flex-col py-8 z-50">
                    <div className="px-6 mb-16 flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]"><Sparkles className="w-6 h-6 text-white" /></div>
                        <span className="hidden md:inline font-black text-2xl italic tracking-tighter">LUMINA</span>
                    </div>

                    <nav className="flex-1 px-4 space-y-3">
                        <TabButton icon={<LayoutDashboard />} label="Criação" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
                        <TabButton icon={<BookOpen />} label="Galeria AI" active={activeTab === 'gallery'} onClick={() => (variations.length > 0 || isLoading) && setActiveTab('gallery')} disabled={variations.length === 0 && !isLoading} />
                        <TabButton icon={<MessageSquare />} label="Escrita" active={activeTab === 'editorial'} onClick={() => setActiveTab('editorial')} disabled={!selectedCover} />
                        <TabButton icon={<Download />} label="Finalizar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} disabled={!generatedEbook} />
                    </nav>
                </aside>

                <section className="flex-1 flex flex-col">
                    <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-[#050510]/95 backdrop-blur-3xl sticky top-0 z-40">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-[4px] text-white/30">G13 HYPER-STABLE CORTEX</span>
                        </div>
                        {selectedCover && activeTab !== 'export' && (
                            <button onClick={handleCreateEbook} className="bg-white text-black px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-purple-200 transition-all font-bold">Gerar Obra Final</button>
                        )}
                    </header>

                    <div className="flex-1 p-6 md:p-16">
                        <AnimatePresence mode="wait">
                            {activeTab === 'config' && (
                                <motion.div key="config" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-xl">
                                    <h1 className="text-6xl font-black tracking-tighter mb-4 text-gradient italic">Nano-Banana G13</h1>
                                    <p className="text-white/40 mb-12 text-sm max-w-sm font-medium leading-relaxed">Blindagem absoluta contra erros. O motor G13 valida cada arte antes da exibição.</p>

                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">Título do Projeto</label>
                                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: O Império da Mente" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">Seu Nome / Autor</label>
                                            <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Seu Nome" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">Estilo Visual</label>
                                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Minimalista, Cyberpunk, Realista..." rows={3} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-lg font-medium focus:border-purple-500/50 transition-all outline-none resize-none" />
                                        </div>
                                        <button onClick={handleGenerateVariations} disabled={isLoading || !title} className="w-full py-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black uppercase tracking-[3px] rounded-3xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-purple-500/30">
                                            {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <Zap className="w-6 h-6 fill-current" />} PINTAR CAPAS G13
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'gallery' && (
                                <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                                        {variationsStatus.map((status, i) => (
                                            <div key={i} className={`relative aspect-[2/3] rounded-[40px] overflow-hidden border-2 transition-all group ${status === 'loading' ? 'bg-white/[0.02] animate-pulse border-white/5 flex flex-col items-center justify-center gap-4' : (selectedCover === variations[i] ? 'border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.3)] scale-105' : 'border-white/5 hover:border-white/20')}`}>
                                                {status === 'loading' ? (
                                                    <>
                                                        <RefreshCw className="w-10 h-10 animate-spin text-purple-600/30" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/10">Processando Estilo {i + 1}...</span>
                                                    </>
                                                ) : (status === 'fail' ? (
                                                    <div className="flex flex-col items-center justify-center gap-4 text-center p-6">
                                                        <AlertCircle className="w-12 h-12 text-pink-500/40" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Erro de Geração</span>
                                                        <button onClick={handleGenerateVariations} className="text-[9px] bg-white/5 px-4 py-2 rounded-full uppercase font-black tracking-widest hover:bg-white/10">Tentar Novamente</button>
                                                    </div>
                                                ) : (
                                                    <motion.img
                                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                        src={variations[i]}
                                                        onClick={() => { setSelectedCover(variations[i]); setActiveTab('editorial'); }}
                                                        className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-1000"
                                                    />
                                                ))}
                                                <div className="absolute top-6 left-6 bg-black/50 backdrop-blur-xl px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[2px] border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">Design AI {i + 1}</div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'editorial' && (
                                <motion.div key="editorial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row gap-16">
                                    <div className="flex-1 space-y-6">
                                        <h3 className="text-5xl font-black tracking-tighter italic">Projeto Digital</h3>
                                        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Solte sua criatividade aqui..." className="w-full bg-white/[0.02] border border-white/5 rounded-[50px] p-12 text-white/80 text-lg leading-relaxed min-h-[600px] outline-none focus:border-purple-500/20 transition-all custom-scrollbar shadow-2xl" />
                                    </div>
                                    <div className="w-full lg:w-[380px] space-y-8">
                                        <div className="aspect-[2/3] rounded-[40px] overflow-hidden shadow-[0_40px_80px_-20px_rgba(100,0,255,0.4)] border border-white/10 bg-black">
                                            {selectedCover && <img src={selectedCover} className="w-full h-full object-cover" />}
                                        </div>
                                        <button onClick={() => setActiveTab('gallery')} className="w-full py-5 bg-white/5 border border-white/10 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Trocar Estilo Visual</button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'export' && (
                                <motion.div key="export" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 text-center space-y-12">
                                    <div className="w-32 h-32 bg-green-500/5 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(34,197,94,0.2)] border border-green-500/10"><CheckCircle2 className="w-16 h-16 text-green-500" /></div>
                                    <div className="space-y-4">
                                        <h2 className="text-6xl font-black tracking-tighter italic">Sua obra é real!</h2>
                                        <p className="text-white/30 text-sm font-medium">O e-book foi compilado com sucesso e está pronto para download.</p>
                                    </div>
                                    <button onClick={downloadPDF} className="bg-white text-black px-16 py-7 rounded-[32px] font-black uppercase text-base flex items-center gap-6 hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)]"><FileDown className="w-8 h-8" /> BAIXAR E-BOOK HD</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {debugLogs.length > 0 && (
                        <div className="fixed bottom-10 right-10 w-80 bg-black/95 backdrop-blur-3xl border border-white/5 p-8 rounded-[40px] flex flex-col gap-4 z-50 shadow-2xl border-t border-white/10">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black tracking-[4px] text-white/20 uppercase">CORTEX MONITOR G13</span>
                                <div className="h-1 w-12 bg-white/5 rounded-full"></div>
                            </div>
                            <div className="space-y-3">
                                {debugLogs.map((l, i) => <div key={i} className="text-[10px] font-bold text-white/40 font-mono flex gap-4"><span className="text-purple-600">»</span> {l}</div>)}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

function TabButton({ icon, label, active, onClick, disabled }: any) {
    return (
        <button disabled={disabled} onClick={onClick} className={`flex items-center gap-5 py-5 px-8 rounded-3xl transition-all w-full text-left group ${active ? 'bg-white/5 text-white shadow-2xl translate-x-2' : 'text-gray-600 hover:text-white hover:bg-white/[0.02]'} ${disabled ? 'opacity-10 cursor-not-allowed' : 'opacity-100'}`}>
            <span className={`w-6 h-6 transition-transform group-hover:scale-110 ${active ? 'text-purple-500' : 'group-hover:text-purple-500/50'}`}>{icon}</span>
            <span className="hidden md:inline text-[10px] uppercase font-black tracking-[3px]">{label}</span>
        </button>
    );
}
