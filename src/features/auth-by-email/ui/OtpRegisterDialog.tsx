"use client";
import {
  Alert,
  Box,
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
  qrDataUrl: string | null;
  registerSecret: string | null;
  regToken: string;
  error: string | null;
  loading: boolean;
  onTokenChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const OtpRegisterDialog = ({
  open,
  qrDataUrl,
  registerSecret,
  regToken,
  error,
  loading,
  onTokenChange,
  onConfirm,
  onClose,
}: Props) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>OTP 등록</DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="textSecondary" mb={2}>
        인증 앱(Google Authenticator 등)으로 아래 QR을 스캔하거나 키를 직접 입력하세요.
      </Typography>
      {qrDataUrl && (
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <img src={qrDataUrl} alt="QR코드" style={{ width: 200, height: 200 }} />
        </Box>
      )}
      {registerSecret && (
        <Typography
          variant="caption"
          color="textSecondary"
          display="block"
          mb={2}
          sx={{ wordBreak: "break-all" }}
        >
          수동 입력 키: {registerSecret}
        </Typography>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField
        label="OTP 코드 확인"
        value={regToken}
        onChange={(e) => onTokenChange(e.target.value)}
        fullWidth
        inputProps={{ maxLength: 6 }}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>취소</Button>
      <Button onClick={onConfirm} variant="contained" disabled={loading}>등록</Button>
    </DialogActions>
  </Dialog>
);

export default OtpRegisterDialog;
