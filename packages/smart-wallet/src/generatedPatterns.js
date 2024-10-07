import { M } from '@endo/patterns';

export const InvitationSpec = M.or({
  "source": "'agoricContract'",
  "instancePath": "M.arrayOf(M.string())",
  "callPipe": "M.arrayOf(M.splitArray([M.string()], [M.arrayOf(M.any())]))"
}, {
  "source": "'contract'",
  "instance": "M.any()",
  "publicInvitationMaker": "M.string()",
  "invitationArgs": "M.arrayOf(M.any())"
}, {
  "source": "'purse'",
  "instance": "M.any()",
  "description": "M.string()"
}, {
  "source": "'continuing'",
  "previousOffer": "M.string()",
  "invitationMakerName": "M.string()",
  "invitationArgs": "M.arrayOf(M.any())"
});
