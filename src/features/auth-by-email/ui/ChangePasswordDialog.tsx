"use client";
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordInput } from "@/shared/lib/schemas";
import { authApi, ApiError } from "@/shared/api";

interface Props {
  open: boolean;
  onSuccess: () => void;
}

const ChangePasswordDialog = ({ open, onSuccess }: Props) => {
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onChange",
  });

  const onSubmit = async (formData: ChangePasswordInput) => {
    setServerError(null);
    try {
      await authApi.changePassword(formData);
      reset();
      onSuccess();
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "비밀번호 변경에 실패했습니다.");
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>비밀번호 변경 필요</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            초기 비밀번호를 사용 중이거나 비밀번호 유효기간이 만료되었습니다.
            로그인하려면 새 비밀번호로 변경해야 합니다.
          </Alert>

          <Stack spacing={2} mt={1}>
            <Box>
              <Typography variant="subtitle2" mb={0.5}>현재 비밀번호</Typography>
              <TextField
                type="password"
                fullWidth
                size="small"
                error={!!errors.currentPassword}
                helperText={errors.currentPassword?.message}
                {...register("currentPassword")}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" mb={0.5}>새 비밀번호</Typography>
              <TextField
                type={showNewPw ? "text" : "password"}
                fullWidth
                size="small"
                placeholder="8자 이상, 영문+숫자+특수문자 조합"
                error={!!errors.newPassword}
                helperText={errors.newPassword?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowNewPw((v) => !v)}>
                        {showNewPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                {...register("newPassword")}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" mb={0.5}>새 비밀번호 확인</Typography>
              <TextField
                type={showConfirmPw ? "text" : "password"}
                fullWidth
                size="small"
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowConfirmPw((v) => !v)}>
                        {showConfirmPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                {...register("confirmPassword")}
              />
            </Box>

            <Typography variant="caption" color="textSecondary">
              비밀번호 정책: 8자 이상 / 영문·숫자·특수문자 3종 조합 / 연속·반복 문자 금지
            </Typography>
          </Stack>

          {serverError && (
            <Alert severity="error" sx={{ mt: 2 }}>{serverError}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
            {isSubmitting ? "변경 중..." : "비밀번호 변경 후 로그인"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ChangePasswordDialog;
