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
        addLog(`Nano-Banana G11 Real-World Start...`);

        try {
            const themeRes = await fetch('/api/generate-cover-theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            });
            const theme = await themeRes.json();
            setApprovedTheme(theme);

            for (let i = 0; i < 4; i++) {
                addLog(`Iniciando Estilo ${i + 1}...`);
                // PROMPT ULTRA OTMIZADO PARA O NANO-BANANA
                const artPrompt = `Book cover art, cinematic 3d typography reading "${title.toUpperCase()}". Author "${author.toUpperCase()}". ${theme.image_generation_prompt}. High-end publication quality, 8k.`;

                try {
                    // TENTATIVA 1: SERVIDOR (ELITE BASE64)
                    const res = await fetch('/api/generate-cover', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: artPrompt })
                    });
                    const data = await res.json();

                    if (data.base64 && !data.error) {
                        addLog(`${data.engine || 'Engine'} OK`);
                        updateVariation(i, data.base64, 'done');
                        continue;
                    }
                } catch (e) { }

                // TENTATIVA 2: BROWSER DIRECT (THE UNBREAKABLE PATH)
                // Se o servidor falhou, entregamos o link direto. O browser cuida do resto.
                addLog(`V${i + 1}: Usando Nano-Direct (Browser)...`);
                const seed = Math.floor(Math.random() * 999999);
                const directUrl = `https://pollinations.ai/p/${encodeURIComponent(artPrompt)}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;
                updateVariation(i, directUrl, 'done');
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
        addLog("Compilando eBook...");
        try {
            const res = await fetch('/api/generate-ebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            addLog("Processando capa para PDF...");
            try {
                // Proxy fallback para download do PDF (evita CORS total no PDF)
                const res = await fetch('/api/proxy-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: selectedCover })
                });
                const data = await res.json();
                if (data.base64) finalImage = data.base64;
            } catch (e) { addLog("Aviso: Baixando capa em baixa resolução."); }
        }

        doc.addImage(finalImage, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        doc.save(`${title.replace(/\s/g, '_')}.pdf`);
        setIsLoading(false);
    };

    return (
        <main className="min-h-screen bg-[#050510] text-white selection:bg-purple-500/30">
            <style jsx global>{` @import url('${GOOGLE_FONTS_URL}'); body { background: #050510; font-family: 'Montserrat', sans-serif; overflow-x: hidden; } `}</style>

            <div className="flex min-h-screen">
                <aside className="w-20 md:w-64 bg-[#0a0a1f] border-r border-white/5 flex flex-col py-8 z-50">
                    <div className="px-6 mb-12 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="hidden md:inline font-black text-xl italic tracking-tighter">LUMINA</span>
                    </div>

                    <nav className="flex-1 px-4 space-y-2">
                        <TabButton icon={<LayoutDashboard />} label="Criação" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
                        <TabButton icon={<BookOpen />} label="Galeria" active={activeTab === 'gallery'} onClick={() => variations.length > 0 && setActiveTab('gallery')} disabled={variations.length === 0 && !isLoading} />
                        <TabButton icon={<MessageSquare />} label="Escrita" active={activeTab === 'editorial'} onClick={() => setActiveTab('editorial')} disabled={!selectedCover} />
                        <TabButton icon={<Download />} label="Finalizar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} disabled={!generatedEbook} />
                    </nav>
                </aside>

                <section className="flex-1 flex flex-col">
                    <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-[#050510]/80 backdrop-blur-xl sticky top-0 z-40">
                        <span className="text-[10px] font-black uppercase tracking-[4px] text-white/20">Engine: Nano-Banana G11</span>
                        {selectedCover && activeTab !== 'export' && (
                            <button onClick={handleCreateEbook} className="bg-white text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-purple-200 transition-all">Gerar E-Book</button>
                        )}
                    </header>

                    <div className="flex-1 p-6 md:p-12">
                        <AnimatePresence mode="wait">
                            {activeTab === 'config' && (
                                <motion.div key="config" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl">
                                    <h1 className="text-5xl font-black tracking-tighter mb-4 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent italic">Nano-Banana G11</h1>
                                    <p className="text-white/40 mb-12 text-sm max-w-md font-medium">Motor de inteligência pura. Crie capas cinematográficas instantaneamente.</p>

                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Título da Obra</label>
                                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: O Código da Mente" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-bold focus:border-purple-500 transition-all outline-none shadow-2xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Seu Nome</label>
                                            <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Autor da Obra" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-bold focus:border-purple-500 transition-all outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Visão Artística</label>
                                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o estilo (Ex: Épico, minimalista, neon...)" rows={3} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg font-medium focus:border-purple-500 transition-all outline-none resize-none" />
                                        </div>
                                        <button onClick={handleGenerateVariations} disabled={isLoading || !title} className="w-full py-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-purple-500/20">
                                            {isLoading ? <Loader2 className="animate-spin" /> : <Zap className="w-6 h-6 fill-current" />} PINTAR CAPAS G11
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'gallery' && (
                                <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                        {variationsStatus.map((status, i) => (
                                            <div key={i} className={`relative aspect-[2/3] rounded-3xl overflow-hidden border-2 transition-all group ${status === 'loading' ? 'bg-white/5 animate-pulse border-white/10 flex flex-col items-center justify-center gap-4' : (selectedCover === variations[i] ? 'border-purple-500 shadow-2xl scale-105' : 'border-white/5 hover:border-white/20')}`}>
                                                {status === 'loading' ? (
                                                    <>
                                                        <RefreshCw className="w-8 h-8 animate-spin text-purple-500/40" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">V{i + 1}: Desenhando...</span>
                                                    </>
                                                ) : (
                                                    <motion.img
                                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                        src={variations[i]}
                                                        onClick={() => { setSelectedCover(variations[i]); setActiveTab('editorial'); }}
                                                        className="w-full h-full object-cover cursor-pointer transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                )}
                                                <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/10">Estilo {i + 1}</div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'editorial' && (
                                <motion.div key="editorial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row gap-12">
                                    <div className="flex-1 space-y-6">
                                        <h3 className="text-4xl font-black tracking-tighter italic">Projeto Editorial</h3>
                                        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Comece a escrever sua história aqui..." className="w-full bg-white/5 border border-white/10 rounded-[40px] p-10 text-white/90 text-lg leading-relaxed min-h-[600px] outline-none focus:border-purple-500/40 transition-all shadow-inner custom-scrollbar" />
                                    </div>
                                    <div className="w-full lg:w-[350px] space-y-8">
                                        <div className="aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(100,0,255,0.3)] border border-white/10 bg-black">
                                            {selectedCover && <img src={selectedCover} className="w-full h-full object-cover" />}
                                        </div>
                                        <button onClick={() => setActiveTab('gallery')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Alterar Design</button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'export' && (
                                <motion.div key="export" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center space-y-8">
                                    <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.3)]"><CheckCircle2 className="w-12 h-12 text-green-500" /></div>
                                    <h2 className="text-5xl font-black tracking-tighter">Sua obra está pronta!</h2>
                                    <button onClick={downloadPDF} className="bg-white text-black px-12 py-6 rounded-3xl font-black uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 text-sm"><FileDown className="w-6 h-6" /> BAIXAR E-BOOK HD</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {debugLogs.length > 0 && (
                        <div className="fixed bottom-8 right-8 w-80 bg-black/90 backdrop-blur-2xl border border-white/10 p-6 rounded-[32px] flex flex-col gap-3 z-50 shadow-2xl">
                            <span className="text-[10px] font-black tracking-[3px] text-white/20 uppercase border-b border-white/5 pb-2">G11 REAL-WORLD MONITOR</span>
                            <div className="space-y-2">
                                {debugLogs.map((l, i) => <div key={i} className="text-[10px] font-medium text-white/50 font-mono flex gap-3"><span className="text-purple-500 font-bold">●</span> {l}</div>)}
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
        <button disabled={disabled} onClick={onClick} className={`flex items-center gap-4 py-4 px-6 rounded-2xl transition-all w-full text-left group ${active ? 'bg-white/10 text-white shadow-xl translate-x-2 font-black' : 'text-gray-600 hover:text-white hover:bg-white/5'} ${disabled ? 'opacity-10 cursor-not-allowed' : 'opacity-100'}`}>
            <span className={`w-5 h-5 transition-colors ${active ? 'text-purple-400' : 'group-hover:text-purple-400'}`}>{icon}</span>
            <span className="hidden md:inline text-[10px] uppercase font-black tracking-[2px]">{label}</span>
        </button>
    );
}
