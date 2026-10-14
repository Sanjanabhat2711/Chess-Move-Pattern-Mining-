/**
 * StatCard.jsx — Reusable KPI card with icon and gradient accent
 */
import React from 'react';
import { Card, CardContent, Box, Typography, Skeleton } from '@mui/material';

export default function StatCard({ icon, label, value, sub, color = '#90caf9', loading }) {
  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, left: 0,
          width: '4px',
          height: '100%',
          background: color,
          borderRadius: '12px 0 0 12px',
        },
      }}
    >
      <CardContent sx={{ py: 2.5, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.5}>
              {label.toUpperCase()}
            </Typography>
            {loading ? (
              <Skeleton width={100} height={40} sx={{ mt: 0.5 }} />
            ) : (
              <Typography variant="h4" fontWeight={800} color={color} sx={{ mt: 0.5, lineHeight: 1 }}>
                {value}
              </Typography>
            )}
            {sub && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {sub}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 48, height: 48,
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color,
              fontSize: 24,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
