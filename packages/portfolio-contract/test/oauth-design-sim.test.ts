/**
 * @file Semantic decompilation of the OAuth design in
 * `.cache/linear/oauth-design-draft.md` into an executable object-capability
 * actor simulation. It reconstructs the authority represented by OAuth bearer
 * artifacts as narrow object references and records their flow as sequence
 * diagrams.
 *
 * The simulation maps:
 *
 * - DCR's `client_id` and registration authority to `client@AS[...]`;
 * - SIWE broker registration and its client secret to `brokerClient@S[...]`;
 * - a SIWE session ID to a one-shot `signIn@S[...]` facet;
 * - broker callback state to a one-shot `resumeBroker@AS[...]` continuation;
 * - a SIWE authorization code to a one-shot `exchange@S[...]` facet;
 * - the signed consent round trip to a one-shot `consent@AS[...]`
 *   continuation;
 * - a consent-session JTI to a one-shot `grantSlot@DB[...]`;
 * - an access-token JWT to `grant@RS[...]`, a narrow RS-local facet;
 * - a rotating refresh token to `refresh@AS[...]`.
 *
 * RS allocates the grant facet and sends it through the one-shot AS
 * continuation. AS retains it with the authorization code, and the token
 * exchange forwards that same reference to H. On every call by H, the grant
 * facet rechecks its authoritative row and gives the selected tool only an
 * attenuated scope-checking capability.
 *
 * OAuth client state, OIDC and SIWE nonces, PKCE proof, wallet, agent, and scope
 * remain explicit because they bind exchanges or constrain authority.
 * Identity-based toy signing represents the unforgeability provided by
 * production cryptography.
 *
 * The diagram/test boundaries are discovery and registration (A), wallet proof
 * (B9-B13), broker exchange (B14-B15), consent eligibility (C16-C25), grant
 * commitment (C26-C29), capability delivery (D), and invocation with per-call
 * enforcement (E). Splitting B and C at their one-shot artifacts makes each
 * authority transfer independently reviewable.
 *
 * @see {@link ../docs-design/sequence-diagram-actor-simulations.md} for the
 * semantic-decompilation method.
 *
 * @see {@link snapshots/oauth-design-sim.test.ts.md} for the protocol-first
 * snapshot report.
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type {
  PortfolioAgentKey,
  PortfolioAgentStatus,
  PortfolioKey,
  StatusFor,
} from '@agoric/portfolio-api';
import { createHash } from 'node:crypto';

type Viz = ReturnType<typeof makeSequenceDiagram>;

const makeSequenceDiagram = () => {
  const arrows: string[] = [];
  let pauseDepth = 0;
  const record = (arrow: string) => {
    if (pauseDepth === 0) {
      arrows.push(arrow);
    }
  };
  return harden({
    call(from: string, to: string, label: string) {
      record(`${from}->>${to}: ${label}`);
    },
    cont(from: string, to: string, label: string) {
      record(`${from}-->>${to}: ${label}`);
    },
    reply(from: string, to: string, label: string) {
      record(`${from}-->>${to}: ${label}`);
    },
    pause() {
      pauseDepth += 1;
    },
    resume() {
      if (pauseDepth === 0) {
        throw Error('sequence diagram is not paused');
      }
      pauseDepth -= 1;
    },
    reset() {
      arrows.length = 0;
    },
    lines: () => harden([...arrows]),
  });
};

type Signed<T extends object> = Readonly<{ payload: T }>;

/**
 * Represents a cryptographic signing relationship as object identity.
 *
 * Only the signer can put an object into `authentic`; the verifier recognizes
 * those objects without sharing signing authority. This keeps the simulated
 * authority split visible without reproducing a wire signature algorithm.
 */
const makeSigningFacets = <T extends object>() => {
  const authentic = new WeakSet<object>();
  const signer = harden({
    sign(payload: T): Signed<T> {
      const token = harden({ payload });
      authentic.add(token);
      return token;
    },
  });
  const verifier = harden({
    verify(token: Signed<T>): T {
      if (!authentic.has(token)) {
        throw Error('invalid signature');
      }
      return token.payload;
    },
  });
  return harden({ signer, verifier });
};

const assertEqual = (actual: unknown, expected: unknown, detail: string) => {
  if (actual !== expected) {
    throw Error(`${detail}: expected ${String(expected)}`);
  }
};

// Deterministic entropy keeps the transcript stable while making the actor
// that mints each opaque value explicit.
const makeFakePrng = (samples: readonly string[]) => {
  if (new Set(samples).size !== samples.length) {
    throw Error('fake PRNG samples must be distinct');
  }
  let nextIndex = 0;
  const randomChars = () => {
    const sample = samples[nextIndex];
    if (!sample) {
      throw Error('fake PRNG exhausted');
    }
    nextIndex += 1;
    return sample;
  };
  return harden({
    randomChars,
    makeId(label: string) {
      return `${label}-${randomChars()}`;
    },
  });
};

const makeFakePrngRegistry = () => {
  const actorBySample = new Map<string, string>();
  return harden({
    actor(actor: string) {
      return harden({
        makePrng(samples: readonly string[]) {
          for (const sample of samples) {
            const owner = actorBySample.get(sample);
            if (owner) {
              throw Error(
                `fake PRNG sample ${sample} is already allocated to ${owner}, not ${actor}`,
              );
            }
          }
          const prng = makeFakePrng(samples);
          for (const sample of samples) {
            actorBySample.set(sample, actor);
          }
          return prng;
        },
      });
    },
  });
};

type ActorEntropy = ReturnType<
  ReturnType<typeof makeFakePrngRegistry>['actor']
>;

test('fake PRNG registry rejects cross-actor sample reuse', t => {
  const registry = makeFakePrngRegistry();
  const asEntropy = registry.actor('AS');
  const siweEntropy = registry.actor('SIWE');
  t.deepEqual(Object.keys(asEntropy), ['makePrng']);
  asEntropy.makePrng(['a4c9']);
  t.throws(() => siweEntropy.makePrng(['a4c9']), {
    message: 'fake PRNG sample a4c9 is already allocated to AS, not SIWE',
  });
});

const makeKeycloakClientFacet = <TProtocol extends object>(
  clientId: string,
  designation: string,
  protocol: TProtocol,
) => harden({ clientId, designation, ...protocol });

/**
 * The semantic import of an OAuth access token into the RS vat.
 *
 * Possession designates exactly one grant object. The facet does not expose its
 * grant row or database powers; it can only attempt a tool call, for which it
 * rechecks liveness and derives narrower scope authority.
 */
