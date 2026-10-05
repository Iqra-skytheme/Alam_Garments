import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import Logo from "../components/Logo";
import { COUNTRY_CODES } from "../constants/countryCodes";
import {
  authenticateOwner,
  initOwnerCredentials,
} from "../services/authService";

export default function Login({ onLogin, shopInfo }) {
  const [countryCode, setCountryCode] = useState(shopInfo?.countryCode || "+92");
  const [phone, setPhone] = useState(shopInfo?.phone || "0300-1234567");
  const [pin, setPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 3D Card Interactive Tilt States
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50, active: false });

  // Pre-seed owner credentials table on load
  useEffect(() => {
    initOwnerCredentials();
  }, []);

  // 3D Interactive Mouse Tilt Tracker
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Normalize coordinates (-1 to 1)
    const normX = (x / rect.width - 0.5) * 2;
    const normY = (y / rect.height - 0.5) * 2;

    // Angle limits (max 10 degrees for elegant subtle 3D feel)
    const rotateY = normX * 10;
    const rotateX = -normY * 10;

    // Glare position percentage
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({ x: rotateX, y: rotateY, glareX, glareY, active: true });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50, active: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      const err = "Please enter your phone number.";
      setError(err);
      toast.error(err);
      return;
    }
    if (!pin.trim()) {
      const err = "Please enter your security PIN.";
      setError(err);
      toast.error(err);
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const fullPhone = `${countryCode} ${phone.trim()}`;
      const result = await authenticateOwner(fullPhone, pin, rememberMe);

      if (!result.success) {
        setError(result.message || "Invalid mobile number or security PIN.");
        toast.error("Login Failed", {
          description: result.message || "Invalid credentials. Please verify your PIN.",
        });
        setIsLoading(false);
        return;
      }

      toast.success("Login Successful", {
        description: `Welcome back, ${result.user?.ownerName || shopInfo?.owner || "Owner"}!`,
      });

      onLogin({
        identifier: fullPhone,
        rememberMe,
        user: {
          name: result.user?.ownerName || shopInfo?.owner || "Shop Owner",
          phone: fullPhone,
          token: result.token,
        },
        shopInfo: {
          name: result.user?.shopName || shopInfo?.name,
        },
      });
    } catch (err) {
      console.error("Login verification error", err);
      setError("An unexpected error occurred during login.");
      toast.error("Error", {
        description: "Could not complete login. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPin = () => {
    toast.info("Security PIN Assistance", {
      description: "Default initial store PIN is 1234. You can change your PIN in Settings once logged in.",
    });
  };

  return (
    <div className="login-page-3d-root">
      {/* 3D Ambient Glowing Background Elements */}
      <div className="ambient-sphere ambient-sphere-1"></div>
      <div className="ambient-sphere ambient-sphere-2"></div>
      <div className="ambient-sphere ambient-sphere-3"></div>
      <div className="perspective-grid-overlay"></div>

      {/* 3D Perspective Card Container */}
      <div
        className="login-3d-card-wrapper"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={cardRef}
          className={`login-3d-card ${tilt.active ? "tilting" : ""}`}
          style={{
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${
              tilt.active ? "scale3d(1.02, 1.02, 1.02)" : "scale3d(1, 1, 1)"
            }`,
          }}
        >
          {/* 3D Dynamic Specular Light Glare */}
          <div
            className="card-glare"
            style={{
              opacity: tilt.active ? 0.35 : 0,
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 45%, transparent 70%)`,
            }}
          ></div>

          {/* Elevated Brand Header */}
          <div className="login-brand-3d-header">
            <div className="logo-3d-float">
              <Logo size={68} variant="icon" />
            </div>
            <h1 className="login-3d-title">
              Alam <span className="title-accent">Garments</span>
            </h1>
            <p className="login-3d-subtitle">
              {shopInfo?.name || "Alam Garments"} • Merchant Portal
            </p>
          </div>

          {error && (
            <div className="login-3d-error">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Clean Professional Form */}
          <form onSubmit={handleSubmit} className="login-3d-form">
            <div className="form-group-3d">
              <label className="form-label-3d" htmlFor="login-phone">
                Mobile Number
              </label>
              <div className="phone-3d-input-group">
                <select
                  className="country-select-3d"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  aria-label="Country Code"
                  disabled={isLoading}
                >
                  {COUNTRY_CODES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.code} ({item.country})
                    </option>
                  ))}
                </select>
                <div className="input-field-3d-wrap">
                  <span className="field-icon-3d">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </span>
                  <input
                    id="login-phone"
                    type="tel"
                    className="input-field-3d"
                    placeholder="0300-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group-3d">
              <div className="label-with-link-3d">
                <label className="form-label-3d" htmlFor="login-pin">
                  Security PIN
                </label>
                <button
                  type="button"
                  className="forgot-link-3d"
                  onClick={handleForgotPin}
                >
                  Forgot PIN?
                </button>
              </div>
              <div className="input-field-3d-wrap">
                <span className="field-icon-3d">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input
                  id="login-pin"
                  type={showPassword ? "text" : "password"}
                  className="input-field-3d"
                  placeholder="Enter 4-digit PIN"
                  maxLength={16}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="eye-toggle-3d"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? "Hide PIN" : "Show PIN"}
                  aria-label={showPassword ? "Hide PIN" : "Show PIN"}
                >
                  {showPassword ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="checkbox-row-3d">
              <label className="checkbox-label-3d">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            {/* 3D Tactile Log In Button */}
            <button
              type="submit"
              className="btn-3d-login"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="btn-loading-content">
                  <svg
                    className="animate-spin-3d"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                "Log In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
