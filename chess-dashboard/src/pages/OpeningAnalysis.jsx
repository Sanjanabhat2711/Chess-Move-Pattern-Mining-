/**
 * OpeningAnalysis.jsx — ECO opening selector + multi-chart analysis
 */
import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, FormControl,
  InputLabel, Select, MenuItem, Chip, Stack, LinearProgress,
  Skeleton, Alert, Table, TableHead, TableBody, TableRow,
  TableCell, Divider,
} from '@mui/material';
import {
  Tooltip as RTooltip, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, BarChart, Bar,
} from 'recharts';
import { fetchOpenings, fetchOpeningAnalysis } from '../services/api';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: '#111827', border: '1px solid rgba(144,202,249,0.2)', borderRadius: 2, p: 1.5 }}>
      {payload.map((p) => (
        <Typography key={p.name} variant="caption" display="block" color={p.color || 'text.primary'}>
          {p.name}: <b>{p.value}</b>
        </Typography>
      ))}
    </Box>
  );
};

export default function OpeningAnalysis() {
  const [openings, setOpenings] = useState([]);
  const [selectedEco, setSelectedEco] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    fetchOpenings().then((list) => {
      setOpenings(list);
      if (list.length > 0) setSelectedEco(list[0].eco);
      setInitLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedEco) return;
    setLoading(true);
    setAnalysis(null);
    fetchOpeningAnalysis(selectedEco).then((d) => {
      setAnalysis(d);
      setLoading(false);
    });
  }, [selectedEco]);

  const selectedName = openings.find((o) => o.eco === selectedEco)?.name || '';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Opening <Box component="span" sx={{ color: 'primary.main' }}>Analysis</Box>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select an ECO opening code to explore frequent move sequences, win/draw/loss rates,
          and the top association rules mined from tournament games.
        </Typography>
      </Box>

      {/* Opening selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={5} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>ECO Opening</InputLabel>
                {initLoading ? (
                  <Skeleton height={40} />
                ) : (
                  <Select
                    value={selectedEco}
                    onChange={(e) => setSelectedEco(e.target.value)}
                    label="ECO Opening"
                  >
                    {openings.map((o) => (
                      <MenuItem key={o.eco} value={o.eco}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={o.eco} size="small" color="primary" sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20 }} />
                          <Typography variant="body2">{o.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </FormControl>
            </Grid>
            {selectedName && (
              <Grid item xs={12} sm={7}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip label={selectedEco} color="primary" fontWeight={700} />
                  <Typography variant="h6" fontWeight={700}>{selectedName}</Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Fetching analysis data…
          </Typography>
        </Box>
      )}

      {analysis && (
        <Grid container spacing={3}>
          {/* ── Frequent Sequences ── */}
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Top Frequent Move Sequences
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  PrefixSpan-mined sequential patterns ordered by support
                </Typography>

                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={analysis.topSequences.map((s) => ({
                      name: s.sequence.split(' → ').slice(0, 3).join(' → ') + '…',
                      support: +(s.support * 100).toFixed(1),
                      frequency: s.frequency,
                    }))}
                    layout="vertical"
                    margin={{ left: 8, right: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} width={110} />
                    <RTooltip content={<CustomTooltip />} formatter={(v, n) => [n === 'support' ? `${v}%` : v, n]} />
                    <Bar dataKey="support" fill="#ce93d8" radius={[0, 4, 4, 0]} name="Support %" />
                  </BarChart>
                </ResponsiveContainer>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1}>
                  {analysis.topSequences.map((seq, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 1.5, borderRadius: 1.5,
                        bgcolor: 'rgba(206,147,216,0.05)',
                        border: '1px solid rgba(206,147,216,0.1)',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontFamily="monospace" color="secondary.light" fontWeight={600}>
                          {seq.sequence}
                        </Typography>
                        <Chip
                          label={`${seq.frequency.toLocaleString()} games`}
                          size="small"
                          sx={{ bgcolor: 'rgba(206,147,216,0.12)', color: '#ce93d8', fontSize: '0.65rem', height: 18 }}
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={seq.support * 100 / analysis.topSequences[0].support}
                        sx={{
                          bgcolor: 'rgba(206,147,216,0.1)',
                          '& .MuiLinearProgress-bar': { background: '#ce93d8' },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* ── Top Rules ── */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Top Association Rules
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Highest-lift FP-Growth rules for this opening
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>If moves…</TableCell>
                      <TableCell>Then</TableCell>
                      <TableCell>Lift</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analysis.topRules.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                            {r.antecedents}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={r.consequent}
                            size="small"
                            color="primary"
                            sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            color={r.lift >= 1.6 ? 'success.main' : r.lift >= 1.3 ? 'warning.main' : 'primary.main'}
                          >
                            {r.lift.toFixed(2)}×
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {!loading && !analysis && !initLoading && (
        <Alert severity="info" variant="outlined">
          Select an opening above to view its analysis.
        </Alert>
      )}
    </Box>
  );
}
