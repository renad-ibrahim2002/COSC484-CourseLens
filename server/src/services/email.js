const env = require('../config/env');

let resend = null;
if (env.resendApiKey) {
  const { Resend } = require('resend');
  resend = new Resend(env.resendApiKey);
}

const outbox = []; // last few messages, used by tests and local development

async function sendEmail({ to, subject, html, text }) {
  outbox.push({ to, subject, text, html, at: new Date() });
  if (outbox.length > 50) outbox.shift();
  if (resend) {
    const { error } = await resend.emails.send({ from: env.emailFrom, to, subject, html, text });
    if (error) throw new Error(`Email failed: ${error.message}`);
    return { delivered: true };
  }
  if (!env.isTest) console.log(`\n[email] to=${to}\n[email] subject=${subject}\n[email] ${text}\n`);
  return { delivered: false };
}

const layout = (title, body, link, cta) => `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#15171c">
    <h2 style="margin:0 0 12px">${title}</h2>
    <p style="color:#555b66;line-height:1.5">${body}</p>
    <p><a href="${link}" style="display:inline-block;background:#2a4bd7;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">${cta}</a></p>
    <p style="color:#555b66;font-size:12px">If the button does not work, open this link: ${link}</p>
  </div>`;

function sendVerificationEmail(user, link) {
  return sendEmail({
    to: user.email,
    subject: 'Verify your CourseLens account',
    text: `Hi ${user.name}, open this link to activate your account (expires in 24 hours): ${link}`,
    html: layout(
      'Verify your email',
      `Hi ${user.name}, click below to activate your CourseLens account. The link expires in 24 hours.`,
      link,
      'Verify email',
    ),
  });
}

function sendResetEmail(user, link) {
  return sendEmail({
    to: user.email,
    subject: 'Reset your CourseLens password',
    text: `Hi ${user.name}, open this link to choose a new password (expires in 1 hour): ${link}`,
    html: layout(
      'Reset your password',
      `Hi ${user.name}, click below to choose a new password. The link expires in 1 hour.`,
      link,
      'Choose a new password',
    ),
  });
}

module.exports = { sendEmail, sendVerificationEmail, sendResetEmail, outbox, isConfigured: () => !!resend };
