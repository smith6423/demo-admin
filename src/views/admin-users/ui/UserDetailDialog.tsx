'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Stack, Chip, Grid, Divider, FormControl,
  InputLabel, Select, MenuItem, CircularProgress, Box,
} from '@mui/material';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isTwoFactorEnabled: boolean;
  loginFailCount: number;
  lockedAt: string | null;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  passwordChangedAt: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: { id: string; name: string };
}

interface RoleOption { id: string; name: string }

interface Props {
  userId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Typography variant="caption" color="textSecondary" display="block">{label}</Typography>
      <Box mt={0.3}>{children}</Box>
    </Grid>
  );
}

export const UserDetailDialog = ({ userId, onClose, onUpdated }: Props) => {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) { setUser(null); return; }
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/users/${userId}`).then((r) => r.json()),
      fetch('/api/admin/roles').then((r) => r.json()),
    ]).then(([userData, rolesData]) => {
      setUser(userData.user);
      setSelectedRoleId(userData.user?.role?.id ?? '');
      setRoles(rolesData.roles?.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })) ?? []);
    }).finally(() => setLoading(false));
  }, [userId]);

  const handleSaveRole = async () => {
    if (!userId || !selectedRoleId) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: selectedRoleId }),
      });
      onUpdated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleString('ko-KR') : '-';

  return (
    <Dialog open={!!userId} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>사용자 상세 정보</DialogTitle>
      <DialogContent>
        {loading || !user ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3} mt={1}>
            <Grid container spacing={2}>
              <InfoRow label="이름">
                <Typography variant="body2" fontWeight={600}>{user.name}</Typography>
              </InfoRow>
              <InfoRow label="이메일">
                <Typography variant="body2">{user.email}</Typography>
              </InfoRow>
              <InfoRow label="상태">
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {user.deletedAt
                    ? <Chip label="삭제됨" color="default" size="small" />
                    : user.lockedAt
                    ? <Chip label="잠금" color="error" size="small" />
                    : !user.isActive
                    ? <Chip label="비활성" color="warning" size="small" />
                    : <Chip label="활성" color="success" size="small" />}
                  {user.mustChangePassword && <Chip label="비밀번호 변경 필요" color="warning" size="small" />}
                  {user.isTwoFactorEnabled && <Chip label="2FA 활성" color="info" size="small" />}
                </Stack>
              </InfoRow>
              <InfoRow label="로그인 실패 횟수">
                <Typography variant="body2" color={user.loginFailCount >= 3 ? 'error' : 'textPrimary'}>
                  {user.loginFailCount}회
                </Typography>
              </InfoRow>
              <InfoRow label="마지막 로그인">{<Typography variant="body2">{fmt(user.lastLoginAt)}</Typography>}</InfoRow>
              <InfoRow label="계정 잠금 일시">{<Typography variant="body2">{fmt(user.lockedAt)}</Typography>}</InfoRow>
              <InfoRow label="비밀번호 변경일">{<Typography variant="body2">{fmt(user.passwordChangedAt)}</Typography>}</InfoRow>
              <InfoRow label="가입일">{<Typography variant="body2">{fmt(user.createdAt)}</Typography>}</InfoRow>
            </Grid>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1.5}>역할 변경</Typography>
              <FormControl size="small" fullWidth>
                <InputLabel>역할</InputLabel>
                <Select
                  value={selectedRoleId}
                  label="역할"
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                >
                  {roles.map((r) => (
                    <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button
          variant="contained"
          onClick={handleSaveRole}
          disabled={saving || !user || selectedRoleId === user?.role?.id}
        >
          {saving ? <CircularProgress size={16} /> : '역할 저장'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
