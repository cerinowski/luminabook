/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#E93DE5",
                secondary: "#5B33F5",
                background: "#020617",
                foreground: "#f8fafc",
            },
        },
    },
    plugins: [],
}
