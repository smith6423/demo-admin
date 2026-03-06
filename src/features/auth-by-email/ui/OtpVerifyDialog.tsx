"use client";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

interface Props {
  open: boolean;
  otp: string;
  error: string | null;
  loading: boolean;
  onOtpChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const OtpVerifyDialog = ({ open, otp, error, loading, onOtpChange, onConfirm, onClose }: Props) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>OTP 인증</DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="textSecondary" mb={2}>
        인증 앱의 6자리 코드를 입력하세요.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField
        label="OTP 코드"
        autoFocus
        value={otp}
        onChange={(e) => onOtpChange(e.target.value)}
        fullWidth
        inputProps={{ maxLength: 6 }}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>취소</Button>
      <Button onClick={onConfirm} variant="contained" disabled={loading}>확인</Button>
    </DialogActions>
  </Dialog>
);

export default OtpVerifyDialog;
