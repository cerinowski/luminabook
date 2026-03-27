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

    // G21: Single Image Mode
    const [cover, setCover] = useState<string | null>(null);
    const [coverStatus, setCoverStatus] = useState<'idle' | 'loading' | 'done' | 'fail'>('idle');

    const [selectedPalette, setSelectedPalette] = useState('Cyberpunk');
    const [selectedFont, setSelectedFont] = useState('Classic Serif');
    const [selectedLayout, setSelectedLayout] = useState('Impact');

    const [approvedTheme, setApprovedTheme] = useState<any>(null);
    const [generatedEbook, setGeneratedEbook] = useState<any>(null);

    const addLog = (msg: string) => {
        setDebugLogs(p => [...p.slice(-10), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, _) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    };

    const handleGenerateCover = async () => {
        if (!title) return alert("Título é obrigatório!");
        setIsLoading(true);
        setActiveTab('gallery');
        setCover(null);
        setCoverStatus('loading');
        addLog(`G21 Single Path Start...`);

        try {
            const themeRes = await fetch('/api/generate-cover-theme', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, palette: selectedPalette, layout: selectedLayout }),
            });
            const theme = await themeRes.json();
            setApprovedTheme(theme);

            const artPrompt = `Professional book cover, typography "${title.toUpperCase()}". Author ${author || 'Lumina'}. Style: ${selectedPalette}, Layout: ${selectedLayout}. ${theme.image_generation_prompt}. High quality 8k realism.`;

            let finalB64 = "";

            // --- FASE 1: ELITE (CHAMADA ÚNICA) ---
            try {
                addLog(`Invocando Elite Gemini...`);
                const res = await fetch('/api/generate-cover', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: artPrompt })
                });
                const data = await res.json();
                if (data.base64 && data.base64.length > 30000) {
                    finalB64 = data.base64;
                    addLog(`Elite OK (${Math.round(data.base64.length / 1024)}KB)`);
                }
            } catch (e) { }

            // --- FASE 2: BROWSER TURBO FALLBACK ---
            if (!finalB64) {
                addLog(`Ativando Browser Turbo...`);
                try {
                    const seed = Math.floor(Math.random() * 999999);
                    const pollUrl = `https://pollinations.ai/p/${encodeURIComponent(artPrompt.substring(0, 500))}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;
                    const res = await fetch(pollUrl);
                    if (res.ok) {
                        const blob = await res.blob();
                        if (blob.size > 20000) {
                            finalB64 = await blobToBase64(blob);
                            addLog(`Turbo OK (${Math.round(blob.size / 1024)}KB)`);
                        }
                    }
                } catch (e) {
                    addLog(`Falha no Bypass.`);
                }
            }

            if (finalB64) {
                setCover(finalB64);
                setCoverStatus('done');
            } else {
                addLog(`Falha Total G21.`);
                setCoverStatus('fail');
            }
        } catch (e) { addLog("Erro Crítico."); }
        finally { setIsLoading(false); }
    };

    const handleCreateEbook = async () => {
        if (!content || !cover) return;
        setIsLoading(true); setActiveTab('export');
        addLog("Compilando Master Edition...");
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
        if (!generatedEbook || !cover) return;
        setIsLoading(true);
        const doc = new jsPDF();
        doc.addImage(cover, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        doc.save(`${title.replace(/\s/g, '_')}.pdf`);
        setIsLoading(false);
    };

    return (
        <main className="min-h-screen bg-[#020205] text-[#e0e0e8]">
            <style jsx global>{` @import url('${GOOGLE_FONTS_URL}'); body { background: #020205; font-family: 'Montserrat', sans-serif; overflow: hidden; } .text-gradient { background: linear-gradient(135deg, #fff 0%, #a855f7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; } `}</style>

            <div className="flex h-screen">
                <aside className="w-20 md:w-80 bg-[#050510] border-r border-white/5 flex flex-col py-12 z-50">
                    <div className="px-10 mb-20 flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/30"><Sparkles className="w-7 h-7 text-white" /></div>
                        <span className="hidden md:inline font-black text-3xl italic tracking-tighter">LUMINA</span>
                    </div>

                    <nav className="flex-1 px-8 space-y-4">
                        <TabButton icon={<LayoutDashboard />} label="Workshop" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
                        <TabButton icon={<Palette />} label="Design" active={activeTab === 'design'} onClick={() => setActiveTab('design')} />
                        <TabButton icon={<Type />} label="Tipografia" active={activeTab === 'typography'} onClick={() => setActiveTab('typography')} />
                        <TabButton icon={<BookOpen />} label="Galeria" active={activeTab === 'gallery'} onClick={() => (cover || isLoading) && setActiveTab('gallery')} disabled={!cover && !isLoading} />
                        <TabButton icon={<MessageSquare />} label="Escrita" active={activeTab === 'editorial'} onClick={() => setActiveTab('editorial')} disabled={!cover} />
                        <TabButton icon={<Download />} label="Finalizar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} disabled={!generatedEbook} />
                    </nav>
                </aside>

                <section className="flex-1 flex flex-col relative h-screen overflow-hidden">
                    <header className="h-24 border-b border-white/5 flex items-center justify-between px-16 bg-[#020205]/95 backdrop-blur-3xl sticky top-0 z-40">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-ping"></div>
                            <span className="text-[10px] font-black uppercase tracking-[8px] text-white/30 italic">Nano-Banana G21 Master</span>
                        </div>
                        {cover && activeTab !== 'export' && (
                            <button onClick={handleCreateEbook} className="bg-white text-black px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-purple-200 transition-all font-bold shadow-2xl">Finalizar Obra</button>
                        )}
                    </header>

                    <div className="flex-1 overflow-y-auto p-12 md:p-24 custom-scrollbar h-full">
                        <AnimatePresence mode="wait">
                            {activeTab === 'config' && (
                                <motion.div key="config" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-3xl pb-20">
                                    <h1 className="text-8xl font-black tracking-tighter mb-8 text-gradient italic leading-none">Criação Subjetiva.</h1>
                                    <p className="text-white/30 mb-20 text-lg max-w-sm font-medium leading-relaxed">Versão 21: Orquestração em via única. Uma capa por vez para máxima fidelidade e zero timeouts.</p>

                                    <div className="space-y-12">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Título do Livro</label>
                                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da Obra" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Escritor(a)</label>
                                                <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Seu Nome" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Visão do Lançamento</label>
                                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva a estética ideal..." rows={3} className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-xl font-medium focus:border-purple-500/50 transition-all outline-none resize-none" />
                                        </div>
                                        <button onClick={handleGenerateCover} disabled={isLoading || !title} className="w-full py-10 bg-white text-black font-black uppercase tracking-[6px] rounded-[50px] hover:bg-purple-200 transition-all flex items-center justify-center gap-6 shadow-[0_30px_60px_-15px_rgba(255,255,255,0.1)]">
                                            {isLoading ? <Loader2 className="animate-spin w-10 h-10" /> : <Zap className="w-10 h-10 fill-current" />} GERAR CAPA MASTER
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'design' && (
                                <motion.div key="design" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl pb-20">
                                    <h1 className="text-8xl font-black tracking-tighter mb-8 text-gradient italic leading-none">Estéticas.</h1>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                                        {['Cyberpunk', 'Elegant', 'Minimalist', 'Artistic', 'Vintage', 'Modern Noir', 'Ethereal', 'Abstract'].map(p => (
                                            <button key={p} onClick={() => setSelectedPalette(p)} className={`p-10 rounded-[50px] border transition-all text-sm font-black uppercase tracking-widest ${selectedPalette === p ? 'bg-purple-600 border-purple-400 text-white shadow-2xl' : 'bg-white/5 border-white/5 hover:border-white/20 text-white/40'}`}>{p}</button>
                                        ))}
                                    </div>
                                    <div className="mt-20">
                                        <label className="text-[10px] font-black uppercase tracking-[6px] text-white/20 mb-10 block">Layout Editorial</label>
                                        <div className="flex gap-8">
                                            {['Impact', 'Classic', 'Clean', 'Dynamic'].map(l => (
                                                <button key={l} onClick={() => setSelectedLayout(l)} className={`px-12 py-6 rounded-full border transition-all text-[11px] font-black uppercase tracking-[4px] ${selectedLayout === l ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 border-white/5 text-white/30'}`}>{l}</button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'typography' && (
                                <motion.div key="typography" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl pb-20">
                                    <h1 className="text-8xl font-black tracking-tighter mb-8 text-gradient italic leading-none">Fontes.</h1>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-10">
                                        {['Classic Serif', 'Modern Sans', 'Bold Display', 'Script Signature', 'Editorial Gothic', 'Minimalist Mono'].map(f => (
                                            <button key={f} onClick={() => setSelectedFont(f)} className={`p-12 rounded-[60px] border transition-all text-sm font-black uppercase tracking-[3px] h-40 flex items-center justify-center text-center ${selectedFont === f ? 'bg-white text-black border-white shadow-2xl' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}>{f}</button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'gallery' && (
                                <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20">
                                    <div className={`relative w-[550px] aspect-[2.2/3.5] rounded-[80px] overflow-hidden border-2 transition-all ${coverStatus === 'loading' ? 'bg-white/[0.01] animate-pulse border-white/5 flex flex-col items-center justify-center gap-10 shadow-2xl' : (cover ? 'border-purple-600 shadow-[0_100px_200px_-50px_rgba(168,85,247,0.5)]' : 'border-white/5')}`}>
                                        {coverStatus === 'loading' ? (
                                            <><div className="w-24 h-24 rounded-full border-t-2 border-purple-500 animate-spin"></div><span className="text-xl font-black uppercase tracking-[10px] text-white/20 italic">Forjando Obra...</span></>
                                        ) : (coverStatus === 'fail' ? (
                                            <div className="flex flex-col items-center justify-center p-20 text-center gap-10">
                                                <AlertCircle className="w-20 h-20 text-pink-500/40" />
                                                <button onClick={handleGenerateCover} className="bg-white text-black px-12 py-6 rounded-full text-base font-black uppercase tracking-[6px] shadow-2xl">Refazer Tentativa</button>
                                            </div>
                                        ) : (
                                            <motion.img
                                                initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                                transition={{ duration: 1.5 }}
                                                src={cover!}
                                                className="w-full h-full object-cover"
                                            />
                                        ))}
                                        {cover && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                                                <button onClick={() => setActiveTab('editorial')} className="bg-white text-black px-12 py-6 rounded-full font-black uppercase tracking-[6px] shadow-2xl hover:scale-110 transition-all">Selecionar e Escrever</button>
                                            </div>
                                        )}
                                    </div>
                                    {cover && !isLoading && (
                                        <button onClick={handleGenerateCover} className="mt-16 flex items-center gap-4 text-white/30 hover:text-white transition-all font-black uppercase tracking-[5px] text-[12px]"><RefreshCw className="w-5 h-5" /> Não gostou? Gerar Nova Opção</button>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'editorial' && (
                                <motion.div key="editorial" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col xl:flex-row gap-24 pb-20">
                                    <div className="flex-1 space-y-12">
                                        <h1 className="text-8xl font-black tracking-tighter mb-8 text-gradient italic leading-none">Editorial.</h1>
                                        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Inicie o conteúdo da sua obra..." className="w-full bg-white/[0.01] border border-white/5 rounded-[80px] p-16 text-white/80 text-2xl leading-relaxed min-h-[900px] outline-none focus:border-purple-500/20 transition-all shadow-2xl custom-scrollbar" />
                                    </div>
                                    <div className="w-full xl:w-[500px] space-y-14">
                                        <div className="aspect-[2.2/3.5] rounded-[70px] overflow-hidden shadow-[0_80px_150px_-30px_rgba(168,85,247,0.4)] border border-white/10 bg-black">
                                            {cover && <img src={cover} className="w-full h-full object-cover" />}
                                        </div>
                                        <button onClick={() => setActiveTab('gallery')} className="w-full py-8 bg-white/5 border border-white/10 rounded-[40px] text-[13px] font-black uppercase tracking-[5px] hover:bg-white/10 transition-all">Alterar Design</button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'export' && (
                                <motion.div key="export" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-60 text-center space-y-24">
                                    <div className="w-48 h-48 bg-green-500/5 rounded-full flex items-center justify-center shadow-[0_0_150px_rgba(34,197,94,0.3)] border border-green-500/10"><CheckCircle2 className="w-24 h-24 text-green-500" /></div>
                                    <div className="space-y-6">
                                        <h2 className="text-9xl font-black tracking-tighter italic text-gradient leading-none">Obra Concluída.</h2>
                                        <p className="text-white/20 text-2xl font-medium tracking-[12px] uppercase lg:mt-6">Lumina G21 Master Edition</p>
                                    </div>
                                    <button onClick={downloadPDF} className="bg-white text-black px-24 py-12 rounded-[60px] font-black uppercase text-xl flex items-center gap-10 hover:scale-110 active:scale-95 transition-all shadow-2xl"><FileDown className="w-14 h-14" /> SALVAR E-BOOK HD</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="fixed bottom-14 right-14 w-[450px] bg-[#050510]/98 backdrop-blur-3xl border border-white/5 p-14 rounded-[70px] flex flex-col gap-10 z-50 shadow-2xl border-t border-purple-500/30">
                        <div className="flex items-center justify-between border-b border-white/5 pb-8">
                            <span className="text-[12px] font-black uppercase tracking-[10px] text-white/30 italic">MASTER MONITOR G21</span>
                            <div className="flex gap-2.5">
                                <span className="w-2.5 h-2.5 bg-purple-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(168,85,247,0.5)]"></span>
                            </div>
                        </div>
                        <div className="space-y-6">
                            {debugLogs.map((l, i) => <div key={i} className="text-[13px] font-bold text-white/30 font-mono flex gap-8 leading-tight select-none cursor-default hover:text-white transition-colors"><span className="text-purple-600/60">»</span> {l}</div>)}
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
            <span className={`w-9 h-9 transition-all duration-700 ${active ? 'text-purple-500 rotate-0' : 'group-hover:text-purple-500/70'}`}>{icon}</span>
            <span className="hidden md:inline text-[13px] uppercase font-black tracking-[6px] leading-none">{label}</span>
        </button>
    );
}
