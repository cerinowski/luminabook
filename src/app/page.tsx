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
        addLog(`Nano-Banana G15 SaaS-Absurdo Start...`);

        try {
            const themeRes = await fetch('/api/generate-cover-theme', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            });
            const theme = await themeRes.json();
            setApprovedTheme(theme);

            // GERAÇÃO SEQUENCIAL (ARQUITETURA SAAS PROFISSIONAL)
            for (let i = 0; i < 4; i++) {
                addLog(`V${i + 1}: Orquestrando Arte...`);
                const artPrompt = `Professional book cover, cinematic typography "${title.toUpperCase()}". By ${author.toUpperCase() || 'Lumina'}. ${theme.image_generation_prompt}. 8k realism.`;

                try {
                    // TENTATIVA 1: NANO-SERVER G15 (SEQUENCIAL INTERNO)
                    const res = await fetch('/api/generate-cover', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: artPrompt })
                    });
                    const data = await res.json();

                    if (data.base64 && !data.error) {
                        addLog(`V${i + 1}: Pintada via ${data.engine}`);
                        updateVariation(i, data.base64, 'done');
                        continue;
                    }
                } catch (e) {
                    addLog(`V${i + 1}: Falha no Servidor. Tentando Bypass...`);
                }

                // TENTATIVA 2: HYPER-BYPASS (ULTRA SPEED)
                try {
                    const seed = Math.floor(Math.random() * 999999);
                    const pollUrl = `https://pollinations.ai/p/${encodeURIComponent(artPrompt.substring(0, 400))}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;

                    const pRes = await fetch('/api/proxy-image', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: pollUrl })
                    });
                    const pData = await pRes.json();
                    if (pData.base64) {
                        addLog(`V${i + 1}: Recuperada via Bypass.`);
                        updateVariation(i, pData.base64, 'done');
                        continue;
                    }
                } catch (e) { }

                addLog(`V${i + 1}: Esgotado.`);
                updateVariation(i, "", 'fail');
            }
        } catch (e) { addLog("Erro Crítico."); }
        finally { setIsLoading(false); }
    };

    const updateVariation = (index: number, content: string, status: 'done' | 'fail') => {
        setVariations(p => { const n = [...p]; n[index] = content; return n; });
        setVariationsStatus(p => { const n = [...p]; n[index] = status; return n; });
    };

    const handleCreateEbook = async () => {
        if (!content || !selectedCover) return;
        setIsLoading(true); setActiveTab('export');
        addLog("Compilando Obra SaaS...");
        try {
            const res = await fetch('/api/generate-ebook', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, approvedTitle: title, approvedTheme, approvedAuthor: author, description }),
            });
            const data = await res.json();
            setGeneratedEbook(data);
        } catch (e) { addLog("Erro."); }
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
        <main className="min-h-screen bg-[#020205] text-[#e0e0e8] selection:bg-purple-500/30">
            <style jsx global>{` @import url('${GOOGLE_FONTS_URL}'); body { background: #020205; font-family: 'Montserrat', sans-serif; overflow-x: hidden; } .text-gradient { background: linear-gradient(to right, #fff, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; } .glass { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(20px); } `}</style>

            <div className="flex min-h-screen">
                <aside className="w-20 md:w-80 bg-[#050510] border-r border-white/5 flex flex-col py-10 z-50">
                    <div className="px-10 mb-20 flex items-center gap-4 group cursor-pointer" onClick={() => window.location.reload()}>
                        <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-[22px] flex items-center justify-center shadow-2xl shadow-purple-500/20 group-hover:rotate-12 transition-transform duration-500"><Sparkles className="w-7 h-7 text-white" /></div>
                        <span className="hidden md:inline font-black text-3xl tracking-tighter italic">LUMINA</span>
                    </div>

                    <nav className="flex-1 px-8 space-y-4">
                        <TabButton icon={<LayoutDashboard />} label="Workshop" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
                        <TabButton icon={<BookOpen />} label="Galeria G15" active={activeTab === 'gallery'} onClick={() => (variations.length > 0 || isLoading) && setActiveTab('gallery')} disabled={variations.length === 0 && !isLoading} />
                        <TabButton icon={<MessageSquare />} label="Editorial" active={activeTab === 'editorial'} onClick={() => setActiveTab('editorial')} disabled={!selectedCover} />
                        <TabButton icon={<Download />} label="Compilar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} disabled={!generatedEbook} />
                    </nav>
                </aside>

                <section className="flex-1 flex flex-col">
                    <header className="h-24 border-b border-white/5 flex items-center justify-between px-16 bg-[#020205]/95 backdrop-blur-3xl sticky top-0 z-40">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></span>
                            <span className="text-[10px] font-black uppercase tracking-[6px] text-white/30 italic">G15 SAAS MASTER ARCHITECTURE</span>
                        </div>
                        {selectedCover && activeTab !== 'export' && (
                            <button onClick={handleCreateEbook} className="bg-white text-black px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-purple-200 transition-all font-bold shadow-2xl">Finalizar Projeto</button>
                        )}
                    </header>

                    <div className="flex-1 p-8 md:p-24 overflow-y-auto">
                        <AnimatePresence mode="wait">
                            {activeTab === 'config' && (
                                <motion.div key="config" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-3xl">
                                    <h1 className="text-8xl font-black tracking-tighter mb-8 text-gradient italic leading-none">O Futuro SaaS.</h1>
                                    <p className="text-white/40 mb-20 text-lg max-w-sm font-medium leading-relaxed">Versão G15: O motor que não conhece o erro. Arquitetura de processamento em cascata com redundância tripla.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[3px] text-white/20 ml-2">Título do Livro</label>
                                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="A Ascensão da IA" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-7 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[3px] text-white/20 ml-2">Assinatura / Autor</label>
                                            <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Seu Nome" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-7 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-4 mb-14">
                                        <label className="text-[10px] font-black uppercase tracking-[3px] text-white/20 ml-2">Visão do Artista</label>
                                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Qual a alma da sua capa? (Ex: Épico, Minimalista, Sombrio...)" rows={3} className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-xl font-medium focus:border-purple-500/50 transition-all outline-none resize-none" />
                                    </div>
                                    <button onClick={handleGenerateVariations} disabled={isLoading || !title} className="w-full py-10 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black uppercase tracking-[5px] rounded-[50px] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-6 shadow-[0_30px_60px_-15px_rgba(168,85,247,0.4)]">
                                        {isLoading ? <Loader2 className="animate-spin w-10 h-10" /> : <Zap className="w-10 h-10 fill-current" />} PINTAR CAPAS G15
                                    </button>
                                </motion.div>
                            )}

                            {activeTab === 'gallery' && (
                                <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pb-32">
                                    {variationsStatus.map((status, i) => (
                                        <div key={i} className={`relative aspect-[2.2/3.5] rounded-[60px] overflow-hidden border-2 transition-all group ${status === 'loading' ? 'bg-white/[0.01] animate-pulse border-white/5 flex flex-col items-center justify-center gap-6' : (selectedCover === variations[i] ? 'border-purple-500 shadow-[0_0_100px_rgba(168,85,247,0.3)] scale-105' : 'border-white/5 hover:border-white/20')}`}>
                                            {status === 'loading' ? (
                                                <>
                                                    <div className="w-16 h-16 rounded-full border-t-2 border-purple-600 animate-spin"></div>
                                                    <span className="text-[12px] font-black uppercase tracking-widest text-white/20">V{i + 1}: Orquestrando...</span>
                                                </>
                                            ) : (status === 'fail' ? (
                                                <div className="flex flex-col items-center justify-center p-8 text-center gap-6">
                                                    <AlertCircle className="w-16 h-16 text-pink-500/30" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Erro</span>
                                                    <button onClick={handleGenerateVariations} className="bg-white/5 px-6 py-3 rounded-2xl text-[10px] font-black">REPETIR</button>
                                                </div>
                                            ) : (
                                                <motion.img
                                                    initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ duration: 1.5 }}
                                                    src={variations[i]}
                                                    onClick={() => { setSelectedCover(variations[i]); setActiveTab('editorial'); }}
                                                    className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-[3000ms]"
                                                />
                                            ))}
                                            <div className="absolute top-8 left-8 bg-black/60 backdrop-blur-2xl px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[3px] border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">Design AI {i + 1}</div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {activeTab === 'editorial' && (
                                <motion.div key="editorial" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col lg:flex-row gap-20">
                                    <div className="flex-1 space-y-10">
                                        <h3 className="text-7xl font-black tracking-tighter italic leading-none">Criação Digital.</h3>
                                        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Onde a mágica acontece..." className="w-full bg-white/[0.01] border border-white/5 rounded-[70px] p-16 text-white/80 text-2xl leading-relaxed min-h-[800px] outline-none focus:border-purple-500/20 transition-all shadow-2xl custom-scrollbar" />
                                    </div>
                                    <div className="w-full lg:w-[450px] space-y-12">
                                        <div className="aspect-[2/3] rounded-[60px] overflow-hidden shadow-[0_80px_120px_-30px_rgba(168,85,247,0.5)] border border-white/10 bg-black">
                                            {selectedCover && <img src={selectedCover} className="w-full h-full object-cover" />}
                                        </div>
                                        <button onClick={() => setActiveTab('gallery')} className="w-full py-6 bg-white/5 border border-white/10 rounded-[30px] text-[12px] font-black uppercase tracking-[3px] hover:bg-white/10 transition-all">Trocar Identidade Visual</button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'export' && (
                                <motion.div key="export" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-48 text-center space-y-20">
                                    <div className="w-40 h-40 bg-green-500/5 rounded-full flex items-center justify-center shadow-[0_0_120px_rgba(34,197,94,0.3)] border border-green-500/10"><CheckCircle2 className="w-20 h-20 text-green-500" /></div>
                                    <div className="space-y-6">
                                        <h2 className="text-8xl font-black tracking-tighter italic">Nível SaaS Absurdo.</h2>
                                        <p className="text-white/20 text-xl font-medium tracking-widest uppercase">Pronto para dominar o mercado.</p>
                                    </div>
                                    <button onClick={downloadPDF} className="bg-white text-black px-24 py-10 rounded-[50px] font-black uppercase text-xl flex items-center gap-8 hover:scale-110 active:scale-95 transition-all shadow-[0_40px_100px_rgba(255,255,255,0.15)]"><FileDown className="w-12 h-12" /> BAIXAR OBRA PRIMA</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="fixed bottom-14 right-14 w-[400px] bg-[#050510]/95 backdrop-blur-3xl border border-white/5 p-12 rounded-[60px] flex flex-col gap-8 z-50 shadow-2xl border-t border-purple-500/20">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-[6px] text-white/20 italic">SAAS MONITOR G15</span>
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse"></span>
                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse delay-75"></span>
                                <span className="w-1.5 h-1.5 bg-pink-600 rounded-full animate-pulse delay-150"></span>
                            </div>
                        </div>
                        <div className="space-y-5">
                            {debugLogs.map((l, i) => <div key={i} className="text-[12px] font-bold text-white/30 font-mono flex gap-6 leading-tight select-none cursor-default hover:text-white transition-colors"><span className="text-purple-600/50">#</span> {l}</div>)}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

function TabButton({ icon, label, active, onClick, disabled }: any) {
    return (
        <button disabled={disabled} onClick={onClick} className={`flex items-center gap-6 py-7 px-10 rounded-[35px] transition-all w-full text-left group ${active ? 'bg-white/5 text-white shadow-2xl translate-x-4 scale-105' : 'text-gray-700 hover:text-white hover:bg-white/[0.03]'} ${disabled ? 'opacity-10 cursor-not-allowed' : 'opacity-100'}`}>
            <span className={`w-8 h-8 transition-all duration-500 ${active ? 'text-purple-500 rotate-0' : 'group-hover:text-purple-500/50 -rotate-12 group-hover:rotate-0'}`}>{icon}</span>
            <span className="hidden md:inline text-[12px] uppercase font-black tracking-[4px] leading-none">{label}</span>
        </button>
    );
}
