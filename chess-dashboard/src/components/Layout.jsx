/**
 * Layout.jsx — Sidebar navigation shell
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Typography, Divider, IconButton, Tooltip,
  useMediaQuery, AppBar, Toolbar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExtensionIcon from '@mui/icons-material/Extension';
import TableChartIcon from '@mui/icons-material/TableChart';
import InsightsIcon from '@mui/icons-material/Insights';
import MenuIcon from '@mui/icons-material/Menu';
import ChessIconSvg from './ChessIcon';

const DRAWER_W = 240;

const NAV_ITEMS = [
  { label: 'Move Recommender',   icon: <ExtensionIcon />,  path: '/recommender' },
  { label: 'Association Rules',  icon: <TableChartIcon />, path: '/rules' },
  { label: 'Opening Analysis',   icon: <InsightsIcon />,   path: '/openings' },
];

export default function Layout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ px: 3, py: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <ChessIconSvg size={36} />
        <Box>
          <Typography variant="subtitle1" fontWeight={800} color="primary.main" lineHeight={1.2}>
            Chess<span style={{ color: '#ce93d8' }}>ML</span>
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Pattern Mining
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Nav list */}
      <List sx={{ flex: 1, pt: 2, px: 1 }}>
        {NAV_ITEMS.map(({ label, icon, path }) => {
          const active = location.pathname === path;
          return (
            <ListItem key={path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNav(path)}
                selected={active}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    background: 'linear-gradient(90deg, rgba(144,202,249,0.18) 0%, rgba(144,202,249,0.06) 100%)',
                    borderLeft: '3px solid #90caf9',
                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                    '& .MuiListItemText-primary': { color: 'primary.main', fontWeight: 700 },
                  },
                  '&:hover': {
                    background: 'rgba(144,202,249,0.06)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: active ? 'primary.main' : 'text.secondary', minWidth: 40 }}>
                  {icon}
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 700 : 400 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer tag */}
      <Box sx={{ px: 3, py: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Pattern Mining Analysis
          <br />
          10 plies · Move sequence discovery
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Mobile AppBar */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            zIndex: (t) => t.zIndex.drawer + 1,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
          }}
        >
          <Toolbar>
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)}>
              <MenuIcon />
            </IconButton>
            <ChessIconSvg size={24} />
            <Typography variant="h6" fontWeight={700} sx={{ ml: 1 }}>
              ChessML
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: DRAWER_W,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_W,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
            backgroundImage: `linear-gradient(180deg, rgba(144,202,249,0.03) 0%, rgba(206,147,216,0.02) 100%)`,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          p: { xs: 2, md: 4 },
          mt: isMobile ? 8 : 0,
          overflow: 'hidden',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
