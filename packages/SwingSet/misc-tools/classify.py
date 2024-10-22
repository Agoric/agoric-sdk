# library of classification functions, to be imported

import sys, json
from collections import defaultdict

vbank_addresses = defaultdict(int)

# the overall cycle looks like:
# * cosmic-swingset-begin-block
# * cosmic-swingset-end-block-start
# * one or more of:
#   * [cosmic-swingset-bridge-inbound]
#   * cosmic-swingset-run-start
#   * .. crank-start/finish, deliver/result, syscall/result
#   * cosmic-swingset-run-finish
# * cosmic-swingset-end-block-finish
# * cosmic-swingset-commit-block-start
# * cosmic-swingset-commit-block-finish
# * cosmic-swingset-after-commit-stats
#
# we classify each run by looking at any bridge-inbound or at the first
# delivery, with additional details from later deliveries, and save all the
# slog lines from cosmic-swingset-bridge-inbound to cosmic-swingset-run-finish
# in a single file, named bNNN-rNN-TYPE.slog

# The first block after a chain-halting upgrade will doCoreProposals(), which
# logs cosmic-swingset-upgrade-start { coreProposals }, and -finish, then
# begin-block/end-block-start, then run-start {runNum:0}. run0 will see
# deliveries (and routing cranks) for the bundleInstalled messages. Then we get
# one run per proposal (run1 through runN), each with a bridge-inbound
# {source:"core"}. No other runs are done in that upgrade block.

