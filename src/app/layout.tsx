import { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'LumiaBook | IA de E-books Profissionais',
    description: 'A IA tecnológica que diagrama e cria capas premium para seus e-books.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="pt-BR">
            <body className="antialiased min-h-screen">
                {children}
            </body>
        </html>
    )
}
