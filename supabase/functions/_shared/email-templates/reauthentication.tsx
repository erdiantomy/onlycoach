/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>ONLY/COACH</Text>
        <Heading style={h1}>Confirm it's you</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Code expires shortly. Didn't request this? You can ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
  margin: '0 0 16px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#141414',
  letterSpacing: '0.25em',
  backgroundColor: '#f3eedd',
  border: '2px solid #141414',
  borderRadius: '4px',
  padding: '18px 20px',
  margin: '0 0 30px',
  textAlign: 'center' as const,
}
const footer = { fontSize: '12px', color: '#4d4d4d', margin: '36px 0 0', borderTop: '2px solid #141414', paddingTop: '16px' }
