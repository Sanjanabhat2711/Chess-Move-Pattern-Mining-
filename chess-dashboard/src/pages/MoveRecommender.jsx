/**
 * MoveRecommender.jsx
 *
 * HOW TO PLAY (shown in UI too):
 *   Click a piece → its legal squares highlight in yellow
 *   Click a highlighted square → piece moves there
 *   OR drag-and-drop a piece directly
 *
 * Fixes vs previous versions:
 *   - Click-to-move with legal-move dots (much more intuitive than drag)
 *   - Proper chess.js v1 + react-chessboard v5 state pattern
 *   - Per-piece analysis: shows ♟ Pawn e2→e4 for each suggestion
 *   - Compact layout — board + panel side-by-side, no scrolling
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import {
  Box, Typography, Chip, Stack, LinearProgress,
  Tooltip, Alert, IconButton, CircularProgress,
  Paper, Divider,
} from '@mui/material';
import UndoIcon          from '@mui/icons-material/Undo';
import RestartAltIcon    from '@mui/icons-material/RestartAlt';
import ContentCopyIcon   from '@mui/icons-material/ContentCopy';
import TouchAppIcon      from '@mui/icons-material/TouchApp';
import OpenWithIcon      from '@mui/icons-material/OpenWith';
import AutoAwesomeIcon   from '@mui/icons-material/AutoAwesome';
import { fetchRecommendations } from '../services/api';

// ── constants ──────────────────────────────────────────────────────────────
const BOARD_SIZE = 380;

const PIECE_META = {
  p: { name: 'Pawn',   sym: '♟' },
  n: { name: 'Knight', sym: '♞' },
  b: { name: 'Bishop', sym: '♝' },
  r: { name: 'Rook',   sym: '♜' },
  q: { name: 'Queen',  sym: '♛' },
  k: { name: 'King',   sym: '♚' },
};

const confColor = (c) => c >= 0.75 ? '#66bb6a' : c >= 0.5 ? '#ffa726' : '#ef9a9a';

// ── helpers ────────────────────────────────────────────────────────────────

// ── helpers ────────────────────────────────────────────────────────────────

/** Safely attempt a move by replaying history; preserves complete PGN move history */
function tryMove(gameInstance, moveObj) {
  try {
    const clone = new Chess();
    for (const m of gameInstance.history()) {
      clone.move(m);
    }
    const result = clone.move(moveObj);
    return result ? clone : null;
  } catch {
    return null;
  }
}

/** Get verbose move info for a SAN string from current position */
function getMoveDetail(game, san) {
  try {
    return game.moves({ verbose: true }).find((m) => m.san === san) || null;
  } catch {
    return null;
  }
}

