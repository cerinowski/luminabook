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
        addLog(`Nano-Banana G16 Visual-Truth Start...`);

        try {
            const themeRes = await fetch('/api/generate-cover-theme', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            });
            const theme = await themeRes.json();
            setApprovedTheme(theme);

            for (let i = 0; i < 4; i++) {
                addLog(`V${i + 1}: Orquestrando...`);
                const artPrompt = `Cinematic book cover, high-end 3D typography "${title.toUpperCase()}". ${theme.image_generation_prompt}. Masterpiece 8k.`;

                try {
                    // TENTATIVA 1: NANO-SERVER
                    const res = await fetch('/api/generate-cover', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: artPrompt })
                    });
                    const data = await res.json();

                    // --- G18 IRON PIXEL CHECK (30KB MIN) ---
                    if (data.base64 && data.base64.length > 30000) {
                        const sizeKB = Math.round(data.base64.length / 1024 * 0.75); // Estimativa real
                        addLog(`V${i + 1}: Iron OK (${sizeKB}KB via ${data.engine})`);
                        updateVariation(i, data.base64, 'done'); continue;
                    } else {
                        addLog(`V${i + 1}: Rejeitada (Sombra/Ghost)`);
                    }
                } catch (e: any) {
                    addLog(`V${i + 1}: Erro: ${e.message.substring(0, 20)}`);
                }

                // TENTATIVA 2: HYPER-BYPASS (IRON VALIDATED)
                try {
                    const seed = Math.floor(Math.random() * 999999);
                    const pollUrl = `https://pollinations.ai/p/${encodeURIComponent(artPrompt.substring(0, 400))}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;

                    const pRes = await fetch('/api/proxy-image', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: pollUrl })
                    });
                    const pData = await pRes.json();
                    if (pData.base64 && pData.base64.length > 30000) {
                        addLog(`V${i + 1}: Bypass Iron (${Math.round(pData.base64.length / 1024 * 0.75)}KB)`);
                        updateVariation(i, pData.base64, 'done'); continue;
                    } else {
                        addLog(`V${i + 1}: Bypass Falhou.`);
                    }
                } catch (e) { }

                addLog(`V${i + 1}: Erro na Pintura.`);
                updateVariation(i, "", 'fail');
            }
        } catch (e) { addLog("Critical Error."); }
        finally { setIsLoading(false); }
    };

    const updateVariation = (index: number, content: string, status: 'done' | 'fail') => {
        setVariations(p => { const n = [...p]; n[index] = content; return n; });
        setVariationsStatus(p => { const n = [...p]; n[index] = status; return n; });
    };

    const handleCreateEbook = async () => {
        if (!content || !selectedCover) return;
        setIsLoading(true); setActiveTab('export');
        addLog("Compilando Ebook...");
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
            <style jsx global>{` @import url('${GOOGLE_FONTS_URL}'); body { background: #050510; font-family: 'Montserrat', sans-serif; overflow: hidden; } .text-gradient { background: linear-gradient(135deg, #fff 0%, #a855f7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; } `}</style>

            <div className="flex h-screen">
                <aside className="w-20 md:w-80 bg-[#0a0a1f] border-r border-white/5 flex flex-col py-10">
                    <div className="px-10 mb-20 flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/20"><Sparkles className="w-6 h-6 text-white" /></div>
                        <span className="hidden md:inline font-black text-2xl italic tracking-tighter">LUMINA</span>
                    </div>

                    <nav className="flex-1 px-8 space-y-4">
                        <TabButton icon={<LayoutDashboard />} label="Workshop" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
                        <TabButton icon={<BookOpen />} label="Galeria" active={activeTab === 'gallery'} onClick={() => (variations.length > 0 || isLoading) && setActiveTab('gallery')} disabled={variations.length === 0 && !isLoading} />
                        <TabButton icon={<MessageSquare />} label="Escrita" active={activeTab === 'editorial'} onClick={() => setActiveTab('editorial')} disabled={!selectedCover} />
                        <TabButton icon={<Download />} label="Finalizar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} disabled={!generatedEbook} />
                    </nav>
                </aside>

                <section className="flex-1 flex flex-col relative">
                    <header className="h-24 border-b border-white/5 flex items-center justify-between px-16 bg-[#050510]/80 backdrop-blur-2xl z-40">
                        <div className="flex items-center gap-4">
                            <span className="w-3 h-3 bg-purple-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(168,85,247,0.5)]"></span>
                            <span className="text-[10px] font-black uppercase tracking-[6px] text-white/30">Lumina Engine G16</span>
                        </div>
                        {selectedCover && activeTab !== 'export' && (
                            <button onClick={handleCreateEbook} className="bg-white text-black px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-purple-200 transition-all font-bold">Produzir E-Book</button>
                        )}
                    </header>

                    <div className="flex-1 overflow-y-auto p-8 md:p-24 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeTab === 'config' && (
                                <motion.div key="config" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl">
                                    <h1 className="text-7xl font-black tracking-tighter mb-6 text-gradient italic">Nano-Banana G16</h1>
                                    <p className="text-white/30 mb-16 text-sm font-medium leading-relaxed max-w-sm">Visão Digital Multi-Cortex. Estabilidade absoluta para sua obra literária.</p>

                                    <div className="space-y-10">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[3px] text-white/20">Título Oficial</label>
                                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: O Código das Estrelas" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-7 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none shadow-2xl" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[3px] text-white/20">Autor / Estúdio</label>
                                            <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Seu Nome" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-7 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[3px] text-white/20">Ambiente Visual</label>
                                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Neon futurista, minimalista, clássico..." rows={3} className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-7 text-xl font-medium focus:border-purple-500/50 transition-all outline-none resize-none" />
                                        </div>
                                        <button onClick={handleGenerateVariations} disabled={isLoading || !title} className="w-full py-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black uppercase tracking-[5px] rounded-[40px] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-5 shadow-[0_20px_60px_-15px_rgba(168,85,247,0.4)]">
                                            {isLoading ? <Loader2 className="animate-spin w-8 h-8" /> : <Zap className="w-8 h-8 fill-current" />} PINTAR OBRA G16
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'gallery' && (
                                <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pb-32">
                                    {variationsStatus.map((status, i) => (
                                        <div key={i} className={`relative aspect-[2.2/3.3] rounded-[50px] overflow-hidden border-2 transition-all ${status === 'loading' ? 'bg-white/[0.01] animate-pulse border-white/5 flex flex-col items-center justify-center gap-6' : (selectedCover === variations[i] ? 'border-purple-500 shadow-[0_0_100px_rgba(168,85,247,0.3)]' : 'border-white/5 hover:border-white/20')}`}>
                                            {status === 'loading' ? (
                                                <>
                                                    <div className="w-12 h-12 rounded-full border-t-2 border-purple-500 animate-spin"></div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/10 italic">Processando V{i + 1}</span>
                                                </>
                                            ) : (status === 'fail' ? (
                                                <div className="flex flex-col items-center justify-center gap-4 text-center p-8">
                                                    <AlertCircle className="w-12 h-12 text-pink-500/40" />
                                                    <button onClick={handleGenerateVariations} className="text-[10px] font-black uppercase underline decoration-pink-500/30">Repetir</button>
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
                                            <div className="absolute top-8 left-8 bg-black/40 backdrop-blur-xl px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-white/10">Estilo {i + 1}</div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {activeTab === 'editorial' && (
                                <motion.div key="editorial" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col lg:flex-row gap-20">
                                    <div className="flex-1 space-y-10">
                                        <h3 className="text-6xl font-black tracking-tighter italic">Editorial</h3>
                                        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Inicie sua jornada criativa aqui..." className="w-full bg-white/[0.01] border border-white/5 rounded-[60px] p-12 text-white/80 text-2xl leading-relaxed min-h-[600px] outline-none focus:border-purple-500/20 transition-all custom-scrollbar shadow-2xl" />
                                    </div>
                                    <div className="w-full lg:w-[400px] space-y-10">
                                        <div className="aspect-[2.2/3.3] rounded-[50px] overflow-hidden shadow-[0_60px_100px_-30px_rgba(168,85,247,0.4)] border border-white/10 bg-black">
                                            {selectedCover && <img src={selectedCover} className="w-full h-full object-cover" />}
                                        </div>
                                        <button onClick={() => setActiveTab('gallery')} className="w-full py-6 bg-white/5 border border-white/10 rounded-3xl text-[12px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Alterar Design</button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'export' && (
                                <motion.div key="export" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-48 text-center space-y-16">
                                    <div className="w-32 h-32 bg-green-500/5 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(34,197,94,0.2)] border border-green-500/10"><CheckCircle2 className="w-16 h-16 text-green-500" /></div>
                                    <div className="space-y-4">
                                        <h2 className="text-7xl font-black tracking-tighter italic">Projeto Concluído.</h2>
                                        <p className="text-white/20 text-lg font-medium tracking-widest uppercase italic">The Lumina Studio Experience</p>
                                    </div>
                                    <button onClick={downloadPDF} className="bg-white text-black px-16 py-8 rounded-[40px] font-black uppercase text-base flex items-center gap-6 hover:scale-105 active:scale-95 transition-all shadow-[0_30px_60px_rgba(255,255,255,0.1)]"><FileDown className="w-8 h-8" /> DOWNLOAD E-BOOK HD</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="fixed bottom-12 right-12 w-80 bg-[#050510]/95 backdrop-blur-3xl border border-white/5 p-10 rounded-[45px] flex flex-col gap-6 z-50 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <span className="text-[10px] font-black uppercase tracking-[4px] text-white/20 italic">Visual Monitor G16</span>
                            <div className="flex gap-1.5">
                                <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse"></span>
                                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse delay-100"></span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {debugLogs.map((l, i) => <div key={i} className="text-[11px] font-bold text-white/30 font-mono flex gap-4 leading-none"><span className="text-purple-600">»</span> {l}</div>)}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

function TabButton({ icon, label, active, onClick, disabled }: any) {
    return (
        <button disabled={disabled} onClick={onClick} className={`flex items-center gap-6 py-6 px-10 rounded-3xl transition-all w-full text-left group ${active ? 'bg-white/5 text-white shadow-2xl translate-x-3' : 'text-gray-700 hover:text-white hover:bg-white/[0.03]'} ${disabled ? 'opacity-10' : ''}`}>
            <span className={`w-7 h-7 transition-colors ${active ? 'text-purple-500' : 'group-hover:text-purple-500/50'}`}>{icon}</span>
            <span className="hidden md:inline text-[11px] uppercase font-black tracking-[4px]">{label}</span>
        </button>
    );
}
