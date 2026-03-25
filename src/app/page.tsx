'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Upload, Loader2, FileDown, BookOpen, ChevronLeft, CreditCard, LayoutDashboard, Palette, Type, MessageSquare, Download, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';

// Fontes de Luxo
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;700;900&display=swap";

// Presets de Paletas Profissionais
const PALETTE_PRESETS = [
    { name: "Midnight Gold", primary: "#1a1830", secondary: "#D4AF37", label: "Luxo Clássico" },
    { name: "Rose Charcoal", primary: "#1c1c1c", secondary: "#E93DE5", label: "Moderno Fashion" },
    { name: "Emerald Clinical", primary: "#0a2e15", secondary: "#2ecc71", label: "Saúde & Bem-estar" },
    { name: "Deep Ocean", primary: "#050510", secondary: "#5B33F5", label: "Tecnologia" },
    { name: "Terracotta Zen", primary: "#2d1a12", secondary: "#e67e22", label: "Orgânico" }
];

// --- MOTOR DE TIPOGRAFIA LUMINA v6.0 ---
async function generateTypographyLayer(bgUrl: string, config: any): Promise<string> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 800; canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(bgUrl);

        const renderText = (loadedImg: HTMLImageElement | null) => {
            if (loadedImg) {
                // Ensure image fits perfectly (Cover is 800x1200)
                const scale = Math.max(800 / loadedImg.width, 1200 / loadedImg.height);
                const x = (800 - loadedImg.width * scale) / 2;
                const y = (1200 - loadedImg.height * scale) / 2;
                ctx.drawImage(loadedImg, x, y, loadedImg.width * scale, loadedImg.height * scale);
            } else {
                const bgGrad = ctx.createLinearGradient(0, 0, 800, 1200);
                bgGrad.addColorStop(0, config.primary || '#050510');
                bgGrad.addColorStop(1, '#000000');
                ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, 800, 1200);
            }

            const gradient = ctx.createLinearGradient(0, 0, 0, 1200);
            gradient.addColorStop(0, 'rgba(0,0,0,0.4)');
            gradient.addColorStop(0.3, 'rgba(0,0,0,0)');
            gradient.addColorStop(0.7, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
            ctx.fillStyle = gradient; ctx.fillRect(0, 0, 800, 1200);

            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 15;

            const title = (config.title || 'EBOOK').replace(/^.*?:\s*/, '').replace(/:/g, '').toUpperCase();
            ctx.fillStyle = '#FFFFFF';
            let fontSize = title.length > 20 ? 60 : 80;
            if (title.length > 40) fontSize = 45;

            const fontStack = config.font === 'sans' ? "'Montserrat', sans-serif" : "'Playfair Display', serif";
            ctx.font = `900 ${fontSize}px ${fontStack}`;

            const words = title.split(' '); let line = ''; let y = 450;
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                if (ctx.measureText(testLine).width > 700 && n > 0) {
                    ctx.fillText(line, 400, y); line = words[n] + ' '; y += fontSize * 1.2;
                } else line = testLine;
            }
            ctx.fillText(line, 400, y);

            ctx.font = `400 24px 'Montserrat', sans-serif`;
            ctx.fillText((config.subtitle || '').toUpperCase(), 400, y + 80);

            ctx.font = `700 22px 'Montserrat', sans-serif`;
            ctx.letterSpacing = "6px";
            ctx.fillText((config.author || 'LUMINA STUDIO').toUpperCase(), 400, 1100);

            ctx.strokeStyle = config.secondary || '#E93DE5'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(350, y + 120); ctx.lineTo(450, y + 120); ctx.stroke();
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };

        const img = new Image(); img.crossOrigin = "anonymous"; img.src = bgUrl;
        img.onload = () => renderText(img); img.onerror = () => renderText(null);
        setTimeout(() => { if (canvas.toDataURL('image/jpeg').length < 1000) renderText(null); }, 15000);
    });
}

