'use client';
import { Typography } from '@mui/material';
import { PageContainer, DashboardCard } from '@/shared/ui';

const SamplePageView = () => {
  return (
    <PageContainer title="Sample Page" description="this is Sample page">
      <DashboardCard title="Sample Page">
        <Typography>This is a sample page</Typography>
      </DashboardCard>
    </PageContainer>
  );
};

export default SamplePageView;