type GrantFacet = Readonly<{
  designation: string;
  callTool(request: object): string;
}>;

/**
 * The semantic import of a refresh token into the AS vat.
 *
 * This long-lived facet is distinct from the RS grant facet so refresh
 * authority need not confer any broader AS authority.
 */
type RefreshFacet = Readonly<{
  designation: string;
  refresh(): GrantFacet;
}>;

/**
 * Per-registration AS facet.
 *
 * The public `client_id` names this object in the wire protocol. Calls through
 * the facet make the receiver designation explicit and keep registration-wide
 * AS authority out of the harness.
 */
type OAuthClient = Readonly<{
  clientId: string;
  designation: string;
  authorize(
    request: AuthorizationRequest,
    user: AuthorizationBrowser,
    callback: { receive(response: AuthorizationResponse): void },
  ): void;
  token(
    code: string,
    verifier: string,
  ): Readonly<{
    grant: GrantFacet;
    refresh: RefreshFacet;
  }>;
}>;

type DiscoveryAS = Readonly<{
  metadata(): Readonly<{
    issuer: string;
    supportsS256: boolean;
    authorizationResponseIssuer: boolean;
  }>;
  register(args: {
    redirectUris: string[];
    tokenEndpointAuthMethod: string;
  }): OAuthClient;
}>;

type YmaxMcpPublic = Readonly<{
  callWithoutToken(): Readonly<{
    status: number;
    resource: string;
    scopes: readonly string[];
  }>;
  metadata(): Readonly<{
    resource: string;
    authorizationServer: DiscoveryAS;
    scopes: readonly string[];
  }>;
}>;

// Stage A --------------------------------------------------------------------

test('OAuth design A: discovery designates and validates the AS before DCR', t => {
  const { viz, keycloakDiscovery, harness } = makeOAuthSimulationFixture({
    discover: false,
  });

  const client = harness.discoverAndRegister();
  t.is(client.clientId, 'client-e7c4');
  // POLA: the client object is the simulation's direct designation of the
  // newly registered AS state. The wire protocol represents this reference as
  // client_id plus registration-management credentials; this sim need not.
  // SECURITY AFFIRMATION: the model does not give H an AS reference until it
  // has checked that RS metadata describes the challenged resource.
  // WIRE-DESIGN NOTE: production discovery returns a URL, not a capability;
  // the design requires H to enforce exact issuer matching before using it.
  t.throws(
    () =>
      keycloakDiscovery.register({
        redirectUris: ['https://evil.example/*'],
        tokenEndpointAuthMethod: 'none',
      }),
    { message: 'wildcard redirect is restricted to loopback' },
  );
  t.snapshot(viz.lines(), 'sequence diagram');
});

// Stage B --------------------------------------------------------------------

type BrokerRequest = Readonly<{
  oidcNonce: string;
}>;

type IdClaims = Readonly<{ sub: string; nonce: string }>;

type BrokerExchange = Readonly<{
  designation: string;
  exchange(): Signed<IdClaims>;
}>;

type BrokerContinuation = Readonly<{
  designation: string;
  complete(exchange: BrokerExchange): IdClaims;
}>;

type AuthorizationRequest = Readonly<{
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  redirectUri: string;
  scope: readonly string[];
  resource: string;
  state: string;
}>;

type AuthorizationResponse = Readonly<{
  code: string;
  state: string;
  iss: string;
}>;

type WalletProofFields = Readonly<{
  address: string;
  domain: string;
  nonce: string;
  resource: string;
}>;

type WalletProof = WalletProofFields &
  Readonly<{
    signature: string;
  }>;

type SignInSession = Readonly<{
  designation: string;
  signIn(proof: WalletProof): void;
}>;

type SignInPage = Readonly<{
  session: SignInSession;
  nonce: string;
  resource: string;
}>;

type SignInPageReceiver = Readonly<{
  showSignInPage(page: SignInPage): void;
}>;

type ConsentForm = Readonly<{
  authorize(agent: string, submittedScopes: readonly string[]): void;
}>;

type ConsentPage = Readonly<{
  applicationHost: string;
  eligibleAgents: readonly string[];
  scopesByAgent: Readonly<Record<string, readonly string[]>>;
}> &
  ConsentForm;

type AuthorizationBrowser = SignInPageReceiver &
  Readonly<{ showConsent(form: ConsentPage): void }>;

type SiweBrokerClient = Readonly<{
  designation: string;
  authorize(
    request: BrokerRequest,
    user: SignInPageReceiver,
    resume: BrokerContinuation,
  ): void;
}>;

const signatureFor = (fields: WalletProofFields) =>
  createHash('sha256').update(JSON.stringify(fields)).digest('hex').slice(0, 8);

const signWalletProof = (fields: WalletProofFields): WalletProof =>
  harden({ ...fields, signature: signatureFor(fields) });

