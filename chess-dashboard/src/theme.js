/**
 * theme.js — Dark chess-themed MUI theme
 */
import { createTheme, alpha } from '@mui/material/styles';

const chessDark = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',   // soft electric blue
      light: '#bbdefb',
      dark: '#42a5f5',
    },
    secondary: {
      main: '#ce93d8',   // accent violet
      light: '#e1bee7',
      dark: '#ab47bc',
    },
    success: {
      main: '#66bb6a',
    },
    warning: {
      main: '#ffa726',
    },
    error: {
      main: '#ef5350',
    },
    background: {
      default: '#0a0e1a',
      paper: '#111827',
    },
    divider: 'rgba(144,202,249,0.12)',
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(15,20,40,0.9) 100%)',
          border: '1px solid rgba(144,202,249,0.1)',
          backdropFilter: 'blur(12px)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            background: 'rgba(144,202,249,0.06)',
            fontWeight: 700,
            fontSize: '0.8rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#90caf9',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            background: 'rgba(144,202,249,0.04)',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 6,
        },
      },
    },
  },
});

export default chessDark;
