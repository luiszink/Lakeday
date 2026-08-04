export type PasswordResetEmail = {
  recipient: string;
  resetUrl: string;
  expiresAt: Date;
};

export async function sendPasswordResetEmail(email: PasswordResetEmail) {
  const endpoint = process.env.ADMIN_EMAIL_ENDPOINT;
  const apiKey = process.env.ADMIN_EMAIL_API_KEY;
  if (!endpoint || !apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Admin email provider is not configured.');
    }
    return;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.ADMIN_EMAIL_FROM ?? 'BodenseeGuide <admin@localhost>',
      to: email.recipient,
      subject: 'BodenseeGuide admin password reset',
      text: `Reset your admin password: ${email.resetUrl}\n\nThis link expires at ${email.expiresAt.toISOString()}.`,
    }),
  });

  if (!response.ok) {
    throw new Error('Admin email provider rejected the message.');
  }
}