def classify(bridge_inbound, first_delivery):
    #print("-classify", bool(bridge_inbound))
    source = None
    if bridge_inbound:
        inbound_num = bridge_inbound["inboundNum"]
        source = bridge_inbound["source"]
        # source:"core", inboundNum is ${blockHeight}-x/upgrade-${n}
        # source:"bank", inboundNum is ${blockheight}-x/vbank-0 , VBANK_BALANCE_UPDATE
        # source:"wallet", inboundNum is ${blockheight}-${txid}-${msgnum}
        # source:"provision", inboundNum is ${blockheight}-${txid}-${msgnum}
    if not bridge_inbound:
        if (first_delivery["vatID"] == "v2" and
            "bundleInstalled" in first_delivery["kd"][2]["methargs"]["body"]):
            return "bundle-installed"
        if (first_delivery["vatID"] != "v5" or
            first_delivery["kd"][0] != "message" or
            first_delivery["kd"][1] != "ko296" or
            "wake" not in first_delivery["kd"][2]["methargs"]["body"]):
            print("no bridge_inbound but not a timer", file=sys.stderr)
            print(first_delivery, file=sys.stderr)
            # might be an upgrade run without any installed bundles
            raise RuntimeError()
        return "timer"
    methargs = json.loads(first_delivery["kd"][2]["methargs"]["body"][1:])
    method, args = methargs
    if source == "bank":
        if (args[0] != "bank" or
            args[1]["type"] != "VBANK_BALANCE_UPDATE"):
            print("bank but not VBANK_BALANCE_UPDATE", file=sys.stderr)
            print(first_delivery, file=sys.stderr)
            raise RuntimeError()
        addresses = [update["address"] for update in args[1]["updated"]]
        for addr in addresses:
            vbank_addresses[addr] += 1
        return "vbank-balance-update"
    if source == "provision":
        if (args[0] != "provision" or
            args[1]["type"] != "PLEASE_PROVISION"):
            print("provision but not PLEASE_PROVISION", file=sys.stderr)
            raise RuntimeError()
        address = args[1]["address"]
        return "provision"
    if source == "wallet":
        action = args[1]
        owner = action["owner"]
        sa_body = json.loads(action["spendAction"])["body"]
        if sa_body[0] == "#":
            spend_action = json.loads(sa_body[1:]) # smallcaps
        else:
            spend_action = json.loads(sa_body) # old-format
        method = spend_action["method"]

        # IDs are selected by clients, most are just a numeric timestamp

        if method == "executeOffer":
            offer_id = spend_action["offer"]["id"]
            invitation_spec = spend_action["offer"]["invitationSpec"]

            invitation_maker_name = invitation_spec.get("invitationMakerName")
            public_invitation_maker = invitation_spec.get("publicInvitationMaker")
            call_pipe = invitation_spec.get("callPipe")

            # TODO: all these names are scoped by the contract being targetted,
            # so I need to scan for a board ID and build a table. This approach
            # will stop working when two different contracts use the same
            # invitation-maker name.

            # gzcat run-1-slog.gz | jq -c 'select(.type=="deliver" and .replay!=true and .vatID=="v10" and .kd[1]=="ko62")' >1-bridge-deliveries
            # cat 1-bridge-deliveries |jq -c '.kd[2].methargs.body[1:]|fromjson|.[1][1] | select(.type=="WALLET_SPEND_ACTION") | .spendAction|fromjson|.body | if .[0:1]=="#" then .[1:] else . end | fromjson | .offer' >1-offers
            # cat 1-offers | jq -c 'select(.source=="contract") | .invitationSpec.publicInvitationMaker' | sort | uniq
            # cat 1-specs | jq -c 'select(.source=="continuing") | .invitationSpec.invitationMakerName' | sort | uniq
            # cat 1-specs | jq -c 'select(.source=="purse")' # gets .callPipe or only description/instance/source


            if invitation_maker_name: # source="continuing"
                if invitation_maker_name == "PushPrice":
                    return "push-price"
                elif invitation_maker_name == "AdjustBalances":
                    return "adjust-balances"
                elif invitation_maker_name == "CloseVault":
                    return "close-vault"
                elif invitation_maker_name == "makeVoteInvitation":
                    return "make-vote"
                elif invitation_maker_name == "VoteOnParamChange":
                    # id: econgov-NNN
                    return "vote-param-change"
                elif invitation_maker_name == "VoteOnApiCall":
                    # id: econgov-NNN
                    return "vote-api-call"
                # TODO: other invitationMakerName
            elif public_invitation_maker: # source="contract"
                if public_invitation_maker == "makeWantMintedInvitation":
                    # this is probably a PSM trade, getting IST
                    return "psm-buy"
                elif public_invitation_maker == "makeGiveMintedInvitation":
                    # this is probably a PSM trade, selling IST
                    return "psm-sell"
                
                elif public_invitation_maker == "makeMintCharacterInvitation":
                    return "kread-mint-character"
                elif public_invitation_maker == "makeSellCharacterInvitation":
                    return "kread-sell-character"
                elif public_invitation_maker == "makeBuyCharacterInvitation":
                    return "kread-buy-character"
                elif public_invitation_maker == "makeBuyItemInvitation":
                    return "kread-buy-item"
                elif public_invitation_maker == "makeItemSwapInvitation":
                    return "kread-swap-item"
                elif public_invitation_maker == "makeSellItemInvitation":
                    return "kread-sell-item"
                elif public_invitation_maker == "makeEquipInvitation":
                    return "kread-equip-item"
                elif public_invitation_maker == "makeUnequipInvitation":
                    return "kread-unequip-item"
                # TODO: other publicInvitationMaker
            elif call_pipe: # source="purse"
                if (call_pipe[0][0] == "getCollateralManager" and
                    call_pipe[1][0] == "makeVaultInvitation"):
                    return "create-vault"
                elif (call_pipe[0][0] == "makeBidInvitation"):
                    return "vault-bid"
                elif (call_pipe[0][0] == "makeAddCollateralInvitation"):
                    return "vault-add-collateral"
                # TODO: other callPipe
            else:
                if offer_id.startswith("econgov-"):
                    # not really sure
                    return "maybe-gov-vote"
                if offer_id.startswith("oracleAccept-"):
                    return "maybe-oracle-accept"
        elif method == "tryExitOffer":
            # has spend_action["offerId"]
            return "exit-offer"

        print("args", args, file=sys.stderr)
        print(spend_action, file=sys.stderr)
        raise RuntimeError()

    return source
