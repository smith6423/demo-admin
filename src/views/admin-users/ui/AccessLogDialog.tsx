'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
  Chip, Box, Pagination, CircularProgress, Stack, FormControl,
  InputLabel, Select, MenuItem,
} from '@mui/material';

interface LogRow {
  id: string;
  email: string;
  action: string;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; name: string } | null;
}

const ACTION_LABELS: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'info' | 'default' }> = {
  LOGIN: { label: '로그인 성공', color: 'success' },
  LOGOUT: { label: '로그아웃', color: 'default' },
  LOGIN_FAILED: { label: '로그인 실패', color: 'error' },
  ACCOUNT_LOCKED: { label: '계정 잠금', color: 'warning' },
  PASSWORD_CHANGED: { label: '비밀번호 변경', color: 'info' },
  SESSION_EXPIRED: { label: '세션 만료', color: 'default' },
};

const LIMIT = 10;

interface Props {
  userId: string | null;
  onClose: () => void;
}

export const AccessLogDialog = ({ userId, onClose }: Props) => {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId,
        page: String(page),
        limit: String(LIMIT),
        ...(action ? { action } : {}),
      });
      const res = await fetch(`/api/admin/access-logs?${params}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [userId, page, action]);

  useEffect(() => {
    if (userId) { setPage(1); setAction(''); }
  }, [userId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Dialog open={!!userId} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        접속 이력
        <Typography variant="caption" color="textSecondary" ml={1}>전체 {total}건</Typography>
      </DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={2} mb={2} mt={1}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>액션 필터</InputLabel>
            <Select value={action} label="액션 필터" onChange={(e) => { setAction(e.target.value); setPage(1); }}>
              <MenuItem value="">전체</MenuItem>
              {Object.entries(ACTION_LABELS).map(([key, val]) => (
                <MenuItem key={key} value={key}>{val.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Box sx={{ overflow: 'auto' }}>
          <Table size="small" sx={{ whiteSpace: 'nowrap' }}>
            <TableHead>
              <TableRow>
                {['일시', '액션', '성공여부', 'IP', 'User Agent'].map((h) => (
                  <TableCell key={h}>
                    <Typography variant="subtitle2" fontWeight={600}>{h}</Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={20} />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <Typography color="textSecondary" variant="body2">이력이 없습니다.</Typography>
                  </TableCell>
                </TableRow>
              ) : logs.map((log) => {
                const meta = ACTION_LABELS[log.action] ?? { label: log.action, color: 'default' as const };
                return (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(log.createdAt).toLocaleString('ko-KR')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={meta.label} color={meta.color} size="small" sx={{ px: '4px' }} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.success ? '성공' : '실패'}
                        color={log.success ? 'success' : 'error'}
                        size="small"
                        sx={{ px: '4px' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">{log.ipAddress ?? '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title={log.userAgent ?? ''}
                      >
                        {log.userAgent ? log.userAgent.substring(0, 40) + (log.userAgent.length > 40 ? '…' : '') : '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={2}>
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} size="small" />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};