// ── main component ─────────────────────────────────────────────────────────
export default function MoveRecommender() {
  const [game,        setGame]        = useState(new Chess());
  const [recs,        setRecs]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [selectedSq,  setSelectedSq]  = useState(null);   // click-to-move: selected piece square
  const [legalDots,   setLegalDots]   = useState({});     // yellow dots for legal targets
  const [lastMove,    setLastMove]    = useState(null);    // { from, to } for last-move highlight
  const [copied,      setCopied]      = useState(false);
  const [activeRec,   setActiveRec]   = useState(null);

  // fetch recommendations whenever the game position changes
  const fetchRecs = useCallback(async (g) => {
    setLoading(true);
    const data = await fetchRecommendations(g.history());
    setRecs(data);
    setLoading(false);
    setActiveRec(null);
  }, []);

  // initial load
  useEffect(() => { fetchRecs(new Chess()); }, [fetchRecs]);

  // ── commit a move (shared by drag, click, and suggestion buttons) ────────
  const commitMove = useCallback((nextGame, from, to) => {
    setGame(nextGame);
    setLastMove({ from, to });
    setSelectedSq(null);
    setLegalDots({});
    fetchRecs(nextGame);
  }, [fetchRecs]);

  // ── DRAG-AND-DROP handler (supports both v5 options and legacy arguments) ─
  const onPieceDrop = useCallback((args, targetArg) => {
    const from = (args && typeof args === 'object' && args.sourceSquare) ? args.sourceSquare : args;
    const to   = (args && typeof args === 'object' && args.targetSquare) ? args.targetSquare : targetArg;
    if (!from || !to || from === to) return false;

    const next = tryMove(game, { from, to, promotion: 'q' });
    if (!next) return false;   // illegal → piece snaps back
    commitMove(next, from, to);
    return true;
  }, [game, commitMove]);

  // ── CLICK-TO-MOVE handler (supports both v5 options and legacy arguments) ─
  const onSquareClick = useCallback((args) => {
    const square = (args && typeof args === 'object' && args.square) ? args.square : args;
    if (!square || typeof square !== 'string') return;

    // Case 1: A piece is already selected → try to move there
    if (selectedSq && legalDots[square]) {
      const next = tryMove(game, { from: selectedSq, to: square, promotion: 'q' });
      if (next) {
        commitMove(next, selectedSq, square);
        return;
      }
    }

    // Case 2: Clicked own piece → select it and show legal moves
    const piece = game.get(square);
    const myColor = game.turn(); // 'w' or 'b'
    if (piece && piece.color === myColor) {
      const moves = game.moves({ square, verbose: true });
      const dots = {};
      moves.forEach((m) => {
        dots[m.to] = {
          background: game.get(m.to)
            ? 'radial-gradient(circle, rgba(255,200,0,0.7) 60%, transparent 70%)'   // capture
            : 'radial-gradient(circle, rgba(255,200,0,0.55) 35%, transparent 40%)', // normal
          borderRadius: '50%',
        };
      });
      setSelectedSq(square);
      setLegalDots(dots);
      return;
    }

    // Case 3: Clicked elsewhere → deselect
    setSelectedSq(null);
    setLegalDots({});
  }, [game, selectedSq, legalDots, commitMove]);

  // ── SUGGESTION: apply a recommended move ─────────────────────────────────
  const applySuggestion = useCallback((san) => {
    const detail = getMoveDetail(game, san);
    if (!detail) return;
    const next = tryMove(game, { from: detail.from, to: detail.to, promotion: 'q' });
    if (!next) return;
    setActiveRec(san);
    commitMove(next, detail.from, detail.to);
  }, [game, commitMove]);

  // ── UNDO / RESET (replays move history cleanly) ───────────────────────────
  const handleUndo = () => {
    const hist = game.history();
    if (hist.length === 0) return;
    const clone = new Chess();
    for (let i = 0; i < hist.length - 1; i++) {
      clone.move(hist[i]);
    }
    setGame(clone);
    setLastMove(null);
    setSelectedSq(null);
    setLegalDots({});
    fetchRecs(clone);
  };

  const handleReset = () => {
    const fresh = new Chess();
    setGame(fresh);
    setLastMove(null);
    setSelectedSq(null);
    setLegalDots({});
    fetchRecs(fresh);
  };

  // ── square style map ──────────────────────────────────────────────────────
  const squareStyles = {
    ...legalDots,
    ...(lastMove ? {
      [lastMove.from]: { background: 'rgba(255,214,0,0.22)' },
      [lastMove.to]:   { background: 'rgba(255,214,0,0.40)' },
    } : {}),
    ...(selectedSq ? {
      [selectedSq]: { background: 'rgba(144,202,249,0.45)' },
    } : {}),
  };

  const history    = game.history();
  const turnLabel  = game.turn() === 'w' ? 'White' : 'Black';
  const isGameOver = game.isGameOver();

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* ── Page title ── */}
      <Typography variant="h5" fontWeight={800} sx={{ mb: 1.5 }}>
        Move <Box component="span" sx={{ color: 'primary.main' }}>Recommender</Box>
      </Typography>

      {/* ── How-to banner ── */}
      <Box sx={{
        display: 'flex', gap: 2, mb: 2, p: 1.5, borderRadius: 2,
        bgcolor: 'rgba(144,202,249,0.06)', border: '1px solid rgba(144,202,249,0.15)',
        flexWrap: 'wrap',
      }}>
        {[
          { icon: <TouchAppIcon sx={{ fontSize: 18, color: '#90caf9' }} />, text: '① Click a piece to select it' },
          { icon: <TouchAppIcon sx={{ fontSize: 18, color: '#ffa726' }} />, text: '② Click a yellow dot to move there' },
          { icon: <OpenWithIcon  sx={{ fontSize: 18, color: '#ce93d8' }} />, text: 'Or just drag-and-drop any piece' },
          { icon: <AutoAwesomeIcon sx={{ fontSize: 18, color: '#66bb6a' }} />, text: 'Click a suggestion → auto-plays the move' },
        ].map((tip, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {tip.icon}
            <Typography variant="caption" color="text.secondary" fontWeight={500}>{tip.text}</Typography>
          </Box>
        ))}
      </Box>

      {/* ── Two-column layout ── */}
      <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>

        {/* ══ LEFT: Board ══ */}
        <Box sx={{ flexShrink: 0 }}>
          {/* Status bar */}
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            mb: 0.75, px: 0.25,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* turn dot */}
              <Box sx={{
                width: 11, height: 11, borderRadius: '50%',
                bgcolor: game.turn() === 'w' ? '#f0f0f0' : '#1a1a1a',
                border: '2px solid',
                borderColor: game.turn() === 'w' ? '#90caf9' : '#666',
                boxShadow: game.turn() === 'w' ? '0 0 6px #90caf955' : 'none',
              }} />
              <Typography variant="caption" fontWeight={700}
                color={isGameOver ? 'error.main' : 'text.secondary'}>
                {isGameOver ? '⚑ Game Over' : `${turnLabel} to move`}
              </Typography>
              {loading && <CircularProgress size={12} thickness={5} sx={{ ml: 0.5 }} />}
            </Box>

            <Stack direction="row" spacing={0.25}>
              <Tooltip title="Undo last move"><span>
                <IconButton size="small" onClick={handleUndo} disabled={history.length === 0}
                  sx={{ width: 26, height: 26 }}>
                  <UndoIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </span></Tooltip>
              <Tooltip title="Reset to start">
                <IconButton size="small" onClick={handleReset} sx={{ width: 26, height: 26 }}>
                  <RestartAltIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={copied ? '✓ Copied!' : 'Copy move list'}><span>
                <IconButton size="small" onClick={() => {
                  navigator.clipboard.writeText(history.join(' '));
                  setCopied(true); setTimeout(() => setCopied(false), 2000);
                }} disabled={history.length === 0} sx={{ width: 26, height: 26 }}>
                  <ContentCopyIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </span></Tooltip>
            </Stack>
          </Box>

          {/* Board */}
          <Box sx={{
            borderRadius: 2, overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
            border: '2px solid rgba(144,202,249,0.18)',
            width: BOARD_SIZE, height: BOARD_SIZE,
          }}>
            <Chessboard
              key={game.fen()}
              options={{
                position: game.fen(),
                boardStyle: { width: BOARD_SIZE, height: BOARD_SIZE },
                darkSquareStyle: { backgroundColor: '#2c4a6e' },
                lightSquareStyle: { backgroundColor: '#8ab4d4' },
                squareStyles: squareStyles,
                animationDurationInMs: 150,
                allowDragging: true,
                onPieceDrop: onPieceDrop,
                onSquareClick: onSquareClick,
              }}
              boardWidth={BOARD_SIZE}
              position={game.fen()}
              onPieceDrop={onPieceDrop}
              onSquareClick={onSquareClick}
              customDarkSquareStyle={{ backgroundColor: '#2c4a6e' }}
              customLightSquareStyle={{ backgroundColor: '#8ab4d4' }}
              customSquareStyles={squareStyles}
            />
          </Box>

          {/* Move history: compact 2-col grid */}
          <Box sx={{
            mt: 1.5, px: 1.5, py: 1, borderRadius: 2,
            bgcolor: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(144,202,249,0.08)',
            maxHeight: 80, overflowY: 'auto',
          }}>
            {history.length === 0 ? (
              <Typography variant="caption" color="text.disabled">
                No moves yet — click or drag any white piece
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: '22px 1fr 1fr', gap: '1px 4px' }}>
                {Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => (
                  <React.Fragment key={i}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', pt: '1px' }}>
                      {i + 1}.
                    </Typography>
                    {/* white */}
                    <Typography variant="caption" fontFamily="monospace"
                      fontWeight={i * 2 === history.length - 1 ? 800 : 400}
                      color={i * 2 === history.length - 1 ? 'primary.main' : 'text.primary'}
                      sx={{ fontSize: '0.73rem' }}>
                      {history[i * 2]}
                    </Typography>
                    {/* black */}
                    <Typography variant="caption" fontFamily="monospace"
                      fontWeight={i * 2 + 1 === history.length - 1 ? 800 : 400}
                      color={i * 2 + 1 === history.length - 1 ? 'primary.main' : 'text.secondary'}
                      sx={{ fontSize: '0.73rem' }}>
                      {history[i * 2 + 1] ?? ''}
                    </Typography>
                  </React.Fragment>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {/* ══ RIGHT: Analysis panel ══ */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

          {/* Section label + turn badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon sx={{ fontSize: 16, color: '#90caf9' }} />
            <Typography variant="subtitle1" fontWeight={700}>
              Step-by-Step Move Analysis
            </Typography>
            <Chip label={`${turnLabel}'s turn`} size="small" sx={{
              ml: 'auto',
              bgcolor: game.turn() === 'w' ? 'rgba(240,240,240,0.1)' : 'rgba(80,80,80,0.25)',
              color: game.turn() === 'w' ? '#e2e8f0' : '#94a3b8',
              fontWeight: 700, fontSize: '0.65rem',
            }} />
          </Box>

          {/* Context line */}
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            Mined from <b style={{ color: '#90caf9' }}>709,000+</b> tournament games.
            Click any recommendation to auto-play it on the board.
          </Typography>

          {/* Recommendation cards */}
          {loading ? (
            <Stack spacing={1.2}>
              {[82, 71, 54, 43].map((w, i) => (
                <Box key={i} sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ width: '40%', height: 12, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1 }} />
                    <Box sx={{ width: '15%', height: 12, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1 }} />
                  </Box>
                  <LinearProgress variant="determinate" value={w}
                    sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)',
                      '& .MuiLinearProgress-bar': { bgcolor: 'rgba(255,255,255,0.15)' } }} />
                </Box>
              ))}
            </Stack>
          ) : recs.length === 0 ? (
            <Alert severity="info" variant="outlined" sx={{ fontSize: '0.78rem' }}>
              No move patterns found for this position. Try undoing or making an alternate move.
            </Alert>
          ) : (
            <Stack spacing={1}>
              {recs.map((rec, idx) => {
                const detail  = getMoveDetail(game, rec.move);
                const meta    = detail ? PIECE_META[detail.piece] : null;
                const cc      = confColor(rec.confidence);
                const isActive = activeRec === rec.move;

                return (
                  <Paper key={rec.move + '-' + idx} elevation={0} onClick={() => applySuggestion(rec.move)}
                    sx={{
                      p: 1.3, borderRadius: 2, cursor: 'pointer',
                      border: `1px solid ${isActive ? cc : 'rgba(144,202,249,0.12)'}`,
                      bgcolor: isActive ? `${cc}12` : 'rgba(255,255,255,0.025)',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        border: `1px solid ${cc}88`,
                        bgcolor: `${cc}0d`,
                        transform: 'translateX(4px)',
                        boxShadow: `4px 0 16px ${cc}22`,
                      },
                    }}>

                    {/* Row 1: rank · piece icon · SAN · Theme Name · Confidence */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {/* rank circle */}
                      <Box sx={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: `${cc}25`, border: `1.5px solid ${cc}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.62rem', fontWeight: 800, color: cc,
                      }}>
                        {idx + 1}
                      </Box>

                      {/* piece unicode */}
                      {meta && (
                        <Typography sx={{ fontSize: '1.2rem', lineHeight: 1, userSelect: 'none' }}>
                          {meta.sym}
                        </Typography>
                      )}

                      {/* SAN notation */}
                      <Typography fontWeight={800} fontFamily="monospace" fontSize="1.05rem"
                        color="text.primary" sx={{ letterSpacing: 0.5 }}>
                        {rec.move}
                      </Typography>

                      {/* piece name + from→to */}
                      {detail && meta && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                          {meta.name}
                          <Box component="span" sx={{ color: cc, fontWeight: 700, ml: 0.4 }}>
                            {detail.from}→{detail.to}
                          </Box>
                        </Typography>
                      )}

                      {/* confidence % */}
                      <Typography variant="body2" fontWeight={800} color={cc} sx={{ ml: 'auto', flexShrink: 0 }}>
                        {(rec.confidence * 100).toFixed(0)}% <span style={{ fontSize: '0.65rem', fontWeight: 500, color: '#94a3b8' }}>conf</span>
                      </Typography>
                    </Box>

                    {/* Strategic / Pattern name & description */}
                    {(rec.name || rec.description) && (
                      <Box sx={{ mb: 0.7, pl: 3.7 }}>
                        {rec.name && (
                          <Typography variant="caption" fontWeight={700} sx={{ color: '#90caf9', display: 'block', fontSize: '0.72rem' }}>
                            {rec.name}
                          </Typography>
                        )}
                        {rec.description && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.67rem', lineHeight: 1.25 }}>
                            {rec.description}
                          </Typography>
                        )}
                      </Box>
                    )}

                    {/* Row 2: confidence bar */}
                    <LinearProgress variant="determinate" value={rec.confidence * 100}
                      sx={{
                        mb: 0.8, height: 4, borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.05)',
                        '& .MuiLinearProgress-bar': { background: cc },
                      }}
                    />

                    {/* Row 3: stat chips + win rates */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.75 }}>
                      <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                        <Chip size="small"
                          label={`Support: ${(rec.support * 100).toFixed(1)}%`}
                          sx={{ fontSize: '0.6rem', height: 18,
                            bgcolor: 'rgba(206,147,216,0.1)', color: '#ce93d8',
                            '& .MuiChip-label': { px: 0.75 } }} />
                        <Chip size="small"
                          label={`Lift: ${rec.lift.toFixed(2)}×`}
                          sx={{ fontSize: '0.6rem', height: 18,
                            bgcolor: 'rgba(102,187,106,0.1)', color: '#66bb6a',
                            '& .MuiChip-label': { px: 0.75 } }} />
                        {idx === 0 && (
                          <Chip size="small" label="Top Pattern"
                            sx={{ fontSize: '0.6rem', height: 18,
                              bgcolor: `${cc}25`, color: cc, fontWeight: 700,
                              '& .MuiChip-label': { px: 0.75 } }} />
                        )}
                      </Box>

                      {/* Mini Outcome Distribution */}
                      {rec.whiteWin !== undefined && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#90caf9' }}>
                            W: {rec.whiteWin}%
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                            D: {rec.draw}%
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#ef9a9a' }}>
                            B: {rec.blackWin}%
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}

          <Divider sx={{ opacity: 0.25, mt: 0.5 }} />

          {/* ── What each number means (plain English) ── */}
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.04)' }}>
            <Typography variant="caption" fontWeight={700} color="text.disabled"
              letterSpacing={0.5} display="block" sx={{ mb: 0.75 }}>
              WHAT DO THESE NUMBERS MEAN?
            </Typography>
            {[
              {
                pct: '82%', label: 'Confidence',
                explain: 'In 82 out of 100 games that reached this position, players played this move next.',
                color: '#90caf9',
              },
              {
                pct: 'Support',  label: 'Support',
                explain: 'What % of ALL 709k games ever contained this move sequence.',
                color: '#ce93d8',
              },
              {
                pct: 'Lift >1', label: 'Lift',
                explain: 'Lift 1.7× means this move is 70% more common here than in a random game.',
                color: '#66bb6a',
              },
            ].map((item) => (
              <Box key={item.label} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'flex-start' }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: item.color,
                  mt: '5px', flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary" lineHeight={1.5}>
                  <Box component="span" sx={{ fontWeight: 700, color: item.color }}>{item.label}: </Box>
                  {item.explain}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
