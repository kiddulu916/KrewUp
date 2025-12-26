// lib/email/templates/endorsement-request.ts

export interface EndorsementRequestEmailProps {
  workerName: string;
  position: string;
  companyName: string;
  startDate: string;
  endDate: string | null;
  approveUrl: string;
}

export function endorsementRequestEmailHtml({
  workerName,
  position,
  companyName,
  startDate,
  endDate,
  approveUrl,
}: EndorsementRequestEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Work History Endorsement Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1a202c;">
                Work History Endorsement Request
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #4a5568;">
                Hi there,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #4a5568;">
                <strong>${workerName}</strong> is requesting that you verify their work experience at your company on KrewUp.
              </p>

              <!-- Work Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 20px; color: #2d3748;">
                      <strong style="font-weight: 600;">Position:</strong> ${position}
                    </p>
                    <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 20px; color: #2d3748;">
                      <strong style="font-weight: 600;">Company:</strong> ${companyName}
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 20px; color: #2d3748;">
                      <strong style="font-weight: 600;">Dates:</strong> ${startDate} - ${endDate || 'Present'}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #4a5568;">
                By endorsing this work history, you'll help ${workerName} build credibility with future employers.
                You can also optionally leave a short recommendation (max 200 characters).
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${approveUrl}" style="display: inline-block; padding: 14px 32px; background-color: #3182ce; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Review Endorsement Request
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #718096;">
                If you don't recognize this worker or didn't work with them, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #a0aec0; text-align: center;">
                This email was sent by KrewUp<br>
                <a href="${approveUrl}" style="color: #3182ce; text-decoration: none;">Click here</a> if the button above doesn't work
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function endorsementRequestEmailText({
  workerName,
  position,
  companyName,
  startDate,
  endDate,
  approveUrl,
}: EndorsementRequestEmailProps): string {
  return `
Work History Endorsement Request

Hi there,

${workerName} is requesting that you verify their work experience at your company on KrewUp.

Position: ${position}
Company: ${companyName}
Dates: ${startDate} - ${endDate || 'Present'}

By endorsing this work history, you'll help ${workerName} build credibility with future employers. You can also optionally leave a short recommendation (max 200 characters).

Review this request: ${approveUrl}

If you don't recognize this worker or didn't work with them, you can safely ignore this email.

---
KrewUp
  `.trim();
}
