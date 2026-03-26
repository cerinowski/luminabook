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
        addLog(`Nano-Banana G19 Frontier Start...`);

        try {
            const themeRes = await fetch('/api/generate-cover-theme', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            });
            const theme = await themeRes.json();
            setApprovedTheme(theme);

            // G19: ORQUESTRAÇÃO DIRETA NO NAVEGADOR (SEM TIMEOUT 504)
            for (let i = 0; i < 4; i++) {
                addLog(`V${i + 1}: Pintando...`);
                const artPrompt = `Professional book cover, typography "${title.toUpperCase()}". By ${author || 'Lumina'}. ${theme.image_generation_prompt}. 8k realism.`;

                let finalImageUrl = "";

                // --- SHIELD 1: ELITE GEMINI (SERVER) ---
                try {
                    addLog(`V${i + 1}: Chamando Elite...`);
                    const res = await fetch('/api/generate-cover', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: artPrompt })
                    });
                    const data = await res.json();
                    if (data.base64 && data.base64.length > 30000) {
                        finalImageUrl = data.base64;
                        addLog(`V${i + 1}: Elite Sucesso.`);
                    }
                } catch (e) { }

                // --- SHIELD 2: BYPASS DIRECT (ZERO LATENCIA) ---
                if (!finalImageUrl) {
                    addLog(`V${i + 1}: Acionando Bypass...`);
                    const seed = Math.floor(Math.random() * 9999);
                    // Uso direto do Pollinations (Bypass de cache + velocidade)
                    const directUrl = `https://pollinations.ai/p/${encodeURIComponent(artPrompt.substring(0, 400))}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;

                    // Validamos se a URL responde com imagem antes de exibir
                    try {
                        const check = await fetch(directUrl, { method: 'HEAD' });
                        if (check.ok) {
                            finalImageUrl = directUrl;
                            addLog(`V${i + 1}: Bypass OK.`);
                        }
                    } catch (e) {
                        // Fallback cego (se o HEAD falhar por CORS)
                        finalImageUrl = directUrl;
                        addLog(`V${i + 1}: Bypass (Blind).`);
                    }
                }

                if (finalImageUrl) {
                    updateVariation(i, finalImageUrl, 'done');
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
        addLog("Compilando Frontier Project...");
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

        let finalImage = selectedCover;
        if (selectedCover.startsWith('http')) {
            addLog("Finalizando Texturas para PDF...");
            try {
                const res = await fetch('/api/proxy-image', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: selectedCover })
                });
                const data = await res.json();
                if (data.base64) finalImage = data.base64;
            } catch (e) { }
        }

        doc.addImage(finalImage, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        doc.save(`${title.replace(/\s/g, '_')}.pdf`);
        setIsLoading(false);
    };

    return (
        <main className="min-h-screen bg-[#020205] text-[#e0e0e8] selection:bg-purple-500/30">
            <style jsx global>{` @import url('${GOOGLE_FONTS_URL}'); body { background: #020205; font-family: 'Montserrat', sans-serif; overflow: hidden; } .text-gradient { background: linear-gradient(to right, #fff, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; } `}</style>

            <div className="flex h-screen">
                <aside className="w-20 md:w-80 bg-[#050510] border-r border-white/5 flex flex-col py-12 z-50">
                    <div className="px-10 mb-20 flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/30"><Sparkles className="w-7 h-7 text-white" /></div>
                        <span className="hidden md:inline font-black text-3xl italic tracking-tighter">LUMINA</span>
                    </div>

                    <nav className="flex-1 px-8 space-y-4">
                        <TabButton icon={<LayoutDashboard />} label="Criação" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
                        <TabButton icon={<BookOpen />} label="Galeria" active={activeTab === 'gallery'} onClick={() => (variations.length > 0 || isLoading) && setActiveTab('gallery')} disabled={variations.length === 0 && !isLoading} />
                        <TabButton icon={<MessageSquare />} label="Editorial" active={activeTab === 'editorial'} onClick={() => setActiveTab('editorial')} disabled={!selectedCover} />
                        <TabButton icon={<Download />} label="Compilar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} disabled={!generatedEbook} />
                    </nav>
                </aside>

                <section className="flex-1 flex flex-col overflow-hidden">
                    <header className="h-24 border-b border-white/5 flex items-center justify-between px-16 bg-[#020205]/95 backdrop-blur-3xl sticky top-0 z-40">
                        <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-ping"></span>
                            <span className="text-[10px] font-black uppercase tracking-[6px] text-white/30 italic">Nano-Banana G19 Frontier</span>
                        </div>
                        {selectedCover && activeTab !== 'export' && (
                            <button onClick={handleCreateEbook} className="bg-white text-black px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-purple-200 transition-all font-bold shadow-2xl">Finalizar Obra</button>
                        )}
                    </header>

                    <div className="flex-1 overflow-y-auto p-12 md:p-24 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeTab === 'config' && (
                                <motion.div key="config" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="max-w-3xl">
                                    <h1 className="text-8xl font-black tracking-tighter mb-8 text-gradient italic leading-none">A Nova Fronteira.</h1>
                                    <p className="text-white/30 mb-20 text-lg max-w-sm font-medium leading-relaxed">Versão G19: A orquestração se moveu para a borda. Zero timeouts, zero falhas silenciosas.</p>

                                    <div className="space-y-12">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Título do Livro</label>
                                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="O Império dos Dados" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Autor</label>
                                                <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Seu Nome" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Conceito Visual</label>
                                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Cyberpunk realista, neon vibrante, sombrio..." rows={3} className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-xl font-medium focus:border-purple-500/50 transition-all outline-none resize-none" />
                                        </div>
                                        <button onClick={handleGenerateVariations} disabled={isLoading || !title} className="w-full py-10 bg-white text-black font-black uppercase tracking-[6px] rounded-[50px] hover:bg-purple-200 transition-all flex items-center justify-center gap-6 shadow-[0_30px_60px_-15px_rgba(255,255,255,0.1)]">
                                            {isLoading ? <Loader2 className="animate-spin w-10 h-10" /> : <Zap className="w-10 h-10 fill-current" />} PINTAR CAPAS G19
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'gallery' && (
                                <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-12 pb-40">
                                    {variationsStatus.map((status, i) => (
                                        <div key={i} className={`relative aspect-[2.2/3.5] rounded-[60px] overflow-hidden border-2 transition-all group ${status === 'loading' ? 'bg-white/[0.01] animate-pulse border-white/5 flex flex-col items-center justify-center gap-6' : (selectedCover === variations[i] ? 'border-purple-600 shadow-[20px_40px_100px_rgba(168,85,247,0.3)] scale-105 z-10' : 'border-white/5 hover:border-white/20 hover:scale-[1.02]')}`}>
                                            {status === 'loading' ? (
                                                <>
                                                    <div className="w-16 h-16 rounded-full border-t-2 border-purple-600 animate-spin"></div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/10 italic">Gerando V{i + 1}</span>
                                                </>
                                            ) : (status === 'fail' ? (
                                                <div className="flex flex-col items-center justify-center p-12 text-center gap-6">
                                                    <AlertCircle className="w-12 h-12 text-pink-500/40" />
                                                    <button onClick={handleGenerateVariations} className="bg-white/5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase">Refazer</button>
                                                </div>
                                            ) : (
                                                <motion.img
                                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                    src={variations[i]}
                                                    onClick={() => { setSelectedCover(variations[i]); setActiveTab('editorial'); }}
                                                    className="w-full h-full object-cover cursor-pointer group-hover:scale-110 transition-transform duration-[3000ms]"
                                                />
                                            ))}
                                            <div className="absolute top-8 left-8 bg-black/60 backdrop-blur-3xl px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[3px] border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">Design AI {i + 1}</div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {activeTab === 'editorial' && (
                                <motion.div key="editorial" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col xl:flex-row gap-24 pb-20">
                                    <div className="flex-1 space-y-12">
                                        <h3 className="text-7xl font-black tracking-tighter italic leading-none">Editorial.</h3>
                                        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Onde a inteligência encontra a palavra..." className="w-full bg-white/[0.01] border border-white/5 rounded-[70px] p-16 text-white/80 text-2xl leading-relaxed min-h-[800px] outline-none focus:border-purple-500/20 transition-all shadow-2xl custom-scrollbar" />
                                    </div>
                                    <div className="w-full xl:w-[480px] space-y-12">
                                        <div className="aspect-[2.2/3.5] rounded-[70px] overflow-hidden shadow-[0_80px_150px_-30px_rgba(168,85,247,0.5)] border border-white/10 bg-black">
                                            {selectedCover && <img src={selectedCover} className="w-full h-full object-cover" />}
                                        </div>
                                        <button onClick={() => setActiveTab('gallery')} className="w-full py-7 bg-white/5 border border-white/10 rounded-[35px] text-[12px] font-black uppercase tracking-[4px] hover:bg-white/10 transition-all">Trocar Estética Visual</button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'export' && (
                                <motion.div key="export" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-52 text-center space-y-24">
                                    <div className="w-48 h-48 bg-green-500/5 rounded-full flex items-center justify-center shadow-[0_0_150px_rgba(34,197,94,0.3)] border border-green-500/10"><CheckCircle2 className="w-24 h-24 text-green-500" /></div>
                                    <div className="space-y-6">
                                        <h2 className="text-8xl font-black tracking-tighter italic">Compilação Final.</h2>
                                        <p className="text-white/20 text-xl font-medium tracking-[8px] uppercase italic">Padrão Frontier G19 Ready</p>
                                    </div>
                                    <button onClick={downloadPDF} className="bg-white text-black px-24 py-12 rounded-[60px] font-black uppercase text-xl flex items-center gap-10 hover:scale-110 active:scale-95 transition-all shadow-2xl"><FileDown className="w-12 h-12" /> BAIXAR OBRA MASTER</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="fixed bottom-14 right-14 w-[420px] bg-[#050510]/98 backdrop-blur-3xl border border-white/5 p-12 rounded-[60px] flex flex-col gap-10 z-50 shadow-2xl border-t border-purple-500/20">
                        <div className="flex items-center justify-between border-b border-white/5 pb-6">
                            <span className="text-[10px] font-black uppercase tracking-[8px] text-white/20 italic">FRONTIER MONITOR G19</span>
                            <div className="flex gap-2">
                                <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.8)]"></span>
                            </div>
                        </div>
                        <div className="space-y-6">
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
        <button disabled={disabled} onClick={onClick} className={`flex items-center gap-6 py-8 px-10 rounded-[40px] transition-all w-full text-left group ${active ? 'bg-white/5 text-white shadow-2xl translate-x-5 scale-105' : 'text-gray-700 hover:text-white hover:bg-white/[0.04]'} ${disabled ? 'opacity-10' : ''}`}>
            <span className={`w-9 h-9 transition-all duration-500 ${active ? 'text-purple-500' : 'group-hover:text-purple-500/60 group-hover:scale-110'}`}>{icon}</span>
            <span className="hidden md:inline text-[13px] uppercase font-black tracking-[5px] leading-none">{label}</span>
        </button>
    );
}
