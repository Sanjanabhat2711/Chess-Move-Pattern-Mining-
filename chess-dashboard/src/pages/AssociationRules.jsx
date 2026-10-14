/**
 * AssociationRules.jsx — Searchable, sortable MUI table of ARM rules
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Chip, LinearProgress, Stack, ToggleButton,
  ToggleButtonGroup, Tooltip, Pagination, Select, MenuItem,
  FormControl, InputLabel, Alert, Skeleton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { fetchAssociationRules } from '../services/api';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

function MetricBar({ value, max = 1, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 40 }}>
        {(value * 100).toFixed(1)}%
      </Typography>
      <LinearProgress
        variant="determinate"
        value={(value / max) * 100}
        sx={{
          flex: 1, height: 5, borderRadius: 2,
          bgcolor: 'rgba(255,255,255,0.06)',
          '& .MuiLinearProgress-bar': { background: color },
        }}
      />
    </Box>
  );
}

function LiftBadge({ lift }) {
  const color = lift >= 1.6 ? '#66bb6a' : lift >= 1.3 ? '#ffa726' : '#90caf9';
  return (
    <Chip
      label={lift.toFixed(2)}
      size="small"
      sx={{
        bgcolor: `${color}22`, color, fontWeight: 700,
        fontSize: '0.72rem', border: `1px solid ${color}44`,
      }}
    />
  );
}

export default function AssociationRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('lift');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [minConf, setMinConf] = useState(0);

  useEffect(() => {
    fetchAssociationRules().then((d) => { setRules(d); setLoading(false); });
  }, []);

  const handleSort = (col) => {
    if (orderBy === col) setOrder(order === 'asc' ? 'desc' : 'asc');
    else { setOrderBy(col); setOrder('desc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rules
      .filter((r) =>
        (r.antecedents.toLowerCase().includes(q) || r.consequent.toLowerCase().includes(q)) &&
        r.confidence >= minConf
      )
      .sort((a, b) => {
        const sign = order === 'asc' ? 1 : -1;
        return (a[orderBy] - b[orderBy]) * sign;
      });
  }, [rules, search, order, orderBy, minConf]);

  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(filtered.length / rowsPerPage);

  const cols = [
    { id: 'antecedents', label: 'Antecedent Moves', sortable: false },
    { id: 'consequent', label: 'Recommended Move', sortable: false },
    { id: 'support', label: 'Support', sortable: true },
    { id: 'confidence', label: 'Confidence', sortable: true },
    { id: 'lift', label: 'Lift', sortable: true },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Association <Box component="span" sx={{ color: 'primary.main' }}>Rules</Box>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          FP-Growth derived rules showing which opening moves co-occur with high confidence.
          Sort by lift to find the most statistically significant patterns.
        </Typography>
      </Box>

      {/* Summary KPIs */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        {[
          { label: 'Total Rules', value: rules.length, color: '#90caf9' },
          { label: 'Avg Confidence', value: rules.length ? `${(rules.reduce((s, r) => s + r.confidence, 0) / rules.length * 100).toFixed(1)}%` : '—', color: '#ce93d8' },
          { label: 'Max Lift', value: rules.length ? Math.max(...rules.map((r) => r.lift)).toFixed(2) : '—', color: '#66bb6a' },
          { label: 'Filtered', value: filtered.length, color: '#ffa726' },
        ].map((k) => (
          <Box
            key={k.label}
            sx={{
              px: 2.5, py: 1.5, borderRadius: 2,
              border: `1px solid ${k.color}33`,
              bgcolor: `${k.color}0a`,
              minWidth: 120,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {k.label.toUpperCase()}
            </Typography>
            <Typography variant="h6" fontWeight={800} color={k.color}>
              {loading ? <Skeleton width={60} /> : k.value}
            </Typography>
          </Box>
        ))}
      </Stack>

      <Card>
        <CardContent sx={{ p: 3 }}>
          {/* Filters row */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Search moves…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
              }}
              sx={{ minWidth: 240 }}
            />

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Min Confidence</InputLabel>
              <Select
                value={minConf}
                onChange={(e) => { setMinConf(e.target.value); setPage(1); }}
                label="Min Confidence"
              >
                <MenuItem value={0}>All</MenuItem>
                <MenuItem value={0.5}>≥ 50%</MenuItem>
                <MenuItem value={0.6}>≥ 60%</MenuItem>
                <MenuItem value={0.7}>≥ 70%</MenuItem>
                <MenuItem value={0.8}>≥ 80%</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Rows</InputLabel>
              <Select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(e.target.value); setPage(1); }}
                label="Rows"
              >
                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                  <MenuItem key={n} value={n}>{n} per page</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ ml: 'auto' }}>
              <Typography variant="caption" color="text.secondary">
                {filtered.length} rule{filtered.length !== 1 ? 's' : ''} found
              </Typography>
            </Box>
          </Box>

          {loading ? (
            <Box>
              {[...Array(8)].map((_, i) => <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />)}
            </Box>
          ) : filtered.length === 0 ? (
            <Alert severity="info" variant="outlined">
              No rules match your filters. Try broadening the search.
            </Alert>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 32 }}>#</TableCell>
                      {cols.map((col) => (
                        <TableCell key={col.id}>
                          {col.sortable ? (
                            <TableSortLabel
                              active={orderBy === col.id}
                              direction={orderBy === col.id ? order : 'asc'}
                              onClick={() => handleSort(col.id)}
                            >
                              {col.label}
                            </TableSortLabel>
                          ) : col.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginated.map((row, idx) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {(page - 1) * rowsPerPage + idx + 1}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontFamily="monospace"
                            sx={{
                              bgcolor: 'rgba(144,202,249,0.06)',
                              px: 1, py: 0.3, borderRadius: 1,
                              display: 'inline-block',
                              maxWidth: 280,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.antecedents}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.consequent}
                            size="small"
                            color="primary"
                            sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 130 }}>
                          <MetricBar value={row.support} color="#ce93d8" />
                        </TableCell>
                        <TableCell sx={{ minWidth: 130 }}>
                          <MetricBar value={row.confidence} color="#90caf9" />
                        </TableCell>
                        <TableCell>
                          <LiftBadge lift={row.lift} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, v) => setPage(v)}
                  color="primary"
                  shape="rounded"
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
