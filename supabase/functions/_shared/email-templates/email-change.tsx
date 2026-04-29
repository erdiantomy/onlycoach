/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>ONLY/COACH</Text>
        <Heading style={h1}>Confirm email change</Heading>
        <Text style={text}>
          You requested to change your {siteName} email from{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm change
        </Button>
        <Text style={footer}>
          Didn't request this? Secure your account immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = {
  fontSize: '11px',
  fontWeight: 'bold' as const,
  color: '#141414',
  letterSpacing: '0.15em',
  margin: '0 0 24px',
}
const h1 = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#141414',
  lineHeight: '1.15',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#141414',
  lineHeight: '1.55',
  margin: '0 0 28px',
}
const link = { color: '#1f3d2e', textDecoration: 'underline' }
const button = {
  backgroundColor: '#1f3d2e',
  color: '#f3eedd',
  fontSize: '13px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  borderRadius: '4px',
  border: '2px solid #141414',
  padding: '14px 22px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#4d4d4d', margin: '36px 0 0', borderTop: '2px solid #141414', paddingTop: '16px' }
