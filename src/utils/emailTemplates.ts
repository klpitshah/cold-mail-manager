export function buildInitialEmail(
  name: string,
  company: string,
  jobLink: string,
  yourName = '[Your Name]',
): string {
  const firstName = name.split(' ')[0]
  const jobNote = jobLink
    ? `\n\nI noticed an opening at ${company} (${jobLink}) that aligns well with my background.`
    : `\n\nI'm currently exploring opportunities at ${company} that align with my background.`

  return `Subject: Quick connect — ${company} referral

Hi ${firstName},

I hope this message finds you well. I came across your profile and noticed you're at ${company}.${jobNote}

If you're open to it, I'd really appreciate a brief chat or a referral if you feel my background is a good fit.

Thank you for your time — I know inboxes are busy, so no pressure at all.

Best regards,
${yourName}`
}

export function buildFollowUpEmail(
  name: string,
  company: string,
  followUpCount: number,
  yourName = '[Your Name]',
): string {
  const firstName = name.split(' ')[0]
  const subject =
    followUpCount === 1
      ? `Following up — ${company}`
      : `Re: Following up — ${company}`

  return `Subject: ${subject}

Hi ${firstName},

I wanted to gently follow up on my previous message about connecting regarding opportunities at ${company}. I completely understand if timing isn't right — just wanted to bump this to the top of your inbox in case it got buried.

I'd still love the chance to chat briefly if you're available. Happy to work around your schedule.

Thanks again,
${yourName}`
}