export default function Home() {
    // Basic Info
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [description, setDescription] = useState('');
    const [content, setContent] = useState('');

    // UI State
    const [activeTab, setActiveTab] = useState('config'); // config, gallery, style, editorial, export
    const [isLoading, setIsLoading] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [credits, setCredits] = useState(1000);

    // Design State
    const [variations, setVariations] = useState<string[]>([]);
    const [selectedCover, setSelectedCover] = useState<string | null>(null);
    const [selectedFont, setSelectedFont] = useState<'serif' | 'sans'>('serif');
    const [approvedTheme, setApprovedTheme] = useState<any>(null);
    const [chapterImages, setChapterImages] = useState<string[]>([]);
    const [generatedEbook, setGeneratedEbook] = useState<any>(null);
    const [isGeneratingChapters, setIsGeneratingChapters] = useState(false);

    const addLog = (msg: string) => setDebugLogs(p => [...p.slice(-5), `[${new Date().toLocaleTimeString()}] ${msg}`]);

    // Variation Generation Logic
    const handleGenerateVariations = async () => {
        if (!title) return alert("Título é obrigatório!");
        setIsLoading(true);
        setActiveTab('gallery');
        addLog("Solicitando design estratégico à IA...");

        try {
            const res = await fetch('/api/generate-cover-theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            });
            const theme = await res.json();
            setApprovedTheme(theme);

            addLog("Pintando 4 variações exclusivas (FLUX)...");
            const variationPromises = Array(4).fill(0).map(async (_, i) => {
                await new Promise(r => setTimeout(r, i * 800)); // Small staggered delay
                const seed = Math.floor(Math.random() * 2000);
                const artUrl = `https://pollinations.ai/p/${encodeURIComponent(theme.image_generation_prompt + ". atmospheric, professional, NO TEXT")}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;
                return generateTypographyLayer(artUrl, {
                    title: theme.title || title,
                    author: author || "Lumina Studio",
                    primary: theme.primary_color,
                    secondary: theme.secondary_color,
                    font: selectedFont
                });
            });
            const newVariations = await Promise.all(variationPromises);
            setVariations(newVariations);
        } catch (e) { addLog("Erro no motor de arte."); }
        finally { setIsLoading(false); }
    };

    const handleCreateEbook = async () => {
        if (!content || !selectedCover) return;
        setIsLoading(true);
        setActiveTab('export');
        addLog("Compilando eBook Profissional...");
        try {
            const res = await fetch('/api/generate-ebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, approvedTitle: title, approvedTheme, approvedAuthor: author }),
            });
            const data = await res.json();
            setGeneratedEbook(data);
            if (data.chapters) {
                setIsGeneratingChapters(true);
                const images = data.chapters.map((c: any) =>
                    `https://pollinations.ai/p/${encodeURIComponent(c.chapter_image_prompt || c.title)}?width=800&height=600&seed=${Math.floor(Math.random() * 1000)}&model=flux&nologo=true`
                );
                setChapterImages(images);
                setIsGeneratingChapters(false);
            }
        } catch (e) { addLog("Erro na diagramação."); }
        finally { setIsLoading(false); }
    };

    const downloadPDF = async () => {
        if (!generatedEbook || !selectedCover) return;
        setIsLoading(true);
        const doc = new jsPDF();
        const theme = generatedEbook.visual_theme || {};
        const [sr, sg, sb] = [parseInt(theme.secondary_color?.slice(1, 3), 16) || 200, parseInt(theme.secondary_color?.slice(3, 5), 16) || 0, parseInt(theme.secondary_color?.slice(5, 7), 16) || 200];

        doc.addImage(selectedCover, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

        (generatedEbook.chapters || []).forEach((ch: any, i: number) => {
            doc.addPage();
            // Header Bar (Magazine Style)
            doc.setFillColor(sr, sg, sb);
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10); doc.setFont('helvetica', 'bold');
            doc.text(`CAPÍTULO ${i + 1}`, 20, 15);
            doc.setFontSize(22);
            doc.text(doc.splitTextToSize(ch.title.toUpperCase(), 170), 20, 28);

            // Chapter Image
            if (chapterImages[i]) {
                doc.addImage(chapterImages[i], 'JPEG', 20, 50, 170, 100, undefined, 'FAST');
            }

            doc.addPage();
            doc.setFontSize(8); doc.setTextColor(150, 150, 150);
            doc.text(generatedEbook.title.toUpperCase(), 20, 15);

            doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(40, 40, 40);
            let y = 30;
            const lines = doc.splitTextToSize(ch.content, 170);

            lines.forEach((line: string) => {
                if (y > 275) { doc.addPage(); y = 30; }

                // Detection of special blocks
                if (line.startsWith('###')) {
                    y += 5; doc.setFont('helvetica', 'bold'); doc.setTextColor(sr, sg, sb);
                    doc.setFontSize(14); doc.text(line.replace('###', '').trim(), 20, y);
                    y += 10; doc.setFontSize(11); doc.setTextColor(40, 40, 40); doc.setFont('helvetica', 'normal');
                } else if (line.includes('[TIP]') || line.includes('[ATENÇÃO]')) {
                    const cleanLine = line.replace('[TIP]', '').replace('[ATENÇÃO]', '').trim();
                    doc.setFillColor(255, 245, 220); doc.setDrawColor(255, 200, 100);
                    doc.rect(18, y - 5, 174, 12, 'FD');
                    doc.setFont('helvetica', 'bold'); doc.setTextColor(150, 100, 0);
                    doc.text("NOTA:", 22, y + 2);
                    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
                    doc.text(cleanLine, 40, y + 2);
                    y += 15;
                } else {
                    doc.text(line, 20, y); y += 7;
                }
            });
        });
        doc.save(`${title.replace(/\s/g, '_')}.pdf`);
        setIsLoading(false);
    };

    return (
        <main className="min-h-screen flex bg-[#050510] text-white">
            <style jsx global>{` @import url('${GOOGLE_FONTS_URL}'); body { background: #050510; font-family: 'Montserrat', sans-serif; } `}</style>

            {/* Sidebar Superior/Lateral (Studio Style) */}
            <aside className="w-20 md:w-64 bg-[#0a0a1f] border-r border-white/5 flex flex-col items-center py-8 gap-10">
                <div className="flex items-center gap-3 px-6 w-full mb-4">
                    <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="hidden md:inline font-black tracking-tighter text-xl italic text-gradient">LUMINA</span>
                </div>

                <nav className="flex-1 flex flex-col gap-2 w-full px-4">
                    <TabButton icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
                    <TabButton icon={<BookOpen />} label="Capas AI" active={activeTab === 'gallery'} onClick={() => variations.length > 0 && setActiveTab('gallery')} disabled={variations.length === 0} />
                    <TabButton icon={<Palette />} label="Estilo" active={activeTab === 'style'} onClick={() => setActiveTab('style')} disabled={!selectedCover} />
                    <TabButton icon={<MessageSquare />} label="Conteúdo" active={activeTab === 'editorial'} onClick={() => setActiveTab('editorial')} disabled={!selectedCover} />
                    <TabButton icon={<Download />} label="Exportar" active={activeTab === 'export'} onClick={() => setActiveTab('export')} disabled={!generatedEbook} />
                </nav>

                <div className="px-6 w-full">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between"><CreditCard className="w-3 h-3 text-purple-400" /><span className="text-[10px] font-black">{credits}</span></div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{ width: '70%' }} /></div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <section className="flex-1 flex flex-col relative overflow-hidden">
                <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-[#050510]/80 backdrop-blur-xl z-20">
                    <h2 className="text-sm font-black uppercase tracking-[4px] text-white/40">{activeTab}</h2>
                    <div className="flex items-center gap-4">
                        {activeTab === 'gallery' && <button onClick={() => setActiveTab('config')} className="text-xs font-bold text-purple-400">Voltar para Ajustes</button>}
                        {selectedCover && activeTab !== 'export' && (
                            <button onClick={handleCreateEbook} className="bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:shadow-lg hover:shadow-purple-500/30 transition-all">Gerar Preview Final</button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 md:p-12">
                    <AnimatePresence mode="wait">
                        {activeTab === 'config' && (
                            <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-xl space-y-8">
                                <h3 className="text-4xl font-black tracking-tighter">Configure seu E-book</h3>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Título do E-book</label>
                                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: O Poder da Mente" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-lg font-bold outline-none focus:border-purple-500 transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Nome do Autor</label>
                                        <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Digite o nome do autor" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-lg font-bold outline-none focus:border-purple-500 transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Conceito Visual (Opcional)</label>
                                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Minimalista, flores azuis, fundo escuro..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-base font-medium outline-none focus:border-purple-500 transition-colors resize-none" />
                                    </div>
                                    <button onClick={handleGenerateVariations} disabled={isLoading || !title} className="w-full py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-purple-200 transition-all flex items-center justify-center gap-3 shadow-2xl">
                                        {isLoading ? <Loader2 className="animate-spin" /> : <Zap className="w-5 h-5 fill-current" />} Gerar Sugestões de Capa
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'gallery' && (
                            <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                                <div><h3 className="text-3xl font-black tracking-tighter">Escolha seu Estilo</h3><p className="text-white/40 text-sm mt-2 font-medium">A Lumina AI criou 4 variações exclusivas para você. Clique na que mais combina com seu eBook.</p></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {isLoading ? Array(4).fill(0).map((_, i) => <div key={i} className="aspect-[2/3] bg-white/5 rounded-2xl animate-pulse border border-white/10 flex items-center justify-center"><Loader2 className="animate-spin text-white/20" /></div>) :
                                        variations.map((v, i) => (
                                            <motion.div key={i} whileHover={{ y: -10 }} onClick={() => { setSelectedCover(v); setActiveTab('style'); }} className={`relative group cursor-pointer aspect-[2/3] rounded-2xl overflow-hidden border-2 transition-all ${selectedCover === v ? 'border-purple-500 shadow-2xl shadow-purple-500/20' : 'border-white/5'}`}>
                                                <img src={v} className="w-full h-full object-cover" alt={`Capa ${i + 1}`} />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                    <div className="bg-white text-black px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">Selecionar Esta</div>
                                                </div>
                                            </motion.div>
                                        ))}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'editorial' && (
                            <motion.div key="editorial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row gap-12">
                                <div className="flex-1 space-y-6">
                                    <h3 className="text-3xl font-black tracking-tighter">Projeto Editorial</h3>
                                    <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Cole o conteúdo completo do seu eBook aqui..." className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-white/80 text-sm leading-relaxed min-h-[500px] outline-none focus:border-purple-500/50 transition-all shadow-inner custom-scrollbar" />
                                    <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3"><BookOpen className="w-5 h-5 text-purple-400" /><span className="text-xs font-bold text-purple-200">Total: {content.length} caracteres (~{Math.ceil(content.length / 500)} pág)</span></div>
                                        <button onClick={handleCreateEbook} className="bg-white text-black px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest">Compilar Livre</button>
                                    </div>
                                </div>
                                <div className="w-full lg:w-[350px] space-y-6">
                                    <div className="sticky top-0 bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">Capa do Projeto</h4>
                                        <div className="aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                                            {selectedCover && <img src={selectedCover} className="w-full h-full object-cover" />}
                                        </div>
                                        <button onClick={() => setActiveTab('gallery')} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10">Trocar Capa</button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'style' && (
                            <motion.div key="style" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                                <div><h3 className="text-3xl font-black tracking-tighter">Identidade Visual</h3><p className="text-white/40 text-sm mt-2 font-medium">Personalize as cores e a tipografia do seu eBook para alinhar com sua marca.</p></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Paletas de Cores</label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {PALETTE_PRESETS.map((p, i) => (
                                                <button key={i} onClick={() => {
                                                    setApprovedTheme({ ...approvedTheme, primary_color: p.primary, secondary_color: p.secondary });
                                                    addLog(`Estilo "${p.name}" aplicado.`);
                                                }} className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${approvedTheme?.primary_color === p.primary ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex gap-1">
                                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.primary }} />
                                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.secondary }} />
                                                        </div>
                                                        <span className="text-sm font-bold">{p.label}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">Aplicar</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Tipografia Principal</label>
                                        <div className="flex flex-col gap-3">
                                            <button onClick={() => setSelectedFont('serif')} className={`p-6 rounded-2xl bg-white/5 border flex items-center justify-between transition-all ${selectedFont === 'serif' ? 'border-purple-500 shadow-lg shadow-purple-500/10' : 'border-white/5 opacity-50 grayscale'}`}>
                                                <div className="text-left"><p className="font-serif text-lg">Playfair Display</p><p className="text-[9px] text-white/30 uppercase font-black">Serifado Elegante</p></div>
                                                {selectedFont === 'serif' && <CheckCircle2 className="w-5 h-5 text-purple-500" />}
                                            </button>
                                            <button onClick={() => setSelectedFont('sans')} className={`p-6 rounded-2xl bg-white/5 border flex items-center justify-between transition-all ${selectedFont === 'sans' ? 'border-purple-500 shadow-lg shadow-purple-500/10' : 'border-white/5 opacity-50 grayscale'}`}>
                                                <div className="text-left"><p className="font-sans text-lg">Montserrat</p><p className="text-[9px] text-white/30 uppercase font-black">Moderno & Clean</p></div>
                                                {selectedFont === 'sans' && <CheckCircle2 className="w-5 h-5 text-purple-500" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'export' && (
                            <motion.div key="export" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center space-y-8">
                                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center"><CheckCircle2 className="w-12 h-12 text-green-500" /></div>
                                <div><h3 className="text-4xl font-black tracking-tighter">eBook Finalizado!</h3><p className="text-white/40 font-medium max-w-sm mx-auto">Sua obra foi diagramada com sucesso. Clique abaixo para baixar o arquivo PDF de alta fidelidade.</p></div>
                                <div className="flex gap-4">
                                    <button onClick={downloadPDF} className="bg-white text-black px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-2xl flex items-center gap-3"><FileDown className="w-5 h-5" /> Baixar PDF HD</button>
                                    <button onClick={() => setActiveTab('config')} className="bg-white/5 border border-white/10 backdrop-blur-xl px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white/10">Novo Projeto</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </section>

            {/* Debug Monitor */}
            {debugLogs.length > 0 && (
                <div className="hidden lg:flex fixed bottom-6 right-6 w-80 bg-black/60 backdrop-blur-3xl border border-white/10 p-3 rounded-2xl flex-col gap-2 z-50">
                    <span className="text-[8px] font-black tracking-widest text-white/20 uppercase px-2">Monitor Lumina</span>
                    {debugLogs.map((l, i) => <div key={i} className="text-[10px] font-medium text-white/40 font-mono flex gap-2"><span className="text-purple-500">→</span> {l}</div>)}
                </div>
            )}
        </main>
    );
}

function TabButton({ icon, label, active, onClick, disabled }: any) {
    return (
        <button disabled={disabled} onClick={onClick} className={`flex items-center gap-4 py-4 px-6 rounded-2xl transition-all w-full text-left group ${active ? 'bg-purple-600/20 text-white shadow-inner font-bold' : 'text-gray-500 hover:text-white hover:bg-white/5 opacity-50 grayscale hover:opacity-100 hover:grayscale-0'} ${disabled ? 'opacity-20 cursor-not-allowed' : ''}`}>
            <span className={`w-6 h-6 ${active ? 'text-purple-400' : 'text-gray-600 group-hover:text-white'}`}>{icon}</span>
            <span className="hidden md:inline text-[10px] uppercase font-black tracking-widest">{label}</span>
        </button>
    );
}
