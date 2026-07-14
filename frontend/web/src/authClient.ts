import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts"
import type { RuntimeConfig } from "./runtimeConfig.js"

export type WebSession = {
  subject: string
  groups: string[]
  accessToken: string
}

export interface AuthClient {
  currentSession(): Promise<WebSession | null>
  completeSignIn(): Promise<WebSession>
  signIn(): Promise<void>
  signOut(): Promise<void>
}

export class CognitoAuthClient implements AuthClient {
  private readonly manager: UserManager

  public constructor(config: RuntimeConfig) {
    if (!config.cognitoAuthority || !config.cognitoClientId || !config.redirectUri || !config.logoutUri) {
      throw new Error("Cognito runtime configuration is incomplete")
    }
    this.manager = new UserManager({
      authority: config.cognitoAuthority,
      client_id: config.cognitoClientId,
      redirect_uri: config.redirectUri,
      post_logout_redirect_uri: config.logoutUri,
      response_type: "code",
      scope: "openid email profile",
      userStore: new WebStorageStateStore({ store: window.sessionStorage })
    })
  }

  public async currentSession(): Promise<WebSession | null> {
    const user = await this.manager.getUser()
    return user && !user.expired ? toSession(user) : null
  }

  public async completeSignIn(): Promise<WebSession> {
    return toSession(await this.manager.signinRedirectCallback())
  }

  public async signIn(): Promise<void> {
    await this.manager.signinRedirect()
  }

  public async signOut(): Promise<void> {
    const user = await this.manager.getUser()
    await this.manager.signoutRedirect({ id_token_hint: user?.id_token })
  }
}

function toSession(user: User): WebSession {
  const subject = user.profile.sub
  if (!subject || !user.access_token) throw new Error("Cognito session is missing required claims")
  const rawGroups: unknown = user.profile["cognito:groups"]
  const groups = Array.isArray(rawGroups)
    ? rawGroups.filter((group): group is string => typeof group === "string" && group.length > 0)
    : []
  return { subject, groups, accessToken: user.access_token }
}
