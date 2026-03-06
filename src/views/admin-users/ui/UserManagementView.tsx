'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Table, TableBody, TableCell, TableHead, TableRow,
  Typography, Chip, IconButton, Tooltip, TextField, MenuItem,
  Select, FormControl, InputLabel, Stack, Pagination, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions,
  Button, Alert, Snackbar, CircularProgress,
} from '@mui/material';
import {
  IconLock, IconLockOpen, IconKey, IconTrash, IconSearch,
  IconRefresh, IconEye,
} from '@tabler/icons-react';
import { DashboardCard, PageContainer } from '@/shared/ui';
import { AccessLogDialog } from './AccessLogDialog';
import { UserDetailDialog } from './UserDetailDialog';

interface UserRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  loginFailCount: number;
  lockedAt: string | null;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  passwordChangedAt: string;
  deletedAt: string | null;
  createdAt: string;
  role: { id: string; name: string };
}

type StatusFilter = '' | 'active' | 'locked' | 'deleted';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'active', label: '활성' },
  { value: 'locked', label: '잠금' },
  { value: 'deleted', label: '삭제됨' },
];

function getUserStatus(user: UserRow): { label: string; color: 'success' | 'error' | 'warning' | 'default' } {
  if (user.deletedAt) return { label: '삭제됨', color: 'default' };
  if (user.lockedAt) return { label: '잠금', color: 'error' };
  if (!user.isActive) return { label: '비활성', color: 'warning' };
  return { label: '활성', color: 'success' };
}

