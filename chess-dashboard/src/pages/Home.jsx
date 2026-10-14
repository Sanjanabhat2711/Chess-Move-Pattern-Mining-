/**
 * Home.jsx — Project overview and dataset info
 */
import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Divider,
  LinearProgress, Stack,
} from '@mui/material';
import { fetchDatasetInfo } from '../services/api';

export default function Home() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDatasetInfo().then((d) => { setInfo(d); setLoading(false); });
  }, []);

  return (
    <Box>
      {/* ── Hero ── */}
      <Box
        sx={{
          mb: 4,
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(144,202,249,0.12) 0%, rgba(206,147,216,0.08) 50%, rgba(102,187,106,0.06) 100%)',
          border: '1px solid rgba(144,202,249,0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* decorative chess board pattern */}
        <Box
          sx={{
            position: 'absolute', right: -20, top: -20,
            width: 200, height: 200, opacity: 0.04,
            backgroundImage: `repeating-conic-gradient(#90caf9 0% 25%, transparent 0% 50%)`,
            backgroundSize: '40px 40px',
            borderRadius: 2,
          }}
        />
        <Typography variant="h3" fontWeight={800} gutterBottom>
          Chess Opening{' '}
          <Box component="span" sx={{ color: 'primary.main' }}>Pattern Mining</Box>
        </Typography>
      </Box>

      {/* ── Dataset Info ── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Top Openings by Volume
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Most frequently played ECO opening categories.
              </Typography>
              {loading ? (
                <LinearProgress />
              ) : (
                <Stack spacing={1.5}>
                  {info.topOpenings.map((o, i) => (
                    <Box key={o.eco}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={o.eco} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                          <Typography variant="body2" color="text.primary">{o.name}</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                          {o.count.toLocaleString()}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(o.count / info.topOpenings[0].count) * 100}
                        sx={{
                          '& .MuiLinearProgress-bar': {
                            background: `hsl(${200 + i * 20}, 70%, 65%)`,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
