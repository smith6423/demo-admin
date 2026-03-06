'use client';

import { Box, Button, Typography } from '@mui/material';
import { IconLock } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      gap={2}
      sx={{ bgcolor: 'background.default' }}
    >
      <IconLock size={64} color="var(--mui-palette-error-main)" />
      <Typography variant="h3" fontWeight={700}>
        403
      </Typography>
      <Typography variant="h5" color="textSecondary">
        접근 권한이 없습니다
      </Typography>
      <Typography variant="body2" color="textSecondary">
        이 페이지에 접근할 수 있는 권한이 없습니다. 관리자에게 문의하세요.
      </Typography>
      <Button variant="contained" onClick={() => router.push('/')}>
        대시보드로 이동
      </Button>
    </Box>
  );
}
