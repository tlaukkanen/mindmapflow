import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderWidth: {
        DEFAULT: '1px',
      },
      borderSpacing: {
        DEFAULT: '1px',
      },

      borderRadius: {
        node: '4px',
      },

      scrollbar: { 
        width: 'thin', // Adjust the width of the scrollbar 
      },

      colors: {
        // Theme colors
        platinum: '#EBEDE9',
        cornflowerBlue: '#4F88FF',
        bitterSweet: '#E26D5C',
        prussianBlue: '#003459',
        richBlack: '#00171F',

        scrollbar: {
          thumb: 'panels-background',
          track: 'bg-gray-200',
        },

        // Brown to tea green
        walnutBrown: '#6B6054',
        battleshipGrey: '#929487',
        ashGray: '#A1B0AB',
        teaGreen: '#C3DAC3',
        nyanza: '#D5ECD4',

        // Editor colors
        panels: {
          background: '#F0F6FA',
          border: '#D6D9D4',
          text: '#00171F',
        },

        menuBar: {
          background: '#EDF3F7',
          border: '#d5d9d2',
          text: '#00171F',
        },

        canvas: {
          background: '#f7f9fb',
          backgroundBackup: '#FEFEFF',
          node: {
            background: '#FFFFFF',
            border: '#d5d9d2',
            text: '#00171F',
          },
        },

        collectionNodes: {
          background100: '#FFFFFF00',
          background200: '#F2F7FA',
          background300: '#E8F3FA',
          border: '#CFD1CD',
          text: '#00171F',
        },

        divider: '#d5d9d2',

        background: '#4F88FF',
        white: '#fffffe',        
        text: '#fffffe',
        foreground: '#00171F',
        gradient: 'linear-gradient(70deg, #0068FD, #5FADFF)',
        primary: {
          foreground: "#fffffe",
          DEFAULT: "#003459",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  safelist: [
    'bg-collectionNodes-background100',
    'bg-collectionNodes-background200',
    'bg-collectionNodes-background300',
  ],
  important: '#root',
  darkMode: "class",
  plugins: [
    function ({addUtilities}) {
      const newUtilities = {
        '.scrollbar-thin': {
          scrollbarWidth: 'thin',
          scrollbarColor: '#d5d9d2 #F0F6FA',
        },
        '.scrollbar-webkit': {
          "&::-webkit-scrollbar": {
            width: '6px',
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: '#F0F6FA',
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: '#d5d9d2',
            borderRadius: '20px',
            border: '1px solid #F0F6FA',
          },
        },
      }
      addUtilities(newUtilities, ['responsive', 'hover'])
    }
  ],
  corePlugins: {
    preflight: false,
  },
} satisfies Config;
