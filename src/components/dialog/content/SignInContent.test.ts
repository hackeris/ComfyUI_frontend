import { render, screen } from '@testing-library/vue'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import SignInContent from '@/components/dialog/content/SignInContent.vue'

vi.mock('@/composables/auth/useAuthActions', () => ({
  useAuthActions: () => ({
    signInWithGoogle: vi.fn(),
    signInWithGithub: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    accessError: ref(false)
  })
}))

vi.mock('@/base/webviewDetection', () => ({ isEmbeddedWebView: () => false }))
vi.mock('@/utils/hostWhitelist', () => ({
  isHostWhitelisted: () => true,
  normalizeHost: (host: string) => host
}))
vi.mock('@/platform/remoteConfig/remoteConfig', () => ({
  remoteConfig: ref({}),
  configValueOrDefault: (_config: unknown, _key: string, fallback: string) =>
    fallback
}))

const inChina = vi.hoisted(() => ({
  value: false,
  pending: null as Promise<boolean> | null,
  /** Detection that never settles, as on a network that blackholes. */
  hang() {
    this.pending = new Promise<boolean>(() => {})
  },
  /** Holds detection pending; returns the settle function. */
  defer(): (inChina: boolean) => void {
    let settle!: (inChina: boolean) => void
    this.pending = new Promise<boolean>((resolve) => {
      settle = resolve
    })
    return settle
  },
  reject(error: Error) {
    this.pending = Promise.reject(error)
  }
}))
vi.mock('@/utils/networkUtil', () => ({
  isInChina: () => inChina.pending ?? Promise.resolve(inChina.value)
}))

const MESSAGES = {
  auth: {
    login: {
      title: 'Sign in',
      newUser: 'New user?',
      signUp: 'Sign up',
      orContinueWith: 'or continue with',
      loginWithGoogle: 'Sign in with Google',
      loginWithGithub: 'Sign in with GitHub',
      useApiKey: 'Use API key',
      termsText: 'Terms',
      termsLink: 'Terms of Service',
      andText: 'and',
      privacyLink: 'Privacy Policy',
      questionsContactPrefix: 'Questions?',
      insecureContextWarning: 'Insecure context'
    },
    signup: {
      title: 'Sign up',
      alreadyHaveAccount: 'Already have an account?',
      signIn: 'Sign in',
      signUpWithGoogle: 'Sign up with Google',
      signUpWithGithub: 'Sign up with GitHub',
      regionRestrictionChina: 'Email sign-up is unavailable in your region.'
    },
    apiKey: { helpText: 'Help', generateKey: 'Generate key' },
    reauthRequired: { title: 'Reauth', message: 'Reauth' }
  },
  g: { comfy: 'Comfy' },
  toastMessages: { useApiKeyTip: 'Tip' }
}

function renderSignInContent() {
  return render(SignInContent, {
    props: { onSuccess: vi.fn() },
    global: {
      plugins: [
        createI18n({ legacy: false, locale: 'en', messages: { en: MESSAGES } })
      ],
      stubs: {
        SignUpForm: { template: '<form data-testid="signup-form" />' },
        SignInForm: { template: '<form data-testid="signin-form" />' },
        ApiKeyForm: { template: '<div data-testid="api-key-form" />' },
        Divider: true,
        Message: { template: '<div><slot /></div>' }
      }
    }
  })
}

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  inChina.value = false
  inChina.pending = null
})

describe('SignInContent', () => {
  it('renders only the API key surface, withholding the account sign-in', () => {
    renderSignInContent()

    expect(screen.getByTestId('api-key-form')).toBeInTheDocument()
    expect(screen.queryByTestId('signin-form')).not.toBeInTheDocument()
    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Google/ })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Terms of Service' })
    ).not.toBeInTheDocument()
  })

  it('withholds the sign-up form while region detection is pending', () => {
    inChina.defer()
    renderSignInContent()

    expect(screen.getByTestId('api-key-form')).toBeInTheDocument()
    expect(screen.queryByTestId('region-check-pending')).not.toBeInTheDocument()
    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
  })

  it('never renders the sign-up form inside China, pending or settled', async () => {
    const settle = inChina.defer()
    renderSignInContent()

    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()

    settle(true)
    await flushAsync()

    expect(screen.getByTestId('api-key-form')).toBeInTheDocument()
    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Email sign-up is unavailable in your region.')
    ).not.toBeInTheDocument()
  })

  it('never renders the sign-up form outside China', async () => {
    renderSignInContent()
    await flushAsync()

    expect(screen.getByTestId('api-key-form')).toBeInTheDocument()
    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
  })

  it('never renders the sign-up form when region detection fails', async () => {
    inChina.reject(new Error('probe failed'))
    renderSignInContent()
    await flushAsync()

    expect(screen.getByTestId('api-key-form')).toBeInTheDocument()
    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
  })

  it('keeps the account surface unreachable however long detection takes', async () => {
    // Fake timers must predate mount, or a fallback scheduled during mount runs
    // on the real clock and escapes the drain below.
    vi.useFakeTimers()
    try {
      inChina.hang()
      renderSignInContent()

      await vi.advanceTimersByTimeAsync(60_000)

      expect(
        screen.queryByTestId('signup-form'),
        "no caller-side fallback may release the form on detection's behalf"
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId('region-check-pending')
      ).not.toBeInTheDocument()
      expect(screen.getByTestId('api-key-form')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('leaves the API key form ungated by region', async () => {
    inChina.value = true
    renderSignInContent()
    await flushAsync()

    expect(screen.getByTestId('api-key-form')).toBeInTheDocument()
    expect(screen.queryByTestId('region-check-pending')).not.toBeInTheDocument()
  })

  it('never offers social sign-up inside China', async () => {
    inChina.value = true
    renderSignInContent()
    await flushAsync()

    expect(
      screen.queryByRole('button', { name: /Sign up with Google/ })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Sign up with GitHub/ })
    ).not.toBeInTheDocument()
  })
})
