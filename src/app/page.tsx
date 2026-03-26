'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Upload, Loader2, FileDown, BookOpen, ChevronLeft, CreditCard, LayoutDashboard, Palette, Type, MessageSquare, Download, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';

// Fontes de Luxo
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;700;900&display=swap";

// --- MOTOR DE SEGURANÇA (GRADIENTE) ---
async function generateTypographyLayer(bgUrl: string | null, config: any): Promise<string> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 800; canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve("");

        const renderText = (loadedImg: HTMLImageElement | null) => {
            if (loadedImg) {
                const scale = Math.max(800 / loadedImg.width, 1200 / loadedImg.height);
                const x = (800 - loadedImg.width * scale) / 2;
                const y = (1200 - loadedImg.height * scale) / 2;
                ctx.drawImage(loadedImg, x, y, loadedImg.width * scale, loadedImg.height * scale);
            } else {
                const bgGrad = ctx.createLinearGradient(0, 0, 800, 1200);
                bgGrad.addColorStop(0, config.primary || '#050510');
                bgGrad.addColorStop(1, config.secondary || '#300a2e');
                ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, 800, 1200);
                ctx.fillStyle = '#FFFFFF';
                ctx.font = "bold 60px Montserrat";
                ctx.textAlign = 'center';
                ctx.fillText(config.title?.toUpperCase() || 'LUMINA', 400, 600);
            }
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };

        if (!bgUrl) return renderText(null);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => renderText(img);
        img.onerror = () => renderText(null);
        img.src = bgUrl;
    });
}

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
        addLog(`Nano-Banana G10 Arch-Shield Start...`);

        try {
            const themeRes = await fetch('/api/generate-cover-theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            });
            const theme = await themeRes.json();
            setApprovedTheme(theme);

            for (let i = 0; i < 4; i++) {
                addLog(`Desenhando Capa ${i + 1}...`);
                const artPrompt = `${theme.image_generation_prompt}. Book title "${title.toLowerCase()}" in cinematic 3D lighting. 8k resolution.`;

                try {
                    // TENTATIVA 1: SERVIDOR (ELITE)
                    addLog(`V${i + 1}: Chamando Nano-Server...`);
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
                    throw new Error("Server Block/Timeout");
                } catch (e) {
                    // TENTATIVA 2: CLIENT-SIDE EMERGENCY (BROWSER BYPASS)
                    addLog(`V${i + 1}: Acionando Blindagem Browser...`);
                    try {
                        const seed = Math.floor(Math.random() * 99999);
                        const browserUrl = `https://pollinations.ai/p/${encodeURIComponent(artPrompt)}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;

                        // Validamos se a imagem carrega no browser
                        const checkImg = new Image();
                        checkImg.src = browserUrl;
                        await new Promise((resolve, reject) => {
                            checkImg.onload = resolve;
                            checkImg.onerror = reject;
                            setTimeout(reject, 10000); // 10s timeout
                        });

                        addLog(`V${i + 1}: Sucesso via Browser-Shield`);
                        updateVariation(i, browserUrl, 'done');
                    } catch (err) {
                        addLog(`V${i + 1}: Usando Gradiente de Segurança`);
                        const grad = await generateTypographyLayer(null, { title, author, primary: theme.primary_color, secondary: theme.secondary_color });
                        updateVariation(i, grad, 'fail');
                    }
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
        addLog("Compilando eBook Profissional...");
        try {
            const res = await fetch('/api/generate-ebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, approvedTitle: title, approvedTheme, approvedAuthor: author, description }),
            });
            const data = await res.json();
            setGeneratedEbook(data);
        } catch (e) { addLog("Erro na diagramação."); }
        finally { setIsLoading(false); }
    };

    const downloadPDF = async () => {
        if (!generatedEbook || !selectedCover) return;
        setIsLoading(true);
        const doc = new jsPDF();

        // Se a capa for uma URL externa, precisamos converter para Base64 para o PDF do jsPDF
        let finalImage = selectedCover;
        if (selectedCover.startsWith('http')) {
            addLog("Otimizando imagem para PDF...");
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = selectedCover;
                await new Promise((res) => { img.onload = res; img.onerror = res; });
                canvas.width = img.width; canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);
                finalImage = canvas.toDataURL('image/jpeg', 0.95);
            } catch (e) { }
        }

        doc.addImage(finalImage, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        doc.save(`${title.replace(/\s/g, '_')}.pdf`);
        setIsLoading(false);
    };

    return (
        <main className="min-h-screen flex bg-[#050510] text-white">
            <style jsx global>{` @import url('${GOOGLE_FONTS_URL}'); body { background: #050510; font-family: 'Montserrat', sans-serif; } `}</style>

            <aside className="w-20 md:w-64 bg-[#0a0a1f] border-r border-white/5 flex flex-col items-center py-8 gap-10">
                <div className="flex items-center gap-3 px-6 w-full mb-4 cursor-pointer" onClick={() => window.location.reload()}>
                    <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="hidden md:inline font-black tracking-tighter text-xl italic">LUMINA</span>
                </div>
                <nav className="flex-1 flex flex-col gap-2 w-full px-4">
                    <TabButton icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
                    <TabButton icon={<BookOpen />} label="Capas AI" active={activeTab === 'gallery'} onClick={() => variations.length > 0 && setActiveTab('gallery')} disabled={variations.length === 0 && !isLoading} />
                    <TabButton icon={<MessageSquare />} label="Conteúdo" active={activeTab === 'editorial'} onClick={() => setActiveTab('editorial')} disabled={!selectedCover} />
                    <TabButton icon={<Download />} label="Exportar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} disabled={!generatedEbook} />
                </nav>
            </aside>

            <section className="flex-1 flex flex-col relative overflow-hidden">
                <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-[#050510]/80 backdrop-blur-xl z-20">
                    <h2 className="text-sm font-black uppercase tracking-[4px] text-white/40">{activeTab}</h2>
                    {selectedCover && activeTab !== 'export' && (
                        <button onClick={handleCreateEbook} className="bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all shadow-xl">Processar E-book</button>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto p-6 md:p-12">
                    <AnimatePresence mode="wait">
                        {activeTab === 'config' && (
                            <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-xl space-y-8">
                                <h3 className="text-4xl font-black tracking-tighter text-gradient">Nano-Banana G10</h3>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Título Profissional</label>
                                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: A Arte da Guerra Moderna" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-lg font-bold outline-none focus:border-purple-500 transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Autor</label>
                                        <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Seu Nome" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-lg font-bold outline-none focus:border-purple-500 transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Conceito (O que a IA vai desenhar?)</label>
                                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Épico, futurista, minimalista..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-base font-medium outline-none focus:border-purple-500 transition-all resize-none" />
                                    </div>
                                    <button onClick={handleGenerateVariations} disabled={isLoading || !title} className="w-full py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-purple-200 transition-all flex items-center justify-center gap-3 shadow-2xl">
                                        {isLoading ? <Loader2 className="animate-spin" /> : <Zap className="w-5 h-5 fill-current" />} Gerar Estilos G10
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'gallery' && (
                            <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {variationsStatus.map((status, i) => (
                                        <div key={i} className={`relative aspect-[2/3] rounded-2xl overflow-hidden border-2 transition-all ${status === 'loading' ? 'bg-white/5 animate-pulse border-white/10 flex items-center justify-center' : (selectedCover === variations[i] ? 'border-purple-500 shadow-2xl' : 'border-white/5')}`}>
                                            {status === 'loading' ? (
                                                <div className="text-center space-y-2">
                                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-500/40" />
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Processando V{i + 1}...</span>
                                                </div>
                                            ) : (
                                                <motion.img
                                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                    src={variations[i]}
                                                    onClick={() => { setSelectedCover(variations[i]); setActiveTab('editorial'); }}
                                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                />
                                            )}
                                            {status === 'fail' && (
                                                <div className="absolute top-2 right-2"><AlertCircle className="w-4 h-4 text-pink-500" /></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'editorial' && (
                            <motion.div key="editorial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row gap-12">
                                <div className="flex-1 space-y-6">
                                    <h3 className="text-3xl font-black tracking-tighter">Projeto Editorial</h3>
                                    <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Escreva ou cole o conteúdo do seu e-book aqui..." className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-white/80 text-sm leading-relaxed min-h-[500px] outline-none focus:border-purple-500/30 transition-all custom-scrollbar" />
                                </div>
                                <div className="w-full lg:w-[320px] sticky top-0 bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6">
                                    <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black">
                                        {selectedCover && <img src={selectedCover} className="w-full h-full object-cover" />}
                                    </div>
                                    <button onClick={() => setActiveTab('gallery')} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10">Trocar Design</button>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'export' && (
                            <motion.div key="export" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center space-y-8">
                                <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.2)]"><CheckCircle2 className="w-12 h-12 text-green-500" /></div>
                                <h3 className="text-4xl font-black tracking-tighter">Seu E-book está pronto!</h3>
                                <button onClick={downloadPDF} className="bg-white text-black px-12 py-5 rounded-2xl font-black uppercase shadow-2xl hover:scale-105 transition-all flex items-center gap-3"><FileDown className="w-5 h-5" /> Baixar em Alta Resolução</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {debugLogs.length > 0 && (
                    <div className="fixed bottom-6 right-6 w-80 bg-black/90 backdrop-blur-3xl border border-white/10 p-5 rounded-3xl flex-col gap-3 z-50 flex shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <span className="text-[10px] font-black tracking-[2px] text-white/40 uppercase">G10 Arch-Shield Monitor</span>
                        </div>
                        {debugLogs.map((l, i) => <div key={i} className="text-[10px] font-medium text-white/60 font-mono flex gap-2"><span className="text-purple-500 font-bold">●</span> {l}</div>)}
                    </div>
                )}
            </section>
        </main>
    );
}

function TabButton({ icon, label, active, onClick, disabled }: any) {
    return (
        <button disabled={disabled} onClick={onClick} className={`flex items-center gap-4 py-4 px-6 rounded-2xl transition-all w-full text-left group ${active ? 'bg-purple-600/20 text-white shadow-inner font-bold' : 'text-gray-500 hover:text-white hover:bg-white/5 opacity-50 grayscale hover:opacity-100'}`}>
            <span className={`w-5 h-5 ${active ? 'text-purple-400' : 'group-hover:text-white'}`}>{icon}</span>
            <span className="hidden md:inline text-[10px] uppercase font-black tracking-widest">{label}</span>
        </button>
    );
}