const makeSiweOidcProvider = (viz: Viz, entropy: ActorEntropy) => {
  const config = harden({
    brokerEndpoint:
      'https://auth.ymax.app/realms/ymax/broker/siwe-oidc/endpoint',
  });
  const prng = entropy.makePrng(['8d3f1a', '7cae51', 'd138b7', '4e91ba']);
  const idTokenKey = makeSigningFacets<IdClaims>();
  let clientRegistered = false;
  let pendingBrokerCallback:
    | Readonly<{
        resume: BrokerContinuation;
        exchange: BrokerExchange;
      }>
    | undefined;

  return harden({
    registerBrokerClient() {
      if (clientRegistered) {
        throw Error('SIWE broker client is already registered');
      }
      clientRegistered = true;
      const clientTag = prng.randomChars();
      const clientDesignation = `brokerClient@S[${clientTag}]`;
      const client: SiweBrokerClient = harden({
        designation: clientDesignation,
        authorize(request, user, resume) {
          const sessionTag = prng.randomChars();
          const sessionDesignation = `signIn@S[${sessionTag}]`;
          const nonce = prng.makeId('siwe-nonce');
          const exchangeTag = prng.randomChars();
          let signInCount = 0;
          const session: SignInSession = harden({
            designation: sessionDesignation,
            signIn(proof) {
              if (signInCount !== 0) {
                throw Error('SIWE sign-in session already consumed');
              }
              assertEqual(proof.domain, 'siwe.ymax.app', 'SIWE domain');
              assertEqual(proof.nonce, nonce, 'SIWE nonce');
              assertEqual(
                proof.resource,
                config.brokerEndpoint,
                'SIWE broker resource',
              );
              assertEqual(
                proof.signature,
                signatureFor({
                  address: proof.address,
                  domain: proof.domain,
                  nonce: proof.nonce,
                  resource: proof.resource,
                }),
                'SIWE signature',
              );
              signInCount += 1;
              let exchangeCount = 0;
              const exchangeDesignation = `exchange@S[${exchangeTag}]`;
              const exchange: BrokerExchange = harden({
                designation: exchangeDesignation,
                exchange() {
                  if (exchangeCount !== 0) {
                    throw Error('SIWE exchange already consumed');
                  }
                  exchangeCount += 1;
                  const idToken = idTokenKey.signer.sign(
                    harden({
                      sub: `eip155:8453:${proof.address}`,
                      nonce: request.oidcNonce,
                    }),
                  );
                  viz.reply(
                    exchangeDesignation,
                    'AS',
                    `id_token({ sub: ${idToken.payload.sub}, nonce: ${idToken.payload.nonce} })`,
                  );
                  return idToken;
                },
              });
              pendingBrokerCallback = harden({ resume, exchange });
            },
          });
          viz.reply(
            clientDesignation,
            'User',
            `signInPage({ session: ${sessionDesignation}, nonce: ${nonce}, resource: brokerEndpoint })`,
          );
          return user.showSignInPage(
            harden({
              session,
              nonce,
              resource: config.brokerEndpoint,
            }),
          );
        },
      });
      return client;
    },
    deliverBrokerCallback() {
      if (!pendingBrokerCallback) {
        throw Error('missing SIWE broker callback');
      }
      const callback = pendingBrokerCallback;
      pendingBrokerCallback = undefined;
      viz.reply(
        'S',
        callback.resume.designation,
        `complete(${callback.exchange.designation})`,
      );
      return callback.resume.complete(callback.exchange);
    },
    idTokenVerifier: idTokenKey.verifier,
  });
};

const makeUser = (viz: Viz, address: string) => {
  let consentForm: ConsentForm | undefined;
  return harden({
    browser: harden({
      showSignInPage(page: SignInPage) {
        const proof = signWalletProof({
          address,
          domain: 'siwe.ymax.app',
          nonce: page.nonce,
          resource: page.resource,
        });
        viz.cont(
          'User',
          'User',
          `wallet signs EIP-4361({ address: ${proof.address}, nonce: ${proof.nonce}, signature: ${proof.signature} })`,
        );
        viz.call(
          'User',
          page.session.designation,
          `signIn({ signature: ${proof.signature} })`,
        );
        return page.session.signIn(proof);
      },
      showConsent(form: ConsentPage) {
        assertEqual(form.applicationHost, 'claude.ai', 'validated app host');
        consentForm = form;
      },
    }),
    authorizeConsent(agent: string, submittedScopes: readonly string[]) {
      if (!consentForm) {
        throw Error('consent form is not available');
      }
      return consentForm.authorize(agent, submittedScopes);
    },
  });
};

type ConsentSession = Readonly<{
  wallet: string;
  clientId: string;
  redirectHost: string;
  kcAuthSession: string;
  consentSessionId: string;
}>;

type Grant = Readonly<{
  grantId: string;
  wallet: string;
  agent: string;
  scopes: readonly string[];
  clientId: string;
  redirectHost: string;
  kcAuthSession: string;
  revoked: boolean;
  exp: number;
}>;

