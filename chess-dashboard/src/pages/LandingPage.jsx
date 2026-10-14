/**
 * LandingPage.jsx — Full-screen start page with chess background
 * Renders outside the sidebar Layout; "Explore Project →" navigates to /recommender
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import chessBg from '../assets/chess_landing_bg.jpg';

export default function LandingPage() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  // Fade-in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        bgcolor: '#0a0e1a',
      }}
    >
      {/* ── Background image ── */}
      <Box
        component="img"
        src={chessBg}
        alt=""
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'right center',
          opacity: 0.72,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />

      {/* ── Left-side gradient veil so text stays readable ── */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(10,14,26,0.97) 0%, rgba(10,14,26,0.82) 42%, rgba(10,14,26,0.18) 70%, rgba(10,14,26,0.04) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Bottom vignette ── */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0, height: '30%',
          background: 'linear-gradient(to top, rgba(10,14,26,0.85) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Content ── */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          px: { xs: 4, sm: 8, md: 12 },
          maxWidth: 640,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        {/* Main title */}
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '2.6rem', sm: '3.4rem', md: '4rem' },
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: '#e2e8f0',
            mb: 1.5,
          }}
        >
          Chess Opening{' '}
          <Box
            component="span"
            sx={{
              background: 'linear-gradient(90deg, #90caf9 0%, #ce93d8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Pattern Mining
          </Box>
        </Typography>

        {/* Subtitle */}
        <Typography
          variant="body1"
          sx={{
            color: 'rgba(226,232,240,0.70)',
            fontSize: { xs: '0.97rem', md: '1.08rem' },
            lineHeight: 1.75,
            maxWidth: 520,
            mb: 4,
          }}
        >
          Discover chess opening patterns, mine frequent move combinations, and
          explore the strategies behind tournament games using advanced data
          mining techniques.
        </Typography>

        {/* CTA button */}
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate('/recommender')}
          sx={{
            px: 4,
            py: 1.4,
            fontSize: '1rem',
            fontWeight: 700,
            borderRadius: 2.5,
            background: 'linear-gradient(90deg, #5b9bd5 0%, #7b5ea7 100%)',
            boxShadow: '0 4px 24px rgba(90,155,213,0.30)',
            textTransform: 'none',
            letterSpacing: 0.3,
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            '&:hover': {
              background: 'linear-gradient(90deg, #6baae0 0%, #8a6db8 100%)',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 32px rgba(90,155,213,0.45)',
            },
          }}
        >
          Explore Project
        </Button>
      </Box>

      {/* ── Subtle bottom-left credit ── */}
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 20,
          left: { xs: 24, md: 48 },
          color: 'rgba(148,163,184,0.45)',
          zIndex: 1,
          fontSize: '0.7rem',
        }}
      >
        ChessML · Pattern Mining Dashboard
      </Typography>
    </Box>
  );
}
