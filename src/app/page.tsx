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

    // CONVERSOR DE SEGURANÇA G20
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, _) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    };

    const handleGenerateVariations = async () => {
        if (!title) return alert("Título é obrigatório!");
        setIsLoading(true);
        setActiveTab('gallery');
        setVariations([]);
        setVariationsStatus(['loading', 'loading', 'loading', 'loading']);
        addLog(`Nano-Banana G20 Browser-Power Start...`);

        try {
            const themeRes = await fetch('/api/generate-cover-theme', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            });
            const theme = await themeRes.json();
            setApprovedTheme(theme);

            for (let i = 0; i < 4; i++) {
                addLog(`V${i + 1}: Orquestrando...`);
                const artPrompt = `Book cover art, cinematic text "${title.toUpperCase()}" by ${author || 'Lumina'}. ${theme.image_generation_prompt}. High quality.`;

                let finalB64 = "";

                // --- FASE 1: ELITE (SERVER) ---
                try {
                    addLog(`V${i + 1}: Chamando Elite...`);
                    const res = await fetch('/api/generate-cover', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: artPrompt })
                    });
                    const data = await res.json();
                    if (data.base64 && data.base64.length > 20000) {
                        finalB64 = data.base64;
                        addLog(`V${i + 1}: Elite OK (${Math.round(data.base64.length / 1024)}KB)`);
                    }
                } catch (e) { }

                // --- FASE 2: BROWSER-POWER (BYPASS DE TIMEOUT) ---
                if (!finalB64) {
                    addLog(`V${i + 1}: Ativando Turbo-Browser...`);
                    try {
                        const seed = Math.floor(Math.random() * 999999);
                        const pollUrl = `https://pollinations.ai/p/${encodeURIComponent(artPrompt.substring(0, 400))}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;

                        // O browser faz o fetch direto (Sem limite de 10s do Vercel)
                        const res = await fetch(pollUrl);
                        if (res.ok) {
                            const blob = await res.blob();
                            if (blob.size > 15000) {
                                finalB64 = await blobToBase64(blob);
                                addLog(`V${i + 1}: Turbo OK (${Math.round(blob.size / 1024)}KB)`);
                            }
                        }
                    } catch (e) {
                        addLog(`V${i + 1}: Falha no Bypass.`);
                    }
                }

                if (finalB64) {
                    updateVariation(i, finalB64, 'done');
                } else {
                    addLog(`V${i + 1}: Esgotado.`);
                    updateVariation(i, "", 'fail');
                }
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
        addLog("Preparando Obra G20...");
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
        <main className="min-h-screen bg-[#050510] text-[#f0f0f5]">
            <style jsx global>{` @import url('${GOOGLE_FONTS_URL}'); body { background: #050510; font-family: 'Montserrat', sans-serif; overflow-x: hidden; } .text-gradient { background: linear-gradient(135deg, #fff 0%, #a855f7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; } `}</style>

            <div className="flex min-h-screen">
                <aside className="w-20 md:w-80 bg-[#0a0a1f] border-r border-white/5 flex flex-col py-10 z-50">
                    <div className="px-10 mb-20 flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/20"><Sparkles className="w-7 h-7 text-white" /></div>
                        <span className="hidden md:inline font-black text-3xl italic tracking-tighter">LUMINA</span>
                    </div>

                    <nav className="flex-1 px-8 space-y-4">
                        <TabButton icon={<LayoutDashboard />} label="Workshop" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
                        <TabButton icon={<BookOpen />} label="Galeria G20" active={activeTab === 'gallery'} onClick={() => (variations.length > 0 || isLoading) && setActiveTab('gallery')} disabled={variations.length === 0 && !isLoading} />
                        <TabButton icon={<MessageSquare />} label="Escrita" active={activeTab === 'editorial'} onClick={() => setActiveTab('editorial')} disabled={!selectedCover} />
                        <TabButton icon={<Download />} label="Finalizar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} disabled={!generatedEbook} />
                    </nav>
                </aside>

                <section className="flex-1 flex flex-col relative h-screen overflow-hidden">
                    <header className="h-24 border-b border-white/5 flex items-center justify-between px-16 bg-[#050510]/95 backdrop-blur-3xl sticky top-0 z-40">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
                            <span className="text-[10px] font-black uppercase tracking-[8px] text-white/30 italic">Nano-Banana G20 Browser-Power</span>
                        </div>
                        {selectedCover && activeTab !== 'export' && (
                            <button onClick={handleCreateEbook} className="bg-white text-black px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-purple-200 transition-all font-bold">Produzir Obra Final</button>
                        )}
                    </header>

                    <div className="flex-1 overflow-y-auto p-10 md:p-24 custom-scrollbar h-full">
                        <AnimatePresence mode="wait">
                            {activeTab === 'config' && (
                                <motion.div key="config" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-3xl pb-20">
                                    <h1 className="text-8xl font-black tracking-tighter mb-8 text-gradient italic leading-none">O Auge Final.</h1>
                                    <p className="text-white/40 mb-20 text-lg max-w-sm font-medium leading-relaxed">G20 Browser-Power: A única arquitetura industrial que garante que o pixel chegue à tela, não importa o quê.</p>

                                    <div className="space-y-12">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Título do Livro</label>
                                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="A Era do Pixel" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Autor</label>
                                                <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Seu Nome" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Visão Artística</label>
                                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva sua capa dos sonhos..." rows={3} className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-xl font-medium focus:border-purple-500/50 transition-all outline-none resize-none" />
                                        </div>
                                        <button onClick={handleGenerateVariations} disabled={isLoading || !title} className="w-full py-10 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black uppercase tracking-[6px] rounded-[50px] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-6 shadow-2xl shadow-purple-500/30">
                                            {isLoading ? <Loader2 className="animate-spin w-10 h-10" /> : <Zap className="w-10 h-10 fill-current" />} PINTAR CAPAS G20
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'gallery' && (
                                <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-12 pb-40">
                                    {variationsStatus.map((status, i) => (
                                        <div key={i} className={`relative aspect-[2.2/3.5] rounded-[60px] overflow-hidden border-2 transition-all group ${status === 'loading' ? 'bg-white/[0.01] animate-pulse border-white/5 flex flex-col items-center justify-center gap-8' : (selectedCover === variations[i] ? 'border-purple-600 shadow-[0_0_100px_rgba(168,85,247,0.4)] scale-105 z-10' : 'border-white/5 hover:border-white/20')}`}>
                                            {status === 'loading' ? (
                                                <><div className="w-20 h-20 rounded-full border-t-2 border-purple-500 animate-spin"></div><span className="text-[10px] font-black uppercase tracking-[4px] text-white/10 italic">Criando V{i + 1}...</span></>
                                            ) : (status === 'fail' ? (
                                                <div className="flex flex-col items-center justify-center p-10 text-center gap-6">
                                                    <AlertCircle className="w-14 h-14 text-pink-500/30" />
                                                    <button onClick={handleGenerateVariations} className="bg-white/5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">Tentativa G20</button>
                                                </div>
                                            ) : (
                                                <motion.img
                                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                    transition={{ duration: 1 }}
                                                    src={variations[i]}
                                                    onClick={() => { setSelectedCover(variations[i]); setActiveTab('editorial'); }}
                                                    className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-[4000ms]"
                                                />
                                            ))}
                                            <div className="absolute bottom-8 left-8 bg-black/60 backdrop-blur-3xl px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[4px] border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">ESTILO {i + 1}</div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {activeTab === 'editorial' && (
                                <motion.div key="editorial" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col xl:flex-row gap-24 pb-20">
                                    <div className="flex-1 space-y-12">
                                        <h1 className="text-8xl font-black tracking-tighter mb-8 text-gradient italic leading-none">Redação.</h1>
                                        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Onde o pixel vira mística..." className="w-full bg-white/[0.01] border border-white/5 rounded-[80px] p-16 text-white/80 text-2xl leading-relaxed min-h-[900px] outline-none focus:border-purple-500/20 transition-all shadow-2xl custom-scrollbar" />
                                    </div>
                                    <div className="w-full xl:w-[500px] space-y-14">
                                        <div className="aspect-[2.2/3.5] rounded-[70px] overflow-hidden shadow-[0_100px_180px_-40px_rgba(168,85,247,0.6)] border border-white/10 bg-black">
                                            {selectedCover && <img src={selectedCover} className="w-full h-full object-cover" />}
                                        </div>
                                        <button onClick={() => setActiveTab('gallery')} className="w-full py-8 bg-white/5 border border-white/10 rounded-[40px] text-[13px] font-black uppercase tracking-[5px] hover:bg-white/10 transition-all">Alterar Identidade Visual</button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'export' && (
                                <motion.div key="export" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-60 text-center space-y-24">
                                    <div className="w-48 h-48 bg-green-500/5 rounded-full flex items-center justify-center shadow-[0_0_150px_rgba(34,197,94,0.4)] border border-green-500/10 animate-bounce"><CheckCircle2 className="w-24 h-24 text-green-500" /></div>
                                    <div className="space-y-6">
                                        <h2 className="text-9xl font-black tracking-tighter italic">Lumina Frontier.</h2>
                                        <p className="text-white/20 text-2xl font-medium tracking-[12px] uppercase">G20 Master Ready</p>
                                    </div>
                                    <button onClick={downloadPDF} className="bg-white text-black px-24 py-12 rounded-[60px] font-black uppercase text-xl flex items-center gap-10 hover:scale-110 active:scale-95 transition-all shadow-2xl"><FileDown className="w-14 h-14" /> DOWNLOAD OBRA PRIMA</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="fixed bottom-14 right-14 w-[450px] bg-[#050510]/98 backdrop-blur-3xl border border-white/5 p-14 rounded-[70px] flex flex-col gap-10 z-50 shadow-2xl border-t border-purple-500/30">
                        <div className="flex items-center justify-between border-b border-white/5 pb-8">
                            <span className="text-[12px] font-black uppercase tracking-[10px] text-white/30 italic">POWER MONITOR G20</span>
                            <div className="flex gap-2.5">
                                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="w-2.5 h-2.5 bg-purple-600 rounded-full animate-pulse delay-150"></span>
                            </div>
                        </div>
                        <div className="space-y-6">
                            {debugLogs.map((l, i) => <div key={i} className="text-[13px] font-bold text-white/30 font-mono flex gap-8 leading-tight hover:text-white transition-colors cursor-default select-none"><span className="text-purple-600/60">»</span> {l}</div>)}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

function TabButton({ icon, label, active, onClick, disabled }: any) {
    return (
        <button disabled={disabled} onClick={onClick} className={`flex items-center gap-8 py-8 px-12 rounded-[45px] transition-all w-full text-left group ${active ? 'bg-white/10 text-white shadow-2xl translate-x-6 scale-105' : 'text-gray-800 hover:text-white hover:bg-white/[0.05]'} ${disabled ? 'opacity-10' : ''}`}>
            <span className={`w-9 h-9 transition-all duration-700 ${active ? 'text-purple-500 rotate-0' : 'group-hover:text-purple-500/70 -rotate-12 group-hover:rotate-0'}`}>{icon}</span>
            <span className="hidden md:inline text-[13px] uppercase font-black tracking-[6px] leading-none">{label}</span>
        </button>
    );
}