const makeKeycloak = (
  viz: Viz,
  siwe: SiweBrokerClient,
  idTokenVerifier: ReturnType<typeof makeSigningFacets<IdClaims>>['verifier'],
  consentReceiver: ReturnType<typeof makeYmaxMcpServerKit>['consentReceiver'],
  entropy: ActorEntropy,
) => {
  const config = harden({
    issuer: 'https://auth.ymax.app/realms/ymax',
    audience: 'https://ymax.app/mcp',
  });
  const prng = entropy.makePrng([
    'e7c4',
    'c482d1',
    '92afc4',
    'a73e',
    'c48b2d',
    '76e4b9',
    'a83fd2',
  ]);
  const clients = new Map<
    string,
    Readonly<{ client: OAuthClient; redirectUris: readonly string[] }>
  >();
  let pending:
    | Readonly<{
        clientId: string;
        redirectHost: string;
        request: AuthorizationRequest;
        user: AuthorizationBrowser;
        callback: { receive(response: AuthorizationResponse): void };
        oidcNonce: string;
        kcAuthSession: string;
      }>
    | undefined;
  let authenticatedIdentity:
    | Readonly<{ sub: string; nonce: string }>
    | undefined;
  let sessionGrant: GrantFacet | undefined;
  const authorizationCodes = new Map<
    string,
    Readonly<{
      clientId: string;
      codeChallenge: string;
      grant: GrantFacet;
    }>
  >();

  const authorizeClient = (
    suppliedClientId: string,
    request: AuthorizationRequest,
    user: AuthorizationBrowser,
    callback: { receive(response: AuthorizationResponse): void },
  ) => {
    const registration = clients.get(suppliedClientId);
    if (!registration) {
      throw Error(`unknown OAuth client ${suppliedClientId}`);
    }
    if (!registration.redirectUris.includes(request.redirectUri)) {
      throw Error('unregistered redirect URI');
    }
    assertEqual(request.codeChallengeMethod, 'S256', 'PKCE method');
    assertEqual(request.resource, config.audience, 'OAuth resource');
    const brokerTag = prng.randomChars();
    const oidcNonce = prng.makeId('oidc-nonce');
    const kcAuthSession = prng.makeId('kc-auth-session');
    const authorization = harden({
      clientId: suppliedClientId,
      redirectHost: new URL(request.redirectUri).host,
      request,
      user,
      callback,
      oidcNonce,
      kcAuthSession,
    });
    pending = authorization;
    authenticatedIdentity = undefined;
    sessionGrant = undefined;
    let resumeCount = 0;
    const resumeDesignation = `resumeBroker@AS[${brokerTag}]`;
    const resume: BrokerContinuation = harden({
      designation: resumeDesignation,
      complete(exchange) {
        if (resumeCount !== 0) {
          throw Error('broker continuation already consumed');
        }
        resumeCount += 1;
        viz.cont(resumeDesignation, exchange.designation, 'exchange()');
        const signedIdToken = exchange.exchange();
        const idToken = idTokenVerifier.verify(signedIdToken);
        assertEqual(idToken.nonce, authorization.oidcNonce, 'OIDC nonce');
        authenticatedIdentity = idToken;
        return idToken;
      },
    });
    viz.cont(
      'AS',
      siwe.designation,
      `authorize({ nonce: ${oidcNonce} }, ${resumeDesignation})`,
    );
    siwe.authorize(harden({ oidcNonce }), user, resume);
  };

  /**
   * Delivers the capabilities represented on the wire by OAuth tokens.
   *
   * The authorization code selects the RS grant reference stored by the
   * consent continuation. The short-lived access token is decompiled as that
   * reference itself; only the independently allocated AS refresh facet
   * represents longer-lived renewal authority.
   */
  const tokenForClient = (
    suppliedClientId: string,
    code: string,
    verifier: string,
  ) => {
    const registration = clients.get(suppliedClientId);
    if (!registration) {
      throw Error(`unknown OAuth client ${suppliedClientId}`);
    }
    const authorization = authorizationCodes.get(code);
    if (!authorization) {
      throw Error('invalid or replayed authorization code');
    }
    assertEqual(authorization.clientId, suppliedClientId, 'code client');
    assertEqual(
      authorization.codeChallenge,
      `challenge-${verifier}`,
      'PKCE challenge',
    );
    authorizationCodes.delete(code);
    viz.cont('AS', 'AS', 'verify S256 PKCE; project session notes');
    const refreshTag = prng.randomChars();
    const refresh = harden({
      designation: `refresh@AS[${refreshTag}]`,
      refresh() {
        return authorization.grant;
      },
    });
    const tokens = harden({
      grant: authorization.grant,
      refresh,
    });
    viz.reply(
      registration.client.designation,
      'H',
      `${authorization.grant.designation} + ${refresh.designation}`,
    );
    return tokens;
  };

  return harden({
    metadata() {
      viz.reply(
        'AS',
        'H',
        'issuer + endpoints + code_challenge_methods_supported=[S256]',
      );
      return harden({
        issuer: config.issuer,
        supportsS256: true,
        authorizationResponseIssuer: true,
      });
    },
    register({
      redirectUris,
      tokenEndpointAuthMethod,
    }: {
      redirectUris: string[];
      tokenEndpointAuthMethod: string;
    }) {
      assertEqual(tokenEndpointAuthMethod, 'none', 'public client auth method');
      for (const uri of redirectUris) {
        const loopback = /^http:\/\/(127\.0\.0\.1|\[::1\]):\*$/.test(uri);
        if (uri.includes('*') && !loopback) {
          throw Error('wildcard redirect is restricted to loopback');
        }
      }
      const clientTag = prng.randomChars();
      const clientId = `client-${clientTag}`;
      const designation = `client@AS[${clientTag}]`;
      const registeredRedirectUris = harden([...redirectUris]);
      const client = makeKeycloakClientFacet(clientId, designation, {
        authorize(
          request: AuthorizationRequest,
          user: AuthorizationBrowser,
          callback: { receive(response: AuthorizationResponse): void },
        ) {
          return authorizeClient(clientId, request, user, callback);
        },
        token(code: string, verifier: string) {
          return tokenForClient(clientId, code, verifier);
        },
      });
      clients.set(
        client.clientId,
        harden({ client, redirectUris: registeredRedirectUris }),
      );
      viz.reply('AS', 'H', client.designation);
      return client;
    },
    beginConsent() {
      if (!pending || !authenticatedIdentity) {
        throw Error('authentication is not complete');
      }
      const activeSession = pending;
      const identity = authenticatedIdentity;
      const consentTag = prng.randomChars();
      const session = harden({
        wallet: identity.sub,
        clientId: activeSession.clientId,
        redirectHost: activeSession.redirectHost,
        kcAuthSession: activeSession.kcAuthSession,
        consentSessionId: `consent-${consentTag}`,
      });
      const continuationDesignation = `consent@AS[${consentTag}]`;
      viz.cont(
        'AS',
        'RS',
        `openConsent({ wallet: ${session.wallet}, client_id: ${session.clientId}, redirect_host: ${session.redirectHost} }, ${continuationDesignation})`,
      );
      // POLA AFFIRMATION: `complete` is an auth-session-specific continuation,
      // not Keycloak's whole login-actions or admin API. The destination is the
      // held facet, so no return_uri argument is needed in this model.
      let consumed = false;
      /**
       * Decompiled form of the signed `session_token` / `return_token`
       * exchange.
       *
       * AS gives RS only this authentication-session-specific continuation.
       * Calling `complete` transfers the RS-created grant back into precisely
       * the session being resumed; object identity replaces signature,
       * `return_uri`, and `kc_auth_session` routing checks. Cloud SQL separately
       * imports the session `jti` as a durable one-shot grant slot.
       */
      const resume = harden({
        designation: continuationDesignation,
        complete(grant: GrantFacet) {
          if (consumed) {
            throw Error('authentication continuation already consumed');
          }
          consumed = true;
          sessionGrant = grant;
          viz.cont(
            continuationDesignation,
            'AS',
            `sessionGrant = ${grant.designation}`,
          );
        },
      });
      return consentReceiver.openConsent(session, resume, activeSession.user);
    },
    finishAuthorization() {
      if (!pending || !authenticatedIdentity || !sessionGrant) {
        throw Error('authorization is not ready');
      }
      const code = prng.makeId('authorization-code');
      authorizationCodes.set(
        code,
        harden({
          clientId: pending.clientId,
          codeChallenge: pending.request.codeChallenge,
          grant: sessionGrant,
        }),
      );
      viz.cont(
        'AS',
        'AS',
        `authorizationCodes.set(${code}, { clientId: ${pending.clientId}, codeChallenge: ${pending.request.codeChallenge}, grant: ${sessionGrant.designation} })`,
      );
      const response = harden({
        code,
        state: pending.request.state,
        iss: config.issuer,
      });
      viz.reply(
        'AS',
        'H',
        `authorizationResponse({ code: ${response.code}, state: ${response.state}, iss: ${response.iss} })`,
      );
      pending.callback.receive(response);
    },
  });
};

