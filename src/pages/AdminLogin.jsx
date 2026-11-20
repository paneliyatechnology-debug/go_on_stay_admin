import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Hotel, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck, KeyRound, Mail, CheckCircle, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { parseApiError } from '../utils/errorHandler';
import FieldError from '../components/FieldError';
import staffAuthService from '../services/staffAuthService';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Modals state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = enter identifier, 2 = enter token & new password
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');
  const [forgotErrorMsg, setForgotErrorMsg] = useState('');

  // Change Password Modal (for first-time/temporary password staff)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changeOldPassword, setChangeOldPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');
  const [changeConfirmPassword, setChangeConfirmPassword] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeErrorMsg, setChangeErrorMsg] = useState('');

  const { login, user, showToast } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (user && (user.is_staff || user.is_superuser || ['ADMIN', 'SUPER_ADMIN'].includes(user.role) || user.isStaff || user.role === 'STAFF')) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setErrorMsg('');

    if (!username.trim()) {
      const msg = 'Please enter your Admin username, email, or Staff Login ID.';
      setFieldErrors({ username: msg });
      setErrorMsg(msg);
      return;
    }
    if (!password) {
      const msg = 'Please enter your password.';
      setFieldErrors({ password: msg });
      setErrorMsg(msg);
      return;
    }

    setLoading(true);

    try {
      const result = await login(username.trim(), password);
      if (result.success) {
        if (result.mustChangePassword) {
          setChangeOldPassword(password);
          setShowChangePasswordModal(true);
        } else {
          navigate(from, { replace: true });
        }
      } else {
        const parsed = parseApiError({ response: { data: result } }, result.error || 'Authentication failed. Please verify credentials.');
        setErrorMsg(result.error || parsed.message);
        setFieldErrors(result.fieldErrors || { password: result.error || parsed.message });
      }
    } catch (err) {
      const parsed = parseApiError(err, 'Unable to connect to backend server. Make sure Django is running.');
      setErrorMsg(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setLoading(false);
    }
  };

  // Handle Staff Forgot Password (POST /api/staff/forgot-password/)
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotErrorMsg('');
    setForgotSuccessMsg('');

    if (!forgotIdentifier.trim()) {
      setForgotErrorMsg('Please enter your Staff Login ID or registered email.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await staffAuthService.forgotPassword(forgotIdentifier.trim());
      setForgotSuccessMsg(res.message || 'Password reset instructions and security token have been dispatched to your registered email.');
      setForgotStep(2);
    } catch (err) {
      const parsed = parseApiError(err, 'Failed to process password reset request.');
      setForgotErrorMsg(parsed.message);
    } finally {
      setForgotLoading(false);
    }
  };

  // Handle Staff Reset Password (POST /api/staff/reset-password/)
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setForgotErrorMsg('');
    setForgotSuccessMsg('');

    if (!forgotToken.trim()) {
      setForgotErrorMsg('Please enter the security token from your email.');
      return;
    }
    if (newPassword.length < 8) {
      setForgotErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotErrorMsg('New password and confirmation password do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await staffAuthService.resetPassword({
        token: forgotToken.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      showToast(res.message || 'Password reset successfully! Please sign in with your new password.');
      setShowForgotModal(false);
      setForgotStep(1);
      setForgotIdentifier('');
      setForgotToken('');
      setNewPassword('');
      setConfirmPassword('');
      setUsername(forgotIdentifier);
    } catch (err) {
      const parsed = parseApiError(err, 'Failed to reset password. Please check your token.');
      setForgotErrorMsg(parsed.message);
    } finally {
      setForgotLoading(false);
    }
  };

  // Handle Mandatory Staff Password Change (POST /api/staff/change-password/)
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setChangeErrorMsg('');

    if (!changeOldPassword) {
      setChangeErrorMsg('Please enter your temporary password.');
      return;
    }
    if (changeNewPassword.length < 8) {
      setChangeErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (changeNewPassword !== changeConfirmPassword) {
      setChangeErrorMsg('New password and confirmation do not match.');
      return;
    }

    setChangeLoading(true);
    try {
      const res = await staffAuthService.changePassword({
        old_password: changeOldPassword,
        new_password: changeNewPassword,
        confirm_password: changeConfirmPassword,
      });
      showToast(res.message || 'Password changed successfully! Welcome to your Staff Dashboard.');
      setShowChangePasswordModal(false);
      navigate(from, { replace: true });
    } catch (err) {
      const parsed = parseApiError(err, 'Failed to update password. Please verify your current password.');
      setChangeErrorMsg(parsed.message);
    } finally {
      setChangeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Crisp Architectural Dot Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.3) 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Soft Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-100/60 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-red-500/20 mb-3.5">
            <Hotel className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            GoOnStay Portal
          </h1>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">
            Authorized Master Admin & Department Staff Console
          </p>
        </div>

        {/* Clean White Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-9 shadow-xl shadow-slate-200/60">
          
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-xs font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Username / Staff Login ID Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Login ID, Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: '' }));
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="e.g. admin@goonstay.com or amit.reservation001"
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:bg-white transition-all ${
                    fieldErrors.username
                      ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/10 focus:border-rose-600'
                      : 'border-slate-200 focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                  }`}
                />
              </div>
              <FieldError error={fieldErrors.username} />
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotIdentifier(username.trim());
                    setShowForgotModal(true);
                    setForgotStep(1);
                    setForgotErrorMsg('');
                    setForgotSuccessMsg('');
                  }}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="••••••••••••"
                  className={`w-full pl-10 pr-11 py-3 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:bg-white transition-all ${
                    fieldErrors.password
                      ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/10 focus:border-rose-600'
                      : 'border-slate-200 focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-0.5 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <FieldError error={fieldErrors.password} />
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Secure Badge Footer */}
          <div className="mt-7 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-500 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Secure 256-bit Encrypted Session</span>
          </div>

        </div>

        {/* Footer Info */}
        <div className="text-center mt-6 text-xs text-slate-400 font-medium">
          Connected to Central Django API Gateway • Port 8000
        </div>

      </div>

      {/* MODAL 1: FORGOT & RESET PASSWORD (POST /api/staff/forgot-password/ & /api/staff/reset-password/) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {forgotStep === 1 ? 'Staff Password Recovery' : 'Reset Staff Password'}
                </h3>
                <p className="text-xs text-slate-500">
                  {forgotStep === 1 ? 'Enter your Login ID to receive a secure token' : 'Enter security token and your new password'}
                </p>
              </div>
            </div>

            {forgotErrorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{forgotErrorMsg}</span>
              </div>
            )}

            {forgotSuccessMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{forgotSuccessMsg}</span>
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Staff Login ID or Registered Email
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. amit.reservation001"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-red-600 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Calls: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">POST /api/staff/forgot-password/</code>
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Send Reset Instructions</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Reset Security Token (from Email)
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotToken}
                    onChange={(e) => setForgotToken(e.target.value)}
                    placeholder="Paste the token sent to your email"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:bg-white focus:border-red-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters (e.g. BrandNewSecret@2026)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-red-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-red-600 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Calls: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">POST /api/staff/reset-password/</code>
                  </p>
                </div>

                <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
                  >
                    Back
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {forgotLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Reset Password</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: MANDATORY / FIRST-TIME CHANGE PASSWORD (POST /api/staff/change-password/) */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Change Password Required</h3>
                <p className="text-xs text-slate-500">
                  First-time sign in detected. Please choose a secure personal password.
                </p>
              </div>
            </div>

            {changeErrorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{changeErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Current / Temporary Password
                </label>
                <input
                  type="password"
                  required
                  value={changeOldPassword}
                  onChange={(e) => setChangeOldPassword(e.target.value)}
                  placeholder="e.g. TempPass#987123"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-red-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Secure Password
                </label>
                <input
                  type="password"
                  required
                  value={changeNewPassword}
                  onChange={(e) => setChangeNewPassword(e.target.value)}
                  placeholder="Min 8 characters (e.g. NewSecurePass@2026)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-red-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={changeConfirmPassword}
                  onChange={(e) => setChangeConfirmPassword(e.target.value)}
                  placeholder="Re-enter new secure password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-red-600 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Calls: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">POST /api/staff/change-password/</code>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={changeLoading}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {changeLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Password & Access Dashboard</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminLogin;
