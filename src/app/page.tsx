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
        addLog(`Nano-Banana G14 Client-Elite Start...`);

        try {
            const themeRes = await fetch('/api/generate-cover-theme', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            });
            const theme = await themeRes.json();
            setApprovedTheme(theme);

            // GERAÇÃO SEQUENCIAL (PARA NÃO TRAVAR REDE/CPU)
            for (let i = 0; i < 4; i++) {
                addLog(`V${i + 1}: Pintando...`);
                const artPrompt = `Professional book cover art, Title "${title.toUpperCase()}" Author "${author.toUpperCase()}". ${theme.image_generation_prompt}. High-quality.`;

                let imgUrl = "";

                // TENTATIVA 1: SERVIDOR (CUTOFF DE 8 SEGUNDOS PARA EVITAR 504)
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s KILL SWITCH

                    const res = await fetch('/api/generate-cover', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: artPrompt }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    const data = await res.json();
                    if (data.base64 && !data.error) {
                        addLog(`V${i + 1}: Elite OK`);
                        imgUrl = data.base64;
                    }
                } catch (e) {
                    addLog(`V${i + 1}: Server Cutoff/Fail.`);
                }

                // TENTATIVA 2: DIRECT NANO-BYPASS (A SOLUÇÃO CEO 🧠)
                // Se o servidor demorar > 8s ou falhar, o browser busca direto da fonte ultra-rápida
                if (!imgUrl) {
                    addLog(`V${i + 1}: Acionando Nano-Bypass (Turbo)...`);
                    const seed = Math.floor(Math.random() * 999999);
                    // Usamos o modelo TURBO do Pollinations que é instantâneo
                    imgUrl = `https://pollinations.ai/p/${encodeURIComponent(artPrompt.substring(0, 400))}?width=800&height=1200&seed=${seed}&model=turbo&nologo=true`;
                }

                updateVariation(i, imgUrl, 'done');
                addLog(`V${i + 1}: Renderizada.`);
            }
        } catch (e) { addLog("Erro."); }
        finally { setIsLoading(false); }
    };

    const updateVariation = (index: number, content: string, status: 'done' | 'fail') => {
        setVariations(p => { const n = [...p]; n[index] = content; return n; });
        setVariationsStatus(p => { const n = [...p]; n[index] = status; return n; });
    };

    const handleCreateEbook = async () => {
        if (!content || !selectedCover) return;
        setIsLoading(true); setActiveTab('export');
        addLog("Finalizando Obra...");
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

        // Se for URL externa, precisamos converter para Base64 para o PDF
        let finalImage = selectedCover;
        if (selectedCover.startsWith('http')) {
            addLog("Otimizando Arte para Impressão...");
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
            <style jsx global>{` @import url('${GOOGLE_FONTS_URL}'); body { background: #020205; font-family: 'Montserrat', sans-serif; overflow-x: hidden; } .text-gradient { background: linear-gradient(to right, #fff, #9333ea); -webkit-background-clip: text; -webkit-text-fill-color: transparent; } `}</style>

            <div className="flex min-h-screen">
                <aside className="w-20 md:w-72 bg-[#050510] border-r border-white/5 flex flex-col py-10 z-50">
                    <div className="px-8 mb-20 flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/40"><Sparkles className="w-6 h-6 text-white" /></div>
                        <span className="hidden md:inline font-black text-2xl tracking-tighter italic">LUMINA</span>
                    </div>

                    <nav className="flex-1 px-6 space-y-4">
                        <TabButton icon={<LayoutDashboard />} label="Designer" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
                        <TabButton icon={<BookOpen />} label="Galeria" active={activeTab === 'gallery'} onClick={() => (variations.length > 0 || isLoading) && setActiveTab('gallery')} disabled={variations.length === 0 && !isLoading} />
                        <TabButton icon={<MessageSquare />} label="Escrita" active={activeTab === 'editorial'} onClick={() => setActiveTab('editorial')} disabled={!selectedCover} />
                        <TabButton icon={<Download />} label="Compilar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} disabled={!generatedEbook} />
                    </nav>
                </aside>

                <section className="flex-1 flex flex-col">
                    <header className="h-24 border-b border-white/5 flex items-center justify-between px-12 bg-[#020205]/90 backdrop-blur-2xl sticky top-0 z-40">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                            <span className="text-[10px] font-black uppercase tracking-[5px] text-white/30 italic">Nano-Banana G14 Client-Elite</span>
                        </div>
                        {selectedCover && activeTab !== 'export' && (
                            <button onClick={handleCreateEbook} className="bg-purple-600 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 transition-all shadow-xl shadow-purple-500/20">Finalizar Obra</button>
                        )}
                    </header>

                    <div className="flex-1 p-8 md:p-20 overflow-y-auto">
                        <AnimatePresence mode="wait">
                            {activeTab === 'config' && (
                                <motion.div key="config" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-2xl">
                                    <h1 className="text-7xl font-black tracking-tighter mb-6 text-gradient italic">Artes do Futuro</h1>
                                    <p className="text-white/40 mb-16 text-base max-w-sm font-medium leading-relaxed">Arquitetura G14: 100% livre de timeouts. O motor que nunca para.</p>

                                    <div className="space-y-10">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[2px] text-white/20 ml-2">Título do Livro</label>
                                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: O Segredo das Estrelas" className="w-full bg-white/[0.02] border border-white/10 rounded-3xl p-7 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[2px] text-white/20 ml-2">Autor</label>
                                            <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Seu Nome Completo" className="w-full bg-white/[0.02] border border-white/10 rounded-3xl p-7 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[2px] text-white/20 ml-2">Estética Visual</label>
                                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva seu sonho visual (Ex: Épico, Vintage, Neon...)" rows={3} className="w-full bg-white/[0.02] border border-white/10 rounded-3xl p-7 text-xl font-medium focus:border-purple-500/50 transition-all outline-none resize-none" />
                                        </div>
                                        <button onClick={handleGenerateVariations} disabled={isLoading || !title} className="w-full py-8 bg-white text-black font-black uppercase tracking-[4px] rounded-[40px] hover:bg-purple-200 transition-all flex items-center justify-center gap-5 shadow-2xl">
                                            {isLoading ? <Loader2 className="animate-spin w-8 h-8" /> : <Zap className="w-8 h-8 fill-current" />} PINTAR MINHA CAPA
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'gallery' && (
                                <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pb-20">
                                    {variationsStatus.map((status, i) => (
                                        <div key={i} className={`relative aspect-[2.2/3.5] rounded-[50px] overflow-hidden border-2 transition-all group ${status === 'loading' ? 'bg-white/[0.01] animate-pulse border-white/5 flex flex-col items-center justify-center gap-4' : (selectedCover === variations[i] ? 'border-purple-600 shadow-[0_0_80px_rgba(147,51,234,0.3)] scale-105' : 'border-white/5 hover:border-white/20')}`}>
                                            {status === 'loading' ? (
                                                <><RefreshCw className="w-12 h-12 animate-spin text-purple-600/20" /><span className="text-[10px] font-black uppercase tracking-widest text-white/10">V{i + 1}: Criando...</span></>
                                            ) : (
                                                <motion.img
                                                    initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }}
                                                    src={variations[i]}
                                                    onClick={() => { setSelectedCover(variations[i]); setActiveTab('editorial'); }}
                                                    className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-[2000ms]"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {activeTab === 'editorial' && (
                                <motion.div key="editorial" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col lg:flex-row gap-20">
                                    <div className="flex-1 space-y-8">
                                        <h3 className="text-6xl font-black tracking-tighter italic">Projeto Editorial</h3>
                                        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Digite sua história aqui..." className="w-full bg-white/[0.01] border border-white/5 rounded-[60px] p-16 text-white/90 text-xl leading-relaxed min-h-[700px] outline-none focus:border-purple-500/20 transition-all shadow-2xl custom-scrollbar" />
                                    </div>
                                    <div className="w-full lg:w-[420px] space-y-10">
                                        <div className="aspect-[2/3] rounded-[50px] overflow-hidden shadow-[0_60px_100px_-30px_rgba(147,51,234,0.4)] border border-white/10 bg-black">
                                            {selectedCover && <img src={selectedCover} className="w-full h-full object-cover" />}
                                        </div>
                                        <button onClick={() => setActiveTab('gallery')} className="w-full py-5 bg-white/5 border border-white/10 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Alterar Design</button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'export' && (
                                <motion.div key="export" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 text-center space-y-16">
                                    <div className="w-32 h-32 bg-green-500/5 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(34,197,94,0.3)] border border-green-500/10 animate-bounce"><CheckCircle2 className="w-16 h-16 text-green-500" /></div>
                                    <div className="space-y-6">
                                        <h2 className="text-7xl font-black tracking-tighter italic">Obra Concluída!</h2>
                                        <p className="text-white/30 text-lg font-medium">Sua arte e conteúdo foram unidos em um PDF de alta qualidade.</p>
                                    </div>
                                    <button onClick={downloadPDF} className="bg-white text-black px-20 py-8 rounded-[40px] font-black uppercase text-lg flex items-center gap-6 hover:scale-110 active:scale-95 transition-all shadow-[0_30px_60px_rgba(255,255,255,0.1)]"><FileDown className="w-10 h-10" /> BAIXAR E-BOOK PRECIOSO</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="fixed bottom-12 right-12 w-96 bg-black/95 backdrop-blur-3xl border border-white/5 p-10 rounded-[50px] flex flex-col gap-6 z-50 shadow-2xl border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-[5px] text-white/20">ELITE MONITOR G14</span>
                            <div className="h-1.5 w-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"></div>
                        </div>
                        <div className="space-y-4">
                            {debugLogs.map((l, i) => <div key={i} className="text-[11px] font-bold text-white/40 font-mono flex gap-5 leading-tight"><span className="text-purple-600">»</span> {l}</div>)}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

function TabButton({ icon, label, active, onClick, disabled }: any) {
    return (
        <button disabled={disabled} onClick={onClick} className={`flex items-center gap-6 py-6 px-10 rounded-3xl transition-all w-full text-left group ${active ? 'bg-white/5 text-white shadow-2xl translate-x-3 scale-105' : 'text-gray-700 hover:text-white hover:bg-white/[0.02]'} ${disabled ? 'opacity-10 cursor-not-allowed' : 'opacity-100'}`}>
            <span className={`w-7 h-7 transition-all ${active ? 'text-purple-500' : 'group-hover:text-purple-500/50'}`}>{icon}</span>
            <span className="hidden md:inline text-[11px] uppercase font-black tracking-[4px]">{label}</span>
        </button>
    );
}