const makeHarness = (
  viz: Viz,
  resourceServer: YmaxMcpPublic,
  entropy: ActorEntropy,
) => {
  const config = harden({
    redirectUri: 'https://claude.ai/api/mcp/auth_callback',
  });
  const prng = entropy.makePrng(['6b91e3', 'a7f3c2']);
  // OAuth `state` from B9: retained by H and matched on the D30 callback.
  let state: string | undefined;
  let codeVerifier: string | undefined;
  let client: OAuthClient | undefined;
  let resource: string | undefined;
  let expectedIssuer: string | undefined;
  let authorizationResponse: AuthorizationResponse | undefined;
  const callback = harden({
    receive(response: AuthorizationResponse) {
      assertEqual(response.state, state, 'harness state');
      assertEqual(
        response.iss,
        expectedIssuer,
        'authorization response issuer',
      );
      authorizationResponse = response;
    },
  });
  return harden({
    discoverAndRegister() {
      viz.call('H', 'RS', 'POST /mcp (no token)');
      const challenge = resourceServer.callWithoutToken();
      resource = challenge.resource;

      viz.call('H', 'RS', 'GET oauth-protected-resource metadata');
      const resourceMetadata = resourceServer.metadata();
      assertEqual(
        resourceMetadata.resource,
        challenge.resource,
        'resource metadata identity',
      );

      const { authorizationServer } = resourceMetadata;
      viz.call('H', 'AS', 'GET authorization-server metadata');
      const asMetadata = authorizationServer.metadata();
      expectedIssuer = asMetadata.issuer;
      assertEqual(asMetadata.supportsS256, true, 'S256 support');

      viz.call('H', 'AS', 'POST /register (publicClientMetadata)');
      client = authorizationServer.register({
        redirectUris: ['http://127.0.0.1:*', config.redirectUri],
        tokenEndpointAuthMethod: 'none',
      });
      return client;
    },
    beginAuthorization(user: AuthorizationBrowser) {
      if (!client || !resource) {
        throw Error('OAuth discovery and registration are incomplete');
      }
      state = prng.makeId('state');
      codeVerifier = prng.randomChars();
      const request = harden({
        codeChallenge: `challenge-${codeVerifier}`,
        codeChallengeMethod: 'S256' as const,
        redirectUri: config.redirectUri,
        scope: harden(['openid', 'portfolio:allocation']),
        resource,
        state,
      });
      viz.call(
        'H',
        client.designation,
        `authorize({ code_challenge: ${request.codeChallenge}, redirect_uri: ${request.redirectUri}, scope: [${request.scope.join(', ')}], resource: ${request.resource}, state: ${request.state} })`,
      );
      client.authorize(request, user, callback);
    },
    exchangeAuthorizationCode() {
      if (!client || !authorizationResponse || !codeVerifier) {
        throw Error('missing authorization response');
      }
      viz.call(
        'H',
        client.designation,
        `token({ code: ${authorizationResponse.code}, code_verifier: ${codeVerifier} })`,
      );
      return client.token(authorizationResponse.code, codeVerifier);
    },
  });
};

const makeOAuthSimulationFixture = ({
  address = '0xAbC',
  discover = true,
}: { address?: string; discover?: boolean } = {}) => {
  const viz = makeSequenceDiagram();
  const entropyRegistry = makeFakePrngRegistry();
  const cloudSqlKit = makeCloudSqlKit(viz);
  cloudSqlKit.delegationConfirmer.confirmDelegation(
    'eip155:8453:0xAbC',
    'agoric1managed',
  );
  const agoricChain = makeAgoricChain(viz);
  const yds = makeYds(viz, agoricChain);
  const tool = harden({
    invoke(_request: object, authority: { allows(scope: string): boolean }) {
      return authority.allows('portfolio:allocation') ? 'invoked' : 'denied';
    },
  });
  let connectedKeycloakDiscovery: DiscoveryAS | undefined;
  const ymaxMcpServer = makeYmaxMcpServerKit(
    viz,
    () => {
      if (!connectedKeycloakDiscovery) {
        throw Error('Keycloak discovery is not connected');
      }
      return connectedKeycloakDiscovery;
    },
    {
      yds,
      managedAgents: cloudSqlKit.managedAgents,
      grantWriter: cloudSqlKit.grantWriter,
      grantReader: cloudSqlKit.grantReader,
      tool,
    },
    entropyRegistry.actor('RS'),
  );
  const user = makeUser(viz, address);
  const siwe = makeSiweOidcProvider(viz, entropyRegistry.actor('SIWE'));
  const siweBroker = siwe.registerBrokerClient();
  const keycloak = makeKeycloak(
    viz,
    siweBroker,
    siwe.idTokenVerifier,
    ymaxMcpServer.consentReceiver,
    entropyRegistry.actor('AS'),
  );
  const keycloakDiscovery: DiscoveryAS = harden({
    metadata: keycloak.metadata,
    register: keycloak.register,
  });
  connectedKeycloakDiscovery = keycloakDiscovery;
  const harness = makeHarness(
    viz,
    ymaxMcpServer.publicMcp,
    entropyRegistry.actor('H'),
  );
  if (discover) {
    viz.pause();
    harness.discoverAndRegister();
    viz.resume();
  }
  return harden({
    viz,
    user,
    siwe,
    keycloak,
    keycloakDiscovery,
    ymaxMcpServer,
    cloudSqlKit,
    harness,
  });
};

test('OAuth design B9-B13: broker redirect obtains a fresh wallet proof', t => {
  const { viz, user, harness } = makeOAuthSimulationFixture();

  harness.beginAuthorization(user.browser);

  // SECURITY AFFIRMATION: H never receives the SIWE capability. AS alone holds
  // the broker API, while User receives only a page/session designation.
  // SIMULATION NOTE: the SHA-256 prefix binds all modeled proof fields, including
  // address. Production instead recovers the address from an EIP-4361 signature.
  t.snapshot(viz.lines(), 'sequence diagram');
});

test('SIWE rejects a malformed wallet signature', t => {
  const siwe = makeSiweOidcProvider(
    makeSequenceDiagram(),
    makeFakePrngRegistry().actor('SIWE'),
  );
  const brokerClient = siwe.registerBrokerClient();
  t.throws(() => siwe.registerBrokerClient(), {
    message: 'SIWE broker client is already registered',
  });
  let signInPage: SignInPage | undefined;
  brokerClient.authorize(
    {
      oidcNonce: 'test-oidc-nonce',
    },
    harden({
      showSignInPage(page: SignInPage) {
        signInPage = page;
      },
    }),
    harden({
      designation: 'resumeBroker@AS[test]',
      complete(exchange) {
        t.deepEqual(Object.keys(exchange), ['designation', 'exchange']);
        const signedIdToken = exchange.exchange();
        t.throws(() => exchange.exchange(), {
          message: 'SIWE exchange already consumed',
        });
        return signedIdToken.payload;
      },
    }),
  );
  const page = signInPage;
  if (!page) {
    throw Error('missing SIWE sign-in page');
  }

  t.throws(
    () =>
      page.session.signIn({
        address: '0xAbC',
        domain: 'siwe.ymax.app',
        nonce: page.nonce,
        resource: page.resource,
        signature: 'bad-signature',
      }),
    { message: /SIWE signature/ },
  );
  t.deepEqual(Object.keys(brokerClient), ['designation', 'authorize']);
  t.deepEqual(Object.keys(page.session), ['designation', 'signIn']);
  const proof = signWalletProof({
    address: '0xAbC',
    domain: 'siwe.ymax.app',
    nonce: page.nonce,
    resource: page.resource,
  });
  page.session.signIn(proof);
  t.throws(() => page.session.signIn(proof), {
    message: 'SIWE sign-in session already consumed',
  });
  t.is(siwe.deliverBrokerCallback().sub, 'eip155:8453:0xAbC');
});

