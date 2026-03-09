'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Typography, Chip, Stack, Divider,
  Checkbox, FormControlLabel, Button, CircularProgress,
  Alert, Snackbar, Paper,
} from '@mui/material';
import { IconShield, IconShieldCheck } from '@tabler/icons-react';
import { DashboardCard, PageContainer } from '@/shared/ui';

interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: 'PAGE' | 'API';
}

interface RolePermission {
  permission: Permission;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  rolePermissions: RolePermission[];
  _count: { users: number };
}

const RoleManagementView = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permRes] = await Promise.all([
        fetch('/api/admin/roles').then((r) => r.json()),
        fetch('/api/admin/permissions').then((r) => r.json()),
      ]);
      setRoles(rolesRes.roles ?? []);
      setAllPermissions(permRes.permissions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectRole = (role: Role) => {
    setSelectedRole(role);
    setCheckedIds(new Set(role.rolePermissions.map((rp) => rp.permission.id)));
  };

  const togglePermission = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: Array.from(checkedIds) }),
      });
      if (res.ok) {
        setSnackbar({ open: true, message: '권한이 저장되었습니다.', severity: 'success' });
        await fetchData();
      } else {
        setSnackbar({ open: true, message: '저장에 실패했습니다.', severity: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const pagePermissions = allPermissions.filter((p) => p.type === 'PAGE');
  const apiPermissions = allPermissions.filter((p) => p.type === 'API');

  return (
    <PageContainer title="권한 관리" description="역할별 페이지 및 API 권한 관리">
      <Grid container spacing={3}>
        {/* 역할 목록 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <DashboardCard title="역할 목록" subtitle="역할을 선택하여 권한을 관리하세요">
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={1.5} mt={1}>
                {roles.map((role) => (
                  <Paper
                    key={role.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      borderColor: selectedRole?.id === role.id ? 'primary.main' : 'divider',
                      bgcolor: selectedRole?.id === role.id ? 'primary.50' : 'transparent',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' },
                      transition: 'all 0.15s',
                    }}
                    onClick={() => selectRole(role)}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {selectedRole?.id === role.id
                          ? <IconShieldCheck size={18} color="var(--mui-palette-primary-main)" />
                          : <IconShield size={18} />}
                        <Typography variant="subtitle2" fontWeight={600}>{role.name}</Typography>
                      </Stack>
                      <Chip label={`${role._count.users}명`} size="small" variant="outlined" />
                    </Stack>
                    {role.description && (
                      <Typography variant="caption" color="textSecondary" mt={0.5} display="block">
                        {role.description}
                      </Typography>
                    )}
                    <Stack direction="row" flexWrap="wrap" gap={0.5} mt={1}>
                      {role.rolePermissions.slice(0, 4).map((rp) => (
                        <Chip key={rp.permission.id} label={rp.permission.name} size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />
                      ))}
                      {role.rolePermissions.length > 4 && (
                        <Chip label={`+${role.rolePermissions.length - 4}`} size="small" sx={{ height: 18, fontSize: 10 }} />
                      )}
                    </Stack>
                  </Paper>
                ))}
                {roles.length === 0 && (
                  <Typography color="textSecondary" variant="body2" textAlign="center" py={2}>
                    역할이 없습니다.
                  </Typography>
                )}
              </Stack>
            )}
          </DashboardCard>
        </Grid>

        {/* 권한 편집 패널 */}
        <Grid size={{ xs: 12, md: 8 }}>
          <DashboardCard
            title={selectedRole ? `${selectedRole.name} 권한 설정` : '역할 선택'}
            subtitle={selectedRole ? `권한을 선택 후 저장하세요 (${checkedIds.size}개 선택됨)` : '좌측에서 역할을 선택하세요'}
            action={
              selectedRole && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={14} /> : undefined}
                >
                  저장
                </Button>
              )
            }
          >
            {!selectedRole ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                py={8}
                color="text.secondary"
              >
                <IconShield size={48} opacity={0.3} />
                <Typography mt={2} color="textSecondary">역할을 선택하면 권한을 편집할 수 있습니다.</Typography>
              </Box>
            ) : allPermissions.length === 0 ? (
              <Box py={4} textAlign="center">
                <Typography color="textSecondary" variant="body2">
                  등록된 권한이 없습니다. 시스템 초기화 시 권한 데이터를 시드해주세요.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={3} mt={1}>
                {pagePermissions.length > 0 && (
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                      <Chip label="PAGE" size="small" color="primary" />
                      <Typography variant="subtitle2" fontWeight={600}>페이지 접근 권한</Typography>
                    </Stack>
                    <Grid container spacing={1}>
                      {pagePermissions.map((p) => (
                        <Grid size={{ xs: 12, sm: 6 }} key={p.id}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={checkedIds.has(p.id)}
                                onChange={() => togglePermission(p.id)}
                                size="small"
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                                {p.description && (
                                  <Typography variant="caption" color="textSecondary">{p.description}</Typography>
                                )}
                              </Box>
                            }
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                {pagePermissions.length > 0 && apiPermissions.length > 0 && <Divider />}

                {apiPermissions.length > 0 && (
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                      <Chip label="API" size="small" color="secondary" />
                      <Typography variant="subtitle2" fontWeight={600}>API 접근 권한</Typography>
                    </Stack>
                    <Grid container spacing={1}>
                      {apiPermissions.map((p) => (
                        <Grid size={{ xs: 12, sm: 6 }} key={p.id}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={checkedIds.has(p.id)}
                                onChange={() => togglePermission(p.id)}
                                size="small"
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ fontFamily: 'monospace' }}>
                                  {p.code}
                                </Typography>
                              </Box>
                            }
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </Stack>
            )}
          </DashboardCard>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
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

export default RoleManagementView;
