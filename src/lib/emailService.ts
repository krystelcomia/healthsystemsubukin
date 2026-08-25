import emailjs from "@emailjs/browser";

export interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface EmailSendResult {
  success: boolean;
  deliveredVia: "emailjs" | "simulation" | "fallback";
  message: string;
  error?: any;
}

/**
 * Retrieve the active EmailJS credentials from LocalStorage or Environment variables.
 */
export function getEmailJsConfig(): EmailJsConfig {
  let storedConfig: Partial<EmailJsConfig> = {};
  try {
    const raw = localStorage.getItem("bhw_emailjs_config");
    if (raw) storedConfig = JSON.parse(raw);
  } catch {}

  const serviceId = (storedConfig.serviceId || import.meta.env.VITE_EMAILJS_SERVICE_ID || "").trim();
  const templateId = (storedConfig.templateId || import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "").trim();
  const publicKey = (storedConfig.publicKey || import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "").trim();

  return { serviceId, templateId, publicKey };
}

/**
 * Save custom EmailJS credentials to LocalStorage for persistent configuration across restarts.
 */
export function saveEmailJsConfig(config: EmailJsConfig) {
  try {
    localStorage.setItem("bhw_emailjs_config", JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save EmailJS config:", e);
  }
}

/**
 * Service to dispatch secure one-time password (OTP) verification codes
 * via EmailJS directly to the user's Gmail address.
 */
export async function sendVerificationCodeEmail(
  toEmail: string,
  code: string,
  recipientName?: string
): Promise<EmailSendResult> {
  const cleanEmail = (toEmail || "").trim();
  const cleanName = (recipientName || cleanEmail.split("@")[0] || "Health Worker").trim();
  const config = getEmailJsConfig();

  const templateParams = {
    to_email: cleanEmail,
    to_name: cleanName,
    email: cleanEmail,
    name: cleanName,
    user_email: cleanEmail,
    recipient_email: cleanEmail,
    verification_code: code,
    code: code,
    passcode: code,
    otp: code,
    system_name: "Barangay Subukin Health Center System",
    expiry_minutes: "15",
    subject: `Your Password Reset Verification Code: ${code} — Barangay Subukin Health System`,
    message: `Hello ${cleanName},\n\nYour 6-digit verification code to reset your password is: ${code}\n\nThis security code is valid for 15 minutes. Please do not share this code with anyone.\n\nThank you,\nBarangay Subukin Health Center`
  };

  const isConfigured = Boolean(
    config.serviceId &&
    config.templateId &&
    config.publicKey &&
    config.publicKey !== "bhw_subukin_key"
  );

  if (isConfigured) {
    try {
      // 1. Send via EmailJS SDK
      const response = await emailjs.send(
        config.serviceId,
        config.templateId,
        templateParams,
        config.publicKey
      );
      console.info("[EmailJS] Verification email dispatched successfully to", cleanEmail, ":", response.status, response.text);
      return {
        success: true,
        deliveredVia: "emailjs",
        message: `Verification code successfully sent to ${cleanEmail} via EmailJS.`
      };
    } catch (err: any) {
      console.warn("[EmailJS] Primary SDK dispatch error:", err);

      // 2. Try REST API fallback
      try {
        const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_id: config.serviceId,
            template_id: config.templateId,
            user_id: config.publicKey,
            template_params: templateParams
          })
        });

        if (res.ok) {
          console.info("[EmailJS REST] Verification email sent to", cleanEmail);
          return {
            success: true,
            deliveredVia: "emailjs",
            message: `Verification code successfully sent to ${cleanEmail} via EmailJS.`
          };
        }
      } catch (restErr) {
        console.warn("[EmailJS REST] Fallback attempt error:", restErr);
      }

      const errorDetail = err?.text || err?.message || "EmailJS delivery failed";
      console.error("[EmailJS Dispatch Failed]", errorDetail);
      return {
        success: false,
        deliveredVia: "simulation",
        error: errorDetail,
        message: `EmailJS failed to deliver to ${cleanEmail}: ${errorDetail}`
      };
    }
  }

  // Not yet configured with live keys: record simulation status
  console.info(`[Email Service Simulation] Security verification code generated for ${cleanEmail}: ${code}`);
  return {
    success: true,
    deliveredVia: "simulation",
    message: `Verification code generated for ${cleanEmail}. (Configure EmailJS in Admin Settings to send live emails to your Gmail inbox)`
  };
}
