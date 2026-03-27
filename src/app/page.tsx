'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Upload, Loader2, FileDown, BookOpen, ChevronLeft, CreditCard, LayoutDashboard, Palette, Type, MessageSquare, Download, CheckCircle2, RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react';
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
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    };

    const handleGenerateCover = async () => {
        if (!title) return alert("Título é obrigatório!");
        setIsLoading(true); setCoverStatus('loading'); setActiveTab('gallery');
        setCover(null);
        addLog(`G22 Bridge Init...`);

        try {
            const themeRes = await fetch('/api/generate-cover-theme', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, palette: selectedPalette, layout: selectedLayout }),
            });
            const theme = await themeRes.json();
            setApprovedTheme(theme);

            const artPrompt = `Professional book cover art, high-end typography "${title.toUpperCase()}". By ${author || 'Lumina'}. Style: ${selectedPalette}, Layout: ${selectedLayout}. ${theme.image_generation_prompt}. 8k realism, masterpiece.`;
            const seed = Math.floor(Math.random() * 999999);
            const pollUrl = `https://pollinations.ai/p/${encodeURIComponent(artPrompt.substring(0, 400))}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;

            let finalB64 = "";

            // --- STAGE 1: ELITE GEMINI ---
            try {
                addLog(`Tentativa 1: Elite...`);
                const res = await fetch('/api/generate-cover', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: artPrompt })
                });
                const data = await res.json();
                if (data.base64 && data.base64.length > 25000) {
                    finalB64 = data.base64;
                    addLog(`Elite Sucesso (${Math.round(data.base64.length / 1024)}KB)`);
                } else if (data.error) {
                    addLog(`Elite Erro: ${data.error.substring(0, 15)}`);
                }
            } catch (e: any) { addLog(`Elite Fail: ${e.message.substring(0, 15)}`); }

            // --- STAGE 2: SERVER PROXY BYPASS (ANTI-CORS) ---
            if (!finalB64) {
                try {
                    addLog(`Tentativa 2: Server Proxy...`);
                    const res = await fetch('/api/proxy-image', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: pollUrl })
                    });
                    const data = await res.json();
                    if (data.base64 && data.base64.length > 25000) {
                        finalB64 = data.base64;
                        addLog(`Proxy OK (${Math.round(data.base64.length / 1024)}KB)`);
                    }
                } catch (e: any) { addLog(`Proxy Fail.`); }
            }

            // --- STAGE 3: DIRECT BROWSER TURBO ---
            if (!finalB64) {
                try {
                    addLog(`Tentativa 3: Front Turbo...`);
                    const res = await fetch(pollUrl);
                    if (res.ok) {
                        const blob = await res.blob();
                        if (blob.size > 20000) {
                            finalB64 = await blobToBase64(blob);
                            addLog(`Front OK (${Math.round(blob.size / 1024)}KB)`);
                        }
                    }
                } catch (e: any) { addLog(`Front Fail.`); }
            }

            if (finalB64) {
                setCover(finalB64);
                setCoverStatus('done');
            } else {
                addLog(`Bridge Broken: Nada gerado.`);
                setCoverStatus('fail');
            }
        } catch (e: any) { addLog(`Erro Crítico: ${e.message}`); }
        finally { setIsLoading(false); }
    };

    const handleCreateEbook = async () => {
        if (!content || !cover) return;
        setIsLoading(true); setActiveTab('export');
        addLog("Compilando Master G22...");
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
        <main className="min-h-screen bg-[#020205] text-[#eef2f7]">
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
                        <TabButton icon={<MessageSquare />} label="Editorial" active={activeTab === 'editorial'} onClick={() => setActiveTab('editorial')} disabled={!cover} />
                        <TabButton icon={<Download />} label="Compilar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} disabled={!generatedEbook} />
                    </nav>
                </aside>

                <section className="flex-1 flex flex-col relative h-screen overflow-hidden">
                    <header className="h-24 border-b border-white/5 flex items-center justify-between px-16 bg-[#020205]/95 backdrop-blur-3xl sticky top-0 z-40">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]"></div>
                            <span className="text-[10px] font-black uppercase tracking-[8px] text-white/30 italic">Nano-Banana G22 Bridge</span>
                        </div>
                        {cover && activeTab !== 'export' && (
                            <button onClick={handleCreateEbook} className="bg-white text-black px-12 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all font-bold shadow-2xl">Finalizar Projeto</button>
                        )}
                    </header>

                    <div className="flex-1 overflow-y-auto p-12 md:p-24 h-full custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeTab === 'config' && (
                                <motion.div key="config" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-3xl pb-20">
                                    <h1 className="text-8xl font-black tracking-tighter mb-8 text-gradient italic leading-none">O Ponta de Lança.</h1>
                                    <p className="text-white/30 mb-20 text-lg max-w-sm font-medium leading-relaxed">G22 Bridge: Tripla-camada de proteção (Elite, Proxy e Turbo) para garantir que sua obra nasça, não importa a latência.</p>

                                    <div className="space-y-12">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Título do Livro</label>
                                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da Obra" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Autor</label>
                                                <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Seu Nome" className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-2xl font-bold focus:border-purple-500/50 transition-all outline-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[4px] text-white/20 ml-2">Conceito de Arte</label>
                                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva sua estética..." rows={3} className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-xl font-medium focus:border-purple-500/50 transition-all outline-none resize-none" />
                                        </div>
                                        <button onClick={handleGenerateCover} disabled={isLoading || !title} className="group relative w-full py-10 bg-white text-black font-black uppercase tracking-[6px] rounded-[50px] hover:bg-purple-200 transition-all flex items-center justify-center gap-6 shadow-[0_30px_60px_-15px_rgba(255,255,255,0.15)] overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            {isLoading ? <Loader2 className="animate-spin w-10 h-10" /> : <Zap className="w-10 h-10 fill-current" />} FORJAR CAPA G22
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'design' && (
                                <motion.div key="design" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl pb-20">
                                    <h1 className="text-8xl font-black tracking-tighter mb-8 text-gradient italic leading-none">Estéticas.</h1>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                                        {['Cyberpunk', 'Elegant', 'Minimalist', 'Artistic', 'Vintage', 'Modern Noir', 'Ethereal', 'Hyper-Realistic'].map(p => (
                                            <button key={p} onClick={() => setSelectedPalette(p)} className={`p-10 rounded-[50px] border transition-all text-[11px] font-black uppercase tracking-widest ${selectedPalette === p ? 'bg-purple-600 border-purple-400 text-white shadow-2xl' : 'bg-white/5 border-white/5 hover:border-white/20 text-white/40'}`}>{p}</button>
                                        ))}
                                    </div>
                                    <div className="mt-20">
                                        <label className="text-[10px] font-black uppercase tracking-[6px] text-white/20 mb-10 block">Layout Visual</label>
                                        <div className="flex gap-8">
                                            {['Impact', 'Classic', 'Clean', 'Dynamic'].map(l => (
                                                <button key={l} onClick={() => setSelectedLayout(l)} className={`px-12 py-6 rounded-full border transition-all text-[11px] font-black uppercase tracking-[4px] ${selectedLayout === l ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 border-white/5 text-white/30'}`}>{l}</button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'typography' && (
                                <motion.div key="typography" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl pb-20">
                                    <h1 className="text-8xl font-black tracking-tighter mb-8 text-gradient italic leading-none">Fontes.</h1>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-10">
                                        {['Classic Serif', 'Modern Sans', 'Bold Display', 'High Contrast', 'Minimalist', 'Editorial Gothic'].map(f => (
                                            <button key={f} onClick={() => setSelectedFont(f)} className={`p-12 rounded-[60px] border transition-all text-sm font-black uppercase tracking-[3px] h-44 flex items-center justify-center text-center ${selectedFont === f ? 'bg-white text-black border-white shadow-2xl scale-105' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}>{f}</button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'gallery' && (
                                <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 pb-40">
                                    <div className={`relative w-[500px] aspect-[2.2/3.5] rounded-[90px] overflow-hidden border-2 transition-all ${coverStatus === 'loading' ? 'bg-white/[0.01] animate-pulse border-white/10 flex flex-col items-center justify-center gap-12 shadow-[0_50px_100px_rgba(255,255,255,0.05)]' : (cover ? 'border-purple-600 shadow-[0_100px_200px_-50px_rgba(168,85,247,0.6)]' : 'border-white/5')}`}>
                                        {coverStatus === 'loading' ? (
                                            <><div className="w-24 h-24 rounded-full border-t-2 border-purple-500 animate-spin shadow-[0_0_40px_rgba(168,85,247,0.5)]"></div><span className="text-xl font-black uppercase tracking-[12px] text-white/20 italic">Forjando...</span></>
                                        ) : (coverStatus === 'fail' ? (
                                            <div className="flex flex-col items-center justify-center p-20 text-center gap-10">
                                                <AlertCircle className="w-20 h-20 text-pink-500/50" />
                                                <button onClick={handleGenerateCover} className="bg-white text-black px-12 py-6 rounded-full text-base font-black uppercase tracking-[6px] shadow-2xl hover:scale-110 active:scale-95 transition-all">Refazer Tentativa</button>
                                            </div>
                                        ) : (
                                            <motion.img
                                                initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                                transition={{ duration: 2, ease: "easeOut" }}
                                                src={cover!}
                                                className="w-full h-full object-cover"
                                            />
                                        ))}
                                        {cover && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md">
                                                <button onClick={() => setActiveTab('editorial')} className="bg-white text-black px-16 py-8 rounded-full font-black uppercase tracking-[8px] shadow-2xl hover:scale-110 transition-all font-bold">Aprovar Esta Arte</button>
                                            </div>
                                        )}
                                    </div>
                                    {cover && !isLoading && (
                                        <button onClick={handleGenerateCover} className="mt-16 flex items-center gap-6 text-white/30 hover:text-white transition-all font-black uppercase tracking-[8px] text-[12px] group"><RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700" /> Tentar Nova Estética</button>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'editorial' && (
                                <motion.div key="editorial" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col xl:flex-row gap-24 pb-40">
                                    <div className="flex-1 space-y-12">
                                        <h1 className="text-8xl font-black tracking-tighter mb-8 text-gradient italic leading-none">Editorial.</h1>
                                        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Aqui começa a mística da sua obra..." className="w-full bg-white/[0.01] border border-white/5 rounded-[80px] p-16 text-white/80 text-2xl leading-relaxed min-h-[900px] outline-none focus:border-purple-500/20 transition-all shadow-2xl custom-scrollbar" />
                                    </div>
                                    <div className="w-full xl:w-[500px] space-y-14 sticky top-12">
                                        <div className="aspect-[2.2/3.5] rounded-[80px] overflow-hidden shadow-[0_80px_150px_-30px_rgba(168,85,247,0.5)] border border-white/10 bg-black">
                                            {cover && <img src={cover} className="w-full h-full object-cover" />}
                                        </div>
                                        <button onClick={() => setActiveTab('gallery')} className="w-full py-8 bg-white/5 border border-white/10 rounded-[45px] text-[13px] font-black uppercase tracking-[6px] hover:bg-white/10 transition-all">Alterar Design Base</button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'export' && (
                                <motion.div key="export" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-60 text-center space-y-24">
                                    <div className="w-60 h-60 bg-green-500/5 rounded-full flex items-center justify-center shadow-[0_0_150px_rgba(34,197,94,0.4)] border border-green-500/10"><CheckCircle2 className="w-32 h-32 text-green-500" /></div>
                                    <div className="space-y-6">
                                        <h2 className="text-9xl font-black tracking-tighter italic text-gradient leading-none">Compilado.</h2>
                                        <p className="text-white/20 text-3xl font-medium tracking-[15px] uppercase mt-10">G22 Bridge Master Ready</p>
                                    </div>
                                    <button onClick={downloadPDF} className="bg-white text-black px-32 py-16 rounded-[70px] font-black uppercase text-2xl flex items-center gap-12 hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-white/5"><FileDown className="w-16 h-16" /> DOWNLOAD FINAL HD</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="fixed bottom-14 right-14 w-[480px] bg-[#050510]/98 backdrop-blur-3xl border border-white/5 p-16 rounded-[80px] flex flex-col gap-12 z-50 shadow-2xl border-t border-purple-500/40">
                        <div className="flex items-center justify-between border-b border-white/5 pb-10">
                            <span className="text-[14px] font-black uppercase tracking-[12px] text-white/30 italic">BRIDGE MONITOR G22</span>
                            <div className="flex gap-3">
                                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="w-3 h-3 bg-purple-600 rounded-full animate-pulse delay-200 shadow-[0_0_10px_purple]"></span>
                            </div>
                        </div>
                        <div className="space-y-8">
                            {debugLogs.map((l, i) => <div key={i} className="text-[14px] font-bold text-white/30 font-mono flex gap-10 leading-none select-none hover:text-white transition-colors cursor-default tracking-wide"><span className="text-purple-600/70">»</span> {l}</div>)}
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
            <span className={`w-10 h-10 transition-all duration-700 ${active ? 'text-purple-500 rotate-0 scale-110' : 'group-hover:text-purple-500/70 -rotate-12 group-hover:rotate-0'}`}>{icon}</span>
            <span className="hidden md:inline text-[14px] uppercase font-black tracking-[8px] leading-none">{label}</span>
        </button>
    );
}