const UserManagementView = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; message: string; onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const [logDialogUserId, setLogDialogUserId] = useState<string | null>(null);
  const [detailDialogUserId, setDetailDialogUserId] = useState<string | null>(null);

  const LIMIT = 15;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch {
      showSnackbar('데이터를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const showSnackbar = (message: string, severity: 'success' | 'error') =>
    setSnackbar({ open: true, message, severity });

  const confirm = (title: string, message: string, onConfirm: () => void) =>
    setConfirmDialog({ open: true, title, message, onConfirm });

  const handleLock = (user: UserRow) => {
    confirm('계정 잠금', `${user.name}(${user.email}) 계정을 잠금 처리하시겠습니까?\n해당 사용자는 로그인할 수 없게 됩니다.`, async () => {
      const res = await fetch(`/api/admin/users/${user.id}/lock`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) { showSnackbar('계정이 잠금 처리되었습니다.', 'success'); fetchUsers(); }
      else showSnackbar(data.message ?? '잠금 처리에 실패했습니다.', 'error');
    });
  };

  const handleUnlock = (user: UserRow) => {
    confirm('계정 잠금 해제', `${user.name}(${user.email}) 계정의 잠금을 해제하시겠습니까?`, async () => {
      const res = await fetch(`/api/admin/users/${user.id}/unlock`, { method: 'POST' });
      if (res.ok) { showSnackbar('계정 잠금이 해제되었습니다.', 'success'); fetchUsers(); }
      else showSnackbar('잠금 해제에 실패했습니다.', 'error');
    });
  };

  const handleResetPassword = (user: UserRow) => {
    confirm(
      '비밀번호 초기화',
      `${user.name}(${user.email}) 계정의 비밀번호를 초기화하시겠습니까?\n초기 비밀번호(RESET_PASSWORD)로 변경되며, 다음 로그인 시 반드시 변경해야 합니다.`,
      async () => {
        const res = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          showSnackbar('비밀번호가 초기화되었습니다. 사용자는 다음 로그인 시 비밀번호를 변경해야 합니다.', 'success');
          fetchUsers();
        } else showSnackbar(data.message ?? '비밀번호 초기화에 실패했습니다.', 'error');
      },
    );
  };

  const handleDelete = (user: UserRow) => {
    confirm('계정 삭제', `${user.name}(${user.email}) 계정을 삭제(비활성화)하시겠습니까? 이 작업은 되돌릴 수 없습니다.`, async () => {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) { showSnackbar('계정이 삭제되었습니다.', 'success'); fetchUsers(); }
      else showSnackbar('계정 삭제에 실패했습니다.', 'error');
    });
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <PageContainer title="회원 관리" description="사용자 계정 관리 및 접속 이력 조회">
      <DashboardCard
        title="회원 관리"
        subtitle={`전체 ${total}명`}
        action={
          <Tooltip title="새로고침">
            <IconButton onClick={fetchUsers} size="small">
              <IconRefresh size={18} />
            </IconButton>
          </Tooltip>
        }
      >
        {/* 검색 필터 */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
          <TextField
            size="small"
            placeholder="이름 또는 이메일 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            InputProps={{ endAdornment: (
              <IconButton size="small" onClick={() => { setSearch(searchInput); setPage(1); }}>
                <IconSearch size={16} />
              </IconButton>
            )}}
            sx={{ minWidth: 240 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>상태</InputLabel>
            <Select
              value={status}
              label="상태"
              onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1); }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Box sx={{ overflow: 'auto', width: { xs: '280px', sm: 'auto' } }}>
          <Table aria-label="회원 관리 테이블" sx={{ whiteSpace: 'nowrap', mt: 1 }}>
            <TableHead>
              <TableRow>
                {['이름 / 이메일', '역할', '상태', '마지막 로그인', '비밀번호 변경일', '로그인 실패', '작업'].map((h) => (
                  <TableCell key={h}>
                    <Typography variant="subtitle2" fontWeight={600}>{h}</Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">사용자가 없습니다.</Typography>
                  </TableCell>
                </TableRow>
              ) : users.map((user) => {
                const st = getUserStatus(user);
                return (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>{user.name}</Typography>
                      <Typography variant="caption" color="textSecondary">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={user.role.name} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip label={st.label} color={st.color} size="small" sx={{ px: '4px' }} />
                        {user.mustChangePassword && (
                          <Chip label="비밀번호 변경 필요" size="small" color="warning" sx={{ px: '4px' }} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString('ko-KR')
                          : '없음'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {new Date(user.passwordChangedAt).toLocaleDateString('ko-KR')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={user.loginFailCount >= 3 ? 'error' : 'textSecondary'}
                        fontWeight={user.loginFailCount >= 3 ? 600 : 400}
                      >
                        {user.loginFailCount}회
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="상세 정보">
                          <IconButton size="small" onClick={() => setDetailDialogUserId(user.id)}>
                            <IconEye size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="접속 이력">
                          <IconButton size="small" onClick={() => setLogDialogUserId(user.id)}>
                            <IconSearch size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="비밀번호 초기화">
                          <IconButton size="small" color="primary" onClick={() => handleResetPassword(user)}>
                            <IconKey size={16} />
                          </IconButton>
                        </Tooltip>
                        {user.lockedAt ? (
                          <Tooltip title="잠금 해제">
                            <IconButton size="small" color="error" onClick={() => handleUnlock(user)}>
                              <IconLock size={16} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="계정 잠금">
                            <IconButton size="small" color="success" onClick={() => handleLock(user)}>
                              <IconLockOpen size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!user.deletedAt && (
                          <Tooltip title="계정 삭제">
                            <IconButton size="small" color="error" onClick={() => handleDelete(user)}>
                              <IconTrash size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={3}>
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" />
          </Box>
        )}
      </DashboardCard>

      {/* 접속 이력 다이얼로그 */}
      <AccessLogDialog
        userId={logDialogUserId}
        onClose={() => setLogDialogUserId(null)}
      />

      {/* 사용자 상세 다이얼로그 */}
      <UserDetailDialog
        userId={detailDialogUserId}
        onClose={() => setDetailDialogUserId(null)}
        onUpdated={fetchUsers}
      />

      {/* 확인 다이얼로그 */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog((p) => ({ ...p, open: false }))}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ whiteSpace: 'pre-line' }}>{confirmDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog((p) => ({ ...p, open: false }))}>취소</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => { confirmDialog.onConfirm(); setConfirmDialog((p) => ({ ...p, open: false })); }}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>

      {/* 알림 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default UserManagementView;