test('OAuth design B14-B15: broker continuation receives one-shot exchange', t => {
  const { viz, user, siwe, harness } = makeOAuthSimulationFixture();
  viz.pause();
  harness.beginAuthorization(user.browser);
  viz.resume();

  const idToken = siwe.deliverBrokerCallback();

  // SECURITY AFFIRMATION: the registered-client, broker-continuation, and
  // exchange facets replace client-secret, state, and code routing authority.
  // The signed OIDC nonce remains cryptographic correlation data.
  t.is(idToken.sub, 'eip155:8453:0xAbC');
  t.snapshot(viz.lines(), 'sequence diagram');
});

// Stage C --------------------------------------------------------------------

const makeCloudSqlKit = (viz: Viz) => {
  const managedByWallet = new Map<string, readonly string[]>();
  const grants = new Map<string, Grant>();
  const consumedSessionJtis = new Set<string>();
  let available = true;
  return harden({
    delegationConfirmer: harden({
      confirmDelegation(wallet: string, agent: string) {
        const managed = managedByWallet.get(wallet) ?? harden([]);
        if (!managed.includes(agent)) {
          managedByWallet.set(wallet, harden([...managed, agent]));
        }
      },
    }),
    managedAgents: harden({
      forWallet(wallet: string) {
        const agents = managedByWallet.get(wallet) ?? harden([]);
        viz.reply('DB', 'RS', `[${agents.join(', ')}]`);
        return agents;
      },
    }),
    grantWriter: harden({
      claimSession(sessionJti: string) {
        if (consumedSessionJtis.has(sessionJti)) {
          throw Error('consent session already consumed');
        }
        consumedSessionJtis.add(sessionJti);
        const designation = `grantSlot@DB[${sessionJti}]`;
        let insertCount = 0;
        return harden({
          designation,
          insert(grant: Grant) {
            if (insertCount !== 0) {
              throw Error('grant slot already consumed');
            }
            insertCount += 1;
            grants.set(grant.grantId, grant);
          },
        });
      },
    }),
    grantReader: harden({
      get(grantId: string) {
        if (!available) {
          throw Error('grant database unavailable');
        }
        const grant = grants.get(grantId);
        viz.reply('DB', 'RS', 'grant row (or none)');
        return grant;
      },
    }),
    availabilityControl: harden({
      setAvailable(value: boolean) {
        available = value;
      },
    }),
    inspection: harden({
      onlyGrant() {
        if (grants.size !== 1) {
          throw Error(`expected one grant, got ${grants.size}`);
        }
        return [...grants.values()][0];
      },
    }),
  });
};

test('Cloud SQL learns managed agents from confirmed delegations', t => {
  const cloudSqlKit = makeCloudSqlKit(makeSequenceDiagram());
  const wallet = 'eip155:8453:0xAbC';
  const agent = 'agoric1managed';

  t.deepEqual(cloudSqlKit.managedAgents.forWallet(wallet), []);
  cloudSqlKit.delegationConfirmer.confirmDelegation(wallet, agent);
  t.deepEqual(cloudSqlKit.managedAgents.forWallet(wallet), [agent]);
});

const formatPermissions = (permissions: PortfolioAgentStatus['permissions']) =>
  `{ ${Object.entries(permissions)
    .map(([name, value]) => `${name}: ${String(value)}`)
    .join(', ')} }`;

const formatAgentStatus = ({
  grantee,
  permissions,
  state,
}: PortfolioAgentStatus) =>
  `{ grantee: ${grantee}, permissions: ${formatPermissions(permissions)}, state: ${state} }`;

const makeAgoricChain = (viz: Viz) => {
  const agentsByPortfolio = new Map<PortfolioKey, StatusFor['portfolioAgents']>(
    [
      [
        'portfolio17',
        harden({
          agent1: harden({
            grantee: 'agoric1managed',
            permissions: harden({ allocation: true }),
            state: 'active',
          }),
          agent2: harden({
            grantee: 'agoric1unmanaged',
            permissions: harden({ 'admin-not-in-catalog': true }),
            state: 'active',
          }),
        }),
      ],
    ],
  );
  return harden({
    readPortfolioAgents(portfolioId: PortfolioKey) {
      const agents = agentsByPortfolio.get(portfolioId) ?? harden({});
      viz.reply(
        'Chain',
        'YDS',
        `{ ${(
          Object.entries(agents) as [PortfolioAgentKey, PortfolioAgentStatus][]
        )
          .map(
            ([agentId, status]) => `${agentId}: ${formatAgentStatus(status)}`,
          )
          .join(', ')} }`,
      );
      return agents;
    },
  });
};

type IndexedDelegation = PortfolioAgentStatus & {
  portfolioId: PortfolioKey;
  agentId: PortfolioAgentKey;
};

const makeYds = (viz: Viz, chain: ReturnType<typeof makeAgoricChain>) => {
  const portfoliosByWallet = new Map<string, readonly PortfolioKey[]>([
    ['eip155:8453:0xAbC', harden(['portfolio17'])],
  ]);
  return harden({
    listDelegations(wallet: string) {
      const portfolioIds = portfoliosByWallet.get(wallet) ?? harden([]);
      const delegations = portfolioIds.flatMap(portfolioId => {
        viz.cont('YDS', 'Chain', `readPortfolioAgents(${portfolioId})`);
        return (
          Object.entries(chain.readPortfolioAgents(portfolioId)) as [
            PortfolioAgentKey,
            PortfolioAgentStatus,
          ][]
        ).map(([agentId, status]) =>
          harden({
            portfolioId,
            agentId,
            ...status,
          }),
        );
      }) as readonly IndexedDelegation[];
      viz.reply(
        'YDS',
        'RS',
        `[${delegations
          .map(
            ({ portfolioId, agentId, ...status }) =>
              `{ portfolioId: ${portfolioId}, agentId: ${agentId}, grantee: ${status.grantee}, permissions: ${formatPermissions(status.permissions)}, state: ${status.state} }`,
          )
          .join(', ')}]`,
      );
      return harden(delegations);
    },
  });
};

