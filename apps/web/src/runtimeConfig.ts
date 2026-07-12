export type RuntimeConfig = {
  authMode: "local" | "cognito"
  apiBaseUrl: string
  cognitoAuthority?: string
  cognitoClientId?: string
  redirectUri?: string
  logoutUri?: string
}

export function runtimeConfig(environment: ImportMetaEnv = import.meta.env): RuntimeConfig {
  const authMode = environment.VITE_AUTH_MODE === "cognito" ? "cognito" : "local"
  const config: RuntimeConfig = {
    authMode,
    apiBaseUrl: environment.VITE_API_BASE_URL ?? ""
  }
  if (authMode === "cognito") {
    const required = {
      cognitoAuthority: environment.VITE_COGNITO_AUTHORITY,
      cognitoClientId: environment.VITE_COGNITO_CLIENT_ID,
      redirectUri: environment.VITE_COGNITO_REDIRECT_URI,
      logoutUri: environment.VITE_COGNITO_LOGOUT_URI
    }
    const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key)
    if (missing.length) throw new Error(`Cognito runtime configuration is missing: ${missing.join(", ")}`)
    Object.assign(config, required)
  }
  return config
}
