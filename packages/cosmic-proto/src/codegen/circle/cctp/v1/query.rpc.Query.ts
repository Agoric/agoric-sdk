//@ts-nocheck
import { Rpc } from '../../../helpers.js';
import { BinaryReader } from '../../../binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import {
  QueryRolesRequest,
  QueryRolesResponse,
  QueryGetAttesterRequest,
  QueryGetAttesterResponse,
  QueryAllAttestersRequest,
  QueryAllAttestersResponse,
  QueryGetPerMessageBurnLimitRequest,
  QueryGetPerMessageBurnLimitResponse,
  QueryAllPerMessageBurnLimitsRequest,
  QueryAllPerMessageBurnLimitsResponse,
  QueryGetBurningAndMintingPausedRequest,
  QueryGetBurningAndMintingPausedResponse,
  QueryGetSendingAndReceivingMessagesPausedRequest,
  QueryGetSendingAndReceivingMessagesPausedResponse,
  QueryGetMaxMessageBodySizeRequest,
  QueryGetMaxMessageBodySizeResponse,
  QueryGetNextAvailableNonceRequest,
  QueryGetNextAvailableNonceResponse,
  QueryGetSignatureThresholdRequest,
  QueryGetSignatureThresholdResponse,
  QueryGetTokenPairRequest,
  QueryGetTokenPairResponse,
  QueryAllTokenPairsRequest,
  QueryAllTokenPairsResponse,
  QueryGetUsedNonceRequest,
  QueryGetUsedNonceResponse,
  QueryAllUsedNoncesRequest,
  QueryAllUsedNoncesResponse,
  QueryRemoteTokenMessengerRequest,
  QueryRemoteTokenMessengerResponse,
  QueryRemoteTokenMessengersRequest,
  QueryRemoteTokenMessengersResponse,
  QueryBurnMessageVersionRequest,
  QueryBurnMessageVersionResponse,
  QueryLocalMessageVersionRequest,
  QueryLocalMessageVersionResponse,
  QueryLocalDomainRequest,
  QueryLocalDomainResponse,
} from './query.js';
/** Query defines the gRPC querier service. */
export interface Query {
  roles(request?: QueryRolesRequest): Promise<QueryRolesResponse>;
  /** Queries an Attester by index */
  attester(request: QueryGetAttesterRequest): Promise<QueryGetAttesterResponse>;
  /** Queries a list of Attesters */
  attesters(
    request?: QueryAllAttestersRequest,
  ): Promise<QueryAllAttestersResponse>;
  /** Queries a PerMessageBurnLimit by index */
  perMessageBurnLimit(
    request: QueryGetPerMessageBurnLimitRequest,
  ): Promise<QueryGetPerMessageBurnLimitResponse>;
  /** Queries a list of PerMessageBurnLimits */
  perMessageBurnLimits(
    request?: QueryAllPerMessageBurnLimitsRequest,
  ): Promise<QueryAllPerMessageBurnLimitsResponse>;
  /** Queries BurningAndMintingPaused */
  burningAndMintingPaused(
    request?: QueryGetBurningAndMintingPausedRequest,
  ): Promise<QueryGetBurningAndMintingPausedResponse>;
  /** Queries SendingAndReceivingPaused */
  sendingAndReceivingMessagesPaused(
    request?: QueryGetSendingAndReceivingMessagesPausedRequest,
  ): Promise<QueryGetSendingAndReceivingMessagesPausedResponse>;
  /** Queries the MaxMessageBodySize */
  maxMessageBodySize(
    request?: QueryGetMaxMessageBodySizeRequest,
  ): Promise<QueryGetMaxMessageBodySizeResponse>;
  /** Queries the NextAvailableNonce */
  nextAvailableNonce(
    request?: QueryGetNextAvailableNonceRequest,
  ): Promise<QueryGetNextAvailableNonceResponse>;
  /** Queries the SignatureThreshold */
  signatureThreshold(
    request?: QueryGetSignatureThresholdRequest,
  ): Promise<QueryGetSignatureThresholdResponse>;
  /** Queries a TokenPair by index */
  tokenPair(
    request: QueryGetTokenPairRequest,
  ): Promise<QueryGetTokenPairResponse>;
  /** Queries a list of TokenPair */
  tokenPairs(
    request?: QueryAllTokenPairsRequest,
  ): Promise<QueryAllTokenPairsResponse>;
  /** Queries a UsedNonce by index */
  usedNonce(
    request: QueryGetUsedNonceRequest,
  ): Promise<QueryGetUsedNonceResponse>;
  /** Queries a list of UsedNonces */
  usedNonces(
    request?: QueryAllUsedNoncesRequest,
  ): Promise<QueryAllUsedNoncesResponse>;
  /** Query the RemoteTokenMessenger of a specific domain. */
  remoteTokenMessenger(
    request: QueryRemoteTokenMessengerRequest,
  ): Promise<QueryRemoteTokenMessengerResponse>;
  /** Query all RemoteTokenMessenger's. */
  remoteTokenMessengers(
    request?: QueryRemoteTokenMessengersRequest,
  ): Promise<QueryRemoteTokenMessengersResponse>;
  burnMessageVersion(
    request?: QueryBurnMessageVersionRequest,
  ): Promise<QueryBurnMessageVersionResponse>;
  localMessageVersion(
    request?: QueryLocalMessageVersionRequest,
  ): Promise<QueryLocalMessageVersionResponse>;
  localDomain(
    request?: QueryLocalDomainRequest,
  ): Promise<QueryLocalDomainResponse>;
}
export class QueryClientImpl implements Query {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.roles = this.roles.bind(this);
    this.attester = this.attester.bind(this);
    this.attesters = this.attesters.bind(this);
    this.perMessageBurnLimit = this.perMessageBurnLimit.bind(this);
    this.perMessageBurnLimits = this.perMessageBurnLimits.bind(this);
    this.burningAndMintingPaused = this.burningAndMintingPaused.bind(this);
    this.sendingAndReceivingMessagesPaused =
      this.sendingAndReceivingMessagesPaused.bind(this);
    this.maxMessageBodySize = this.maxMessageBodySize.bind(this);
    this.nextAvailableNonce = this.nextAvailableNonce.bind(this);
    this.signatureThreshold = this.signatureThreshold.bind(this);
    this.tokenPair = this.tokenPair.bind(this);
    this.tokenPairs = this.tokenPairs.bind(this);
    this.usedNonce = this.usedNonce.bind(this);
    this.usedNonces = this.usedNonces.bind(this);
    this.remoteTokenMessenger = this.remoteTokenMessenger.bind(this);
    this.remoteTokenMessengers = this.remoteTokenMessengers.bind(this);
    this.burnMessageVersion = this.burnMessageVersion.bind(this);
    this.localMessageVersion = this.localMessageVersion.bind(this);
    this.localDomain = this.localDomain.bind(this);
  }
  roles(request: QueryRolesRequest = {}): Promise<QueryRolesResponse> {
    const data = QueryRolesRequest.encode(request).finish();
    const promise = this.rpc.request('circle.cctp.v1.Query', 'Roles', data);
    return promise.then(data =>
      QueryRolesResponse.decode(new BinaryReader(data)),
    );
  }
  attester(
    request: QueryGetAttesterRequest,
  ): Promise<QueryGetAttesterResponse> {
    const data = QueryGetAttesterRequest.encode(request).finish();
    const promise = this.rpc.request('circle.cctp.v1.Query', 'Attester', data);
    return promise.then(data =>
      QueryGetAttesterResponse.decode(new BinaryReader(data)),
    );
  }
  attesters(
    request: QueryAllAttestersRequest = {
      pagination: undefined,
    },
  ): Promise<QueryAllAttestersResponse> {
    const data = QueryAllAttestersRequest.encode(request).finish();
    const promise = this.rpc.request('circle.cctp.v1.Query', 'Attesters', data);
    return promise.then(data =>
      QueryAllAttestersResponse.decode(new BinaryReader(data)),
    );
  }
  perMessageBurnLimit(
    request: QueryGetPerMessageBurnLimitRequest,
  ): Promise<QueryGetPerMessageBurnLimitResponse> {
    const data = QueryGetPerMessageBurnLimitRequest.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Query',
      'PerMessageBurnLimit',
      data,
    );
    return promise.then(data =>
      QueryGetPerMessageBurnLimitResponse.decode(new BinaryReader(data)),
    );
  }
  perMessageBurnLimits(
    request: QueryAllPerMessageBurnLimitsRequest = {
      pagination: undefined,
    },
  ): Promise<QueryAllPerMessageBurnLimitsResponse> {
    const data = QueryAllPerMessageBurnLimitsRequest.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Query',
      'PerMessageBurnLimits',
      data,
    );
    return promise.then(data =>
      QueryAllPerMessageBurnLimitsResponse.decode(new BinaryReader(data)),
    );
  }
  burningAndMintingPaused(
    request: QueryGetBurningAndMintingPausedRequest = {},
  ): Promise<QueryGetBurningAndMintingPausedResponse> {
    const data =
      QueryGetBurningAndMintingPausedRequest.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Query',
      'BurningAndMintingPaused',
      data,
    );
    return promise.then(data =>
      QueryGetBurningAndMintingPausedResponse.decode(new BinaryReader(data)),
    );
  }
  sendingAndReceivingMessagesPaused(
    request: QueryGetSendingAndReceivingMessagesPausedRequest = {},
  ): Promise<QueryGetSendingAndReceivingMessagesPausedResponse> {
    const data =
      QueryGetSendingAndReceivingMessagesPausedRequest.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Query',
      'SendingAndReceivingMessagesPaused',
      data,
    );
    return promise.then(data =>
      QueryGetSendingAndReceivingMessagesPausedResponse.decode(
        new BinaryReader(data),
      ),
    );
  }
  maxMessageBodySize(
    request: QueryGetMaxMessageBodySizeRequest = {},
  ): Promise<QueryGetMaxMessageBodySizeResponse> {
    const data = QueryGetMaxMessageBodySizeRequest.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Query',
      'MaxMessageBodySize',
      data,
    );
    return promise.then(data =>
      QueryGetMaxMessageBodySizeResponse.decode(new BinaryReader(data)),
    );
  }
  nextAvailableNonce(
    request: QueryGetNextAvailableNonceRequest = {},
  ): Promise<QueryGetNextAvailableNonceResponse> {
    const data = QueryGetNextAvailableNonceRequest.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Query',
      'NextAvailableNonce',
      data,
    );
    return promise.then(data =>
      QueryGetNextAvailableNonceResponse.decode(new BinaryReader(data)),
    );
  }
  signatureThreshold(
    request: QueryGetSignatureThresholdRequest = {},
  ): Promise<QueryGetSignatureThresholdResponse> {
    const data = QueryGetSignatureThresholdRequest.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Query',
      'SignatureThreshold',
      data,
    );
    return promise.then(data =>
      QueryGetSignatureThresholdResponse.decode(new BinaryReader(data)),
    );
  }
  tokenPair(
    request: QueryGetTokenPairRequest,
  ): Promise<QueryGetTokenPairResponse> {
    const data = QueryGetTokenPairRequest.encode(request).finish();
    const promise = this.rpc.request('circle.cctp.v1.Query', 'TokenPair', data);
    return promise.then(data =>
      QueryGetTokenPairResponse.decode(new BinaryReader(data)),
    );
  }
  tokenPairs(
    request: QueryAllTokenPairsRequest = {
      pagination: undefined,
    },
  ): Promise<QueryAllTokenPairsResponse> {
    const data = QueryAllTokenPairsRequest.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Query',
      'TokenPairs',
      data,
    );
    return promise.then(data =>
      QueryAllTokenPairsResponse.decode(new BinaryReader(data)),
    );
  }
  usedNonce(
    request: QueryGetUsedNonceRequest,
  ): Promise<QueryGetUsedNonceResponse> {
    const data = QueryGetUsedNonceRequest.encode(request).finish();
    const promise = this.rpc.request('circle.cctp.v1.Query', 'UsedNonce', data);
    return promise.then(data =>
      QueryGetUsedNonceResponse.decode(new BinaryReader(data)),
    );
  }
  usedNonces(
    request: QueryAllUsedNoncesRequest = {
      pagination: undefined,
    },
  ): Promise<QueryAllUsedNoncesResponse> {
    const data = QueryAllUsedNoncesRequest.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Query',
      'UsedNonces',
      data,
    );
    return promise.then(data =>
      QueryAllUsedNoncesResponse.decode(new BinaryReader(data)),
    );
  }
  remoteTokenMessenger(
    request: QueryRemoteTokenMessengerRequest,
  ): Promise<QueryRemoteTokenMessengerResponse> {
    const data = QueryRemoteTokenMessengerRequest.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Query',
      'RemoteTokenMessenger',
      data,
    );
    return promise.then(data =>
      QueryRemoteTokenMessengerResponse.decode(new BinaryReader(data)),
    );
  }
  remoteTokenMessengers(
    request: QueryRemoteTokenMessengersRequest = {
      pagination: undefined,
    },
  ): Promise<QueryRemoteTokenMessengersResponse> {
    const data = QueryRemoteTokenMessengersRequest.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Query',
      'RemoteTokenMessengers',
      data,
    );
    return promise.then(data =>
      QueryRemoteTokenMessengersResponse.decode(new BinaryReader(data)),
    );
  }
  burnMessageVersion(
    request: QueryBurnMessageVersionRequest = {},
  ): Promise<QueryBurnMessageVersionResponse> {
    const data = QueryBurnMessageVersionRequest.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Query',
      'BurnMessageVersion',
      data,
    );
    return promise.then(data =>
      QueryBurnMessageVersionResponse.decode(new BinaryReader(data)),
    );
  }
  localMessageVersion(
    request: QueryLocalMessageVersionRequest = {},
  ): Promise<QueryLocalMessageVersionResponse> {
    const data = QueryLocalMessageVersionRequest.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Query',
      'LocalMessageVersion',
      data,
    );
    return promise.then(data =>
      QueryLocalMessageVersionResponse.decode(new BinaryReader(data)),
    );
  }
  localDomain(
    request: QueryLocalDomainRequest = {},
  ): Promise<QueryLocalDomainResponse> {
    const data = QueryLocalDomainRequest.encode(request).finish();
    const promise = this.rpc.request(
      'circle.cctp.v1.Query',
      'LocalDomain',
      data,
    );
    return promise.then(data =>
      QueryLocalDomainResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createRpcQueryExtension = (base: QueryClient) => {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);
  return {
    roles(request?: QueryRolesRequest): Promise<QueryRolesResponse> {
      return queryService.roles(request);
    },
    attester(
      request: QueryGetAttesterRequest,
    ): Promise<QueryGetAttesterResponse> {
      return queryService.attester(request);
    },
    attesters(
      request?: QueryAllAttestersRequest,
    ): Promise<QueryAllAttestersResponse> {
      return queryService.attesters(request);
    },
    perMessageBurnLimit(
      request: QueryGetPerMessageBurnLimitRequest,
    ): Promise<QueryGetPerMessageBurnLimitResponse> {
      return queryService.perMessageBurnLimit(request);
    },
    perMessageBurnLimits(
      request?: QueryAllPerMessageBurnLimitsRequest,
    ): Promise<QueryAllPerMessageBurnLimitsResponse> {
      return queryService.perMessageBurnLimits(request);
    },
    burningAndMintingPaused(
      request?: QueryGetBurningAndMintingPausedRequest,
    ): Promise<QueryGetBurningAndMintingPausedResponse> {
      return queryService.burningAndMintingPaused(request);
    },
    sendingAndReceivingMessagesPaused(
      request?: QueryGetSendingAndReceivingMessagesPausedRequest,
    ): Promise<QueryGetSendingAndReceivingMessagesPausedResponse> {
      return queryService.sendingAndReceivingMessagesPaused(request);
    },
    maxMessageBodySize(
      request?: QueryGetMaxMessageBodySizeRequest,
    ): Promise<QueryGetMaxMessageBodySizeResponse> {
      return queryService.maxMessageBodySize(request);
    },
    nextAvailableNonce(
      request?: QueryGetNextAvailableNonceRequest,
    ): Promise<QueryGetNextAvailableNonceResponse> {
      return queryService.nextAvailableNonce(request);
    },
    signatureThreshold(
      request?: QueryGetSignatureThresholdRequest,
    ): Promise<QueryGetSignatureThresholdResponse> {
      return queryService.signatureThreshold(request);
    },
    tokenPair(
      request: QueryGetTokenPairRequest,
    ): Promise<QueryGetTokenPairResponse> {
      return queryService.tokenPair(request);
    },
    tokenPairs(
      request?: QueryAllTokenPairsRequest,
    ): Promise<QueryAllTokenPairsResponse> {
      return queryService.tokenPairs(request);
    },
    usedNonce(
      request: QueryGetUsedNonceRequest,
    ): Promise<QueryGetUsedNonceResponse> {
      return queryService.usedNonce(request);
    },
    usedNonces(
      request?: QueryAllUsedNoncesRequest,
    ): Promise<QueryAllUsedNoncesResponse> {
      return queryService.usedNonces(request);
    },
    remoteTokenMessenger(
      request: QueryRemoteTokenMessengerRequest,
    ): Promise<QueryRemoteTokenMessengerResponse> {
      return queryService.remoteTokenMessenger(request);
    },
    remoteTokenMessengers(
      request?: QueryRemoteTokenMessengersRequest,
    ): Promise<QueryRemoteTokenMessengersResponse> {
      return queryService.remoteTokenMessengers(request);
    },
    burnMessageVersion(
      request?: QueryBurnMessageVersionRequest,
    ): Promise<QueryBurnMessageVersionResponse> {
      return queryService.burnMessageVersion(request);
    },
    localMessageVersion(
      request?: QueryLocalMessageVersionRequest,
    ): Promise<QueryLocalMessageVersionResponse> {
      return queryService.localMessageVersion(request);
    },
    localDomain(
      request?: QueryLocalDomainRequest,
    ): Promise<QueryLocalDomainResponse> {
      return queryService.localDomain(request);
    },
  };
};