test('YDS resolves portfolio agent records without inventing a chain shape', t => {
  const viz = makeSequenceDiagram();
  const yds = makeYds(viz, makeAgoricChain(viz));

  t.deepEqual(yds.listDelegations('eip155:8453:0xAbC'), [
    {
      portfolioId: 'portfolio17',
      agentId: 'agent1',
      grantee: 'agoric1managed',
      permissions: { allocation: true },
      state: 'active',
    },
    {
      portfolioId: 'portfolio17',
      agentId: 'agent2',
      grantee: 'agoric1unmanaged',
      permissions: { 'admin-not-in-catalog': true },
      state: 'active',
    },
  ]);
});

/**
 * Constructs the related facets of the concrete YMax MCP server actor.
 *
 * `publicMcp` is safe for H to hold for challenges and discovery, while
 * `consentReceiver` is the narrower facet given to Keycloak. Grant facets are
 * allocated from the same closure after consent. The late-bound discovery
 * getter breaks the RS/Keycloak construction cycle without merging their
 * authority.
 */
const makeYmaxMcpServerKit = (
  viz: Viz,
  getAuthorizationServer: () => DiscoveryAS,
  powers: {
    yds: ReturnType<typeof makeYds>;
    managedAgents: ReturnType<typeof makeCloudSqlKit>['managedAgents'];
    grantWriter: ReturnType<typeof makeCloudSqlKit>['grantWriter'];
    grantReader: ReturnType<typeof makeCloudSqlKit>['grantReader'];
    tool: {
      invoke(
        request: object,
        authority: { allows(scope: string): boolean },
      ): string;
    };
  },
  entropy: ActorEntropy,
) => {
  const resource = 'https://ymax.app/mcp';
  const writeCatalog = harden(['portfolio:allocation']);
  const prng = entropy.makePrng(['85d3b5', 'f17e42']);
  const publicMcp: YmaxMcpPublic = harden({
    callWithoutToken() {
      viz.reply('RS', 'H', '401 + WWW-Authenticate: resource_metadata + scope');
      return harden({
        status: 401,
        resource,
        scopes: writeCatalog,
      });
    },
    metadata() {
      // In this object graph the held reference designates AS. On the wire the
      // AS URL is attacker-controlled data until H validates resource + issuer.
      viz.reply(
        'RS',
        'H',
        'resource + authorization_servers + scopes_supported',
      );
      return harden({
        resource,
        authorizationServer: getAuthorizationServer(),
        scopes: writeCatalog,
      });
    },
  });
  const consentReceiver = harden({
    openConsent(
      session: ConsentSession,
      resume: {
        designation: string;
        complete(grant: GrantFacet): void;
      },
      user: AuthorizationBrowser,
    ) {
      viz.cont('RS', 'DB', `claimSession(${session.consentSessionId})`);
      const grantSlot = powers.grantWriter.claimSession(
        session.consentSessionId,
      );
      viz.reply('DB', 'RS', grantSlot.designation);

      viz.cont('RS', 'YDS', `listDelegations(${session.wallet})`);
      const delegated = powers.yds.listDelegations(session.wallet);

      viz.cont('RS', 'DB', `readManagedAgents(${session.wallet})`);
      const managed = powers.managedAgents.forWallet(session.wallet);

      const eligibleDelegations = delegated.filter(
        ({ grantee, state }) => state === 'active' && managed.includes(grantee),
      );
      const eligibleAgents = harden([
        ...new Set(eligibleDelegations.map(({ grantee }) => grantee)),
      ]);
      const scopesByAgent = harden(
        Object.fromEntries(
          eligibleAgents.map(agent => [
            agent,
            [
              ...new Set(
                eligibleDelegations
                  .filter(({ grantee }) => grantee === agent)
                  .flatMap(({ permissions }) =>
                    Object.entries(permissions)
                      .filter(([, allowed]) => allowed === true)
                      .map(([permission]) => `portfolio:${permission}`),
                  ),
              ),
            ].filter(scope => writeCatalog.includes(scope)),
          ]),
        ),
      );
      viz.cont('RS', 'RS', `eligibleAgents = [${eligibleAgents.join(', ')}]`);
      viz.reply(
        'RS',
        'User',
        `showConsent({ applicationHost: ${session.redirectHost}, agents: { ${eligibleAgents
          .map(agent => `${agent}: [${scopesByAgent[agent].join(', ')}]`)
          .join(', ')} } })`,
      );

      // This per-session facet is preferable to giving the browser or consent
      // handler a general RS capability plus wallet/client/session identifiers.
      const form = harden({
        authorize(agent: string, submittedScopes: readonly string[]) {
          viz.call(
            'User',
            'RS',
            `authorize({ agent: ${agent}, scopes: [${submittedScopes.join(', ')}] })`,
          );
          if (!eligibleAgents.some(eligibleAgent => eligibleAgent === agent)) {
            throw Error('submitted agent is not eligible');
          }
          const grantedScopes = submittedScopes.filter(
            scope =>
              scopesByAgent[agent].includes(scope) &&
              writeCatalog.includes(scope),
          );
          viz.cont(
            'RS',
            'RS',
            'verify session; reject agent; clamp scopes to chain AND catalog',
          );
          const grantId = prng.randomChars();
          viz.cont(
            'RS',
            grantSlot.designation,
            `insertGrant({ grant_id: ${grantId}, wallet: ${session.wallet}, agent: ${agent}, scopes: [${grantedScopes.join(', ')}], client_id: ${session.clientId}, kc_auth_session: ${session.kcAuthSession} })`,
          );
          grantSlot.insert(
            harden({
              grantId,
              wallet: session.wallet,
              agent,
              scopes: harden(grantedScopes),
              clientId: session.clientId,
              redirectHost: session.redirectHost,
              kcAuthSession: session.kcAuthSession,
              revoked: false,
              exp: 200,
            }),
          );
          const designation = `grant@RS[${grantId}]`;
          /**
           * Allocates the RS-local object represented by an accepted access
           * token on the wire.
           *
           * The grant ID remains encapsulated in this closure. H receives the
           * facet through AS, not the ID as ambient lookup data, and every call
           * consults the authoritative row before deriving tool authority.
           */
          const grantFacet = harden({
            designation,
            callTool(request: object) {
              viz.cont(
                designation,
                'DB',
                `readGrant({ grant_id: ${grantId} })`,
              );
              const grant = powers.grantReader.get(grantId);
              viz.cont(
                designation,
                designation,
                'reject unless grant is live; fail closed',
              );
              if (!grant || grant.revoked || grant.exp <= 0) {
                throw Error('grant is not live');
              }
              const authority = harden({
                allows(scope: string) {
                  return grant.scopes.includes(scope);
                },
              });
              const result = powers.tool.invoke(request, authority);
              viz.reply(designation, 'H', 'tool result');
              return result;
            },
          });
          viz.cont(
            'RS',
            resume.designation,
            `complete(${grantFacet.designation})`,
          );
          resume.complete(grantFacet);
        },
      });
      user.showConsent({
        applicationHost: session.redirectHost,
        eligibleAgents,
        scopesByAgent,
        ...form,
      });
    },
  });
  return harden({ publicMcp, consentReceiver });
};

test('OAuth design C16-C25: consent intersects delegated and managed agents', t => {
  const { viz, user, siwe, keycloak, harness } = makeOAuthSimulationFixture();
  viz.pause();
  harness.beginAuthorization(user.browser);
  siwe.deliverBrokerCallback();
  viz.resume();
  keycloak.beginConsent();

  // SECURITY AFFIRMATION: RS receives read-only YDS and managed-agent lookup
  // facets, not chain admin, KMS, or a general database connection.
  // The wallet/client/application identity arrives only through AS's held RS
  // capability; the consent form cannot designate another principal.
  t.snapshot(viz.lines(), 'sequence diagram');
});

test('OAuth design C: consent wallet comes from the verified SIWE subject', t => {
  const { viz, user, siwe, keycloak, harness } = makeOAuthSimulationFixture({
    address: '0xDef',
  });
  viz.pause();
  harness.beginAuthorization(user.browser);
  siwe.deliverBrokerCallback();
  viz.resume();
  keycloak.beginConsent();

  t.true(
    viz
      .lines()
      .includes(
        'AS-->>RS: openConsent({ wallet: eip155:8453:0xDef, client_id: client-e7c4, redirect_host: claude.ai }, consent@AS[c48b2d])',
      ),
  );
  t.throws(
    () => user.authorizeConsent('agoric1managed', ['portfolio:allocation']),
    { message: 'submitted agent is not eligible' },
  );
});

test('OAuth design C26-C29: untrusted consent input cannot widen a grant', t => {
  const { viz, cloudSqlKit, user, siwe, keycloak, harness } =
    makeOAuthSimulationFixture();
  viz.pause();
  harness.beginAuthorization(user.browser);
  siwe.deliverBrokerCallback();
  viz.resume();
  keycloak.beginConsent();
  viz.reset();

  t.throws(
    () =>
      user.authorizeConsent('agoric1unmanaged', [
        'portfolio:admin-not-in-catalog',
      ]),
    {
      message: 'submitted agent is not eligible',
    },
  );
  viz.reset();
  user.authorizeConsent('agoric1managed', [
    'portfolio:allocation',
    'portfolio:admin-not-in-catalog',
  ]);
  const grant = cloudSqlKit.inspection.onlyGrant();

  // SECURITY AFFIRMATION: agent selection is rejected rather than clamped, and
  // scopes are clamped to both chain permission and the write catalog.
  t.deepEqual(grant?.scopes, ['portfolio:allocation']);
  t.snapshot(viz.lines(), 'sequence diagram');
  // SECURITY AFFIRMATION: the one-shot continuation and durable grant slot make
  // the whole consent form one-use even though its methods remain reachable.
  t.throws(
    () => user.authorizeConsent('agoric1managed', ['portfolio:allocation']),
    {
      message: 'grant slot already consumed',
    },
  );
});

// Stage D --------------------------------------------------------------------

test('OAuth design D: callback validation precedes PKCE token exchange', t => {
  const { viz, user, siwe, keycloak, harness } = makeOAuthSimulationFixture();
  viz.pause();
  harness.beginAuthorization(user.browser);
  siwe.deliverBrokerCallback();
  keycloak.beginConsent();
  user.authorizeConsent('agoric1managed', ['portfolio:allocation']);
  viz.resume();

  keycloak.finishAuthorization();
  const tokens = harness.exchangeAuthorizationCode();

  // SECURITY AFFIRMATION: AS mix-up defense is performed by H before H invokes
  // the token receiver. Checking JWT issuer later at RS cannot replace this.
  // POLA: the callback reference designates H; redirect_uri is routing data in
  // HTTP and is deliberately absent from the visible message label here.
  t.is(tokens.grant.designation, 'grant@RS[85d3b5]');
  t.is(tokens.refresh.refresh(), tokens.grant);
  t.snapshot(viz.lines(), 'sequence diagram');
});

// Stage E --------------------------------------------------------------------

test('OAuth design E: the RS grant facet enforces live grant state', t => {
  const { viz, cloudSqlKit, user, siwe, keycloak, harness } =
    makeOAuthSimulationFixture();
  viz.pause();
  harness.beginAuthorization(user.browser);
  siwe.deliverBrokerCallback();
  keycloak.beginConsent();
  user.authorizeConsent('agoric1managed', ['portfolio:allocation']);
  keycloak.finishAuthorization();
  const tokens = harness.exchangeAuthorizationCode();
  viz.resume();

  viz.call('H', tokens.grant.designation, 'tools/call(tool request)');
  t.is(
    tokens.grant.callTool(harden({ tool: 'setTargetAllocation' })),
    'invoked',
  );
  t.snapshot(viz.lines(), 'sequence diagram');

  // SECURITY AFFIRMATION: H holds only the RS grant facet created during its
  // consent flow; the unguessable reference, not grant_id data, is authority.
  // WIRE-DESIGN NOTE: JWT verification is the transport-level operation that
  // imports the access_token serialization as this grant facet.
  // SECURITY CRITICISM: Stage E omits the RS->YDS/Chain re-check required by
  // invariant 11, so its request-validation sequence does not implement the
  // design's stated on-chain enforcement. Add that lookup before tool invocation.
  // POLA AFFIRMATION: RS derives a per-grant scope-checking facet for the tool;
  // neither the grant row nor a general database capability crosses that edge.
  // DESIGN CRITICISM: "handed to the MCP tool" leaves this attenuation and the
  // secure tool-dispatch rule unspecified in the design.
  cloudSqlKit.availabilityControl.setAvailable(false);
  t.throws(
    () => tokens.grant.callTool(harden({ tool: 'setTargetAllocation' })),
    {
      message: 'grant database unavailable',
    },
  );
});
