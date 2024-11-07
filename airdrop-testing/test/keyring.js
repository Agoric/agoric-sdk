import { merkleTreeAPI } from './airdrop-data/merkle-tree/index.js';

const accounts = [
  {
    name: 'account-a1xvhjkka4pec2jeppy6tkvc',
    type: 'local',
    address: 'agoric1zv8wfzrlwdjz7kzuwx2cvzjgcjl9gum0qpnv2m',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A4z4KjYxi7AnrXA7y2ZCbpRKvauMFYW/FxUvMHDtD5eV',
    },
  },
  {
    name: 'account-abcyzcyyfjjicjwjxxumjt1u',
    type: 'local',
    address: 'agoric1nep9zlxe6dam508ga9cdzlaxth22dfvevxqqjh',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ax4cgkH+fGg0EGThX/XdXArUPWYMYqokVjVRlXReiN/j',
    },
  },
  {
    name: 'account-abi11iqew1mpq8k0tscv3ufj',
    type: 'local',
    address: 'agoric1qxx3ff3u98ykqn79f82x2apehqkgvce0amxetz',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AsxT/KWx3LysqQk5qZ2nL54TauCR/6yu6z9RuyqpnHcX',
    },
  },
  {
    name: 'account-aeije3h91wy4lf16ffuuforf',
    type: 'local',
    address: 'agoric1tswnwcaz0jleemxktsgrcj3wuwxp0uj5zt3xh3',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AlIqbw2bL37N3DBzl3I6q8/6O/OAnIsUKdecfeqsivCc',
    },
  },
  {
    name: 'account-agwrqqaq50fyhj4vz6ql27tz',
    type: 'local',
    address: 'agoric1ef9j5504f4zpv483x2g6y40vhdwjhdsa85n4dg',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AwT3mbJIOMvT5ixy6j+Ehgk+ocSz0PNuH3s7iP8eORwK',
    },
  },
  {
    name: 'account-agz3z5bzgadb8vad9nnpt9o2',
    type: 'local',
    address: 'agoric1c4pycyds69cz00angy7tdlfyjmg8apguzc3g52',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A7bmnPbjjKQCJLNbVQ1wsQXSi0k0iAOb4543rng+VA05',
    },
  },
  {
    name: 'account-akmtm6bu5qst76jf5nqfw04w',
    type: 'local',
    address: 'agoric1t8q3uvqyrkne57m5nc0nspu3ypjz4rafyjegjt',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A4MYqzNhPnCVIPuhcDEoq732rVx+Ypq0j0wtFCO8m7m4',
    },
  },
  {
    name: 'account-an3wot94clyyogkli9hsm03p',
    type: 'local',
    address: 'agoric1nu63pfzvtyvlhl5rglfk6az8jns8ztddyazt7m',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A3VMhUvqFwPmW2V44Rzef76MP1NOb50kIj5xTpovV35Y',
    },
  },
  {
    name: 'account-anpo35hpx92t70jg5gaei9ca',
    type: 'local',
    address: 'agoric1gq7jmq2rt2u4au8r8hqcvqr98ny0e4ll63p58a',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A8EjToe0xQgcJ8gwjxj1sYbbTGE9Rjc8aGyrUDd357Bb',
    },
  },
  {
    name: 'account-aoxdqf5fj9ol3wot379o8inl',
    type: 'local',
    address: 'agoric1g33xm6p55qrreks8235w4j36uyreguutdxfl3y',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A0SC6NJMNsoPU6K33IkymP2kbJA9PeE2mzOmQtDGyN39',
    },
  },
  {
    name: 'account-aoxpy3bw5u1e4lyeawrforgk',
    type: 'local',
    address: 'agoric1hkkmyzazsmgr0x649qsjam6632nurtjh72qt8e',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AqgGJrB/z2hmqbBv24Tcl1SqT9j3IC2S5ivc40xz/dz4',
    },
  },
  {
    name: 'account-apl5c7shfbzqz7bvz7m759ba',
    type: 'local',
    address: 'agoric1gzr2f3rxcdkl0vs8vcj9pzd6qvct8g00flp4jw',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ahm5sb83hRsyJqnA6DuT/5GfXAcXZqEs8KtVFx+9yWB1',
    },
  },
  {
    name: 'account-auy1movnv1v77wubvcutm5zi',
    type: 'local',
    address: 'agoric1yk3nsz03c4x90zs93yet2jn03eejvf8qzcquc6',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AneKUqDFJqxOx95qdNi/Bw7bZSKplpiAgR+vg2sJAZhi',
    },
  },
  {
    name: 'account-awq4ul5ir8hbfsfi77ux7i3n',
    type: 'local',
    address: 'agoric1xx7f8tjajmte3m0e5jeh5qtg23skjw8txp8y5k',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AjR/cshPW3Xgsxr2GfNmNc8arS2ahvPygFtrUUszornw',
    },
  },
  {
    name: 'account-b45st2prulfsgtvo369r317a',
    type: 'local',
    address: 'agoric13042te6xhasqjw9knf2afvr623ym5d36k0p947',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AvCLdudPgg7KhvnmytwQckDy8SmRFbspYduSR4JeR98h',
    },
  },
  {
    name: 'account-b7f42vbugk0mbezuehxk4zcz',
    type: 'local',
    address: 'agoric1ag9xhh0r2krlp9yzja50mgcu63ylq0zjqsasxe',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A9Q5hRWQXl9VU1P3ePSM/9GogU99hIC5Y5mzVeI616y0',
    },
  },
  {
    name: 'account-b9rkp5hi8aczfj19nlind21e',
    type: 'local',
    address: 'agoric1y2z545mrhpk7lrzzfyf9g4250pq40lmvyzea64',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Az5uDPx9S6s2aKPMpRXb+9a7LrhGLc6/4MIOsMhLpSpg',
    },
  },
  {
    name: 'account-bdjcfpelrq3mbpqujychqxa7',
    type: 'local',
    address: 'agoric1vxvg32n2uc3w23303xmmt8q5494yrun9rh599k',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Auc8j1BXy+DAZvIJFEFZbCh7uSsyqxHcia9yh16rTxfy',
    },
  },
  {
    name: 'account-bjbytdhmizx6do3k51b2dfpo',
    type: 'local',
    address: 'agoric107ev87tphtpewlykfwgjf3tvztdjyd8fmy2ann',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AgjinDsdHplcJWK74KXn7BzTXfBODWRAgJb+FpgXfMmA',
    },
  },
  {
    name: 'account-c1dql6w9ihowvlfy3ue3sljk',
    type: 'local',
    address: 'agoric1g0cvwdempnd6wxyrlm76wpd9jxqr3etrmfl3ql',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A2dRb/t9++TfHaDZq8oVzYnCwSgZozCX6jNn03kPAIpw',
    },
  },
  {
    name: 'account-c7wdo1f7fn39oqm53f1uu896',
    type: 'local',
    address: 'agoric1c8r5pd3uns8jpn92ln4kvcepzgxq3hyegh0wd0',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Azrr69hEg3zVLSuv7EoLcib7Sa+AMPf2AT07qjpmFyyN',
    },
  },
  {
    name: 'account-c8a2egc7x7djmqyxjmbe31gd',
    type: 'local',
    address: 'agoric1vvqgk30s73778jvs25pr49lmecd75asy0284y4',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A5I7Bbmp6gI/dPjk3wpzXABFLjczzYm45HUTQQJvd0Lk',
    },
  },
  {
    name: 'account-ckugvak9tu2zm0mb7k12s4sd',
    type: 'local',
    address: 'agoric139kydhrw6gx53065axj00qgt2rlr0pdtvhgunt',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AxO9/sSt5Gbb9sKi4dbhS7NZVJLbNaF1YABGVAhwNah6',
    },
  },
  {
    name: 'account-cp93st89f1x79xeq6j36jbjk',
    type: 'local',
    address: 'agoric1haukg0v2c5d4g3gkgy5wmuf2c0sqek0eaep8tu',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A0jiyGcXl2b6D3FurCLgHaP7QkpcGrknwynxmaW1t7A0',
    },
  },
  {
    name: 'account-cvt1k1r8sunkkd7y9tqw4vep',
    type: 'local',
    address: 'agoric17nc88y6zklh0ljczsxfra8ysy23qm9z6wqvc2a',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AgWJVVIGyeo/U/XMyAJ/+/+/Q0rAZXNtiyJz+jR1aCBT',
    },
  },
  {
    name: 'account-cw8ll8wwq9ye8erfpc194v5h',
    type: 'local',
    address: 'agoric1jfv6wacv3pen3jqkh746y0j2lz65udqetuzqey',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AiN4TrV59rdjPtGwxAe6xcugHVDBfbPViyAbHqU42Fat',
    },
  },
  {
    name: 'account-d8jh7ydito7xmw5jnp617bei',
    type: 'local',
    address: 'agoric159vd0es66vwm2ltyxda8qzr6mwq7mgljmfh78s',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A0RaCttQOEXB3z/LRjsHMpq6IWt5uMZyOYbnZWrqfvTO',
    },
  },
  {
    name: 'account-da58uher88atun47qhik4sgb',
    type: 'local',
    address: 'agoric1ctgec2f82n6qjk9gecfsnuuk45dt8ygn7n8upv',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AsoLKXLc4MfQKpbTQXOy7zP0ZEIF93oeMU24D58sP4Sn',
    },
  },
  {
    name: 'account-dcxnn4kvsr90wfrb43cswuj3',
    type: 'local',
    address: 'agoric1m95ahlr42xsvmws5cd25guwatpceseplzcd9xs',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Aq6qKbnSNsHWQdUwdV0FW1TNgCcOfY8W7vsvU1Ng0O //',
    },
  },
  {
    name: 'account-domo0es64ltu5um0m9jccfnf',
    type: 'local',
    address: 'agoric13zgyz792mjdjxuczqslxhzvs5jat9jdrj4uart',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A6jecAebvgQ8c5hSD25xO/+Q/HMY8Z6CxcBQIsp6/5Ai',
    },
  },
  {
    name: 'account-dsoxzyon9esjaa7qero6ry7i',
    type: 'local',
    address: 'agoric1ddrcu8yrntlc9t6kzxuan0zdzzfuzrjrry505c',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'ApGAEaqT7aIo1UkCZOilh6iUxF7kjy039vgOzlTpdVQB',
    },
  },
  {
    name: 'account-dtq1iom6g5gun9g2m2bmyn0b',
    type: 'local',
    address: 'agoric1w487wsz0d96p0f06dsylf7jrwhy9d6h2k8upcv',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AviYIv+43qJeLAdfyi12pUYlw84hBtvUWvM31LOpojXJ',
    },
  },
  {
    name: 'account-duiupinx4r5nvyt2u4hbo5s2',
    type: 'local',
    address: 'agoric1fju80t93cy38t7zsstegwxaknewmw7zyhv6l9g',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A1vueitfiHEYqgXaDlBPF6kX3oGG7sq4d+Hx1fS7ZxRJ',
    },
  },
  {
    name: 'account-e3qd94edi6hlwq9yf4f736r1',
    type: 'local',
    address: 'agoric1w5krwy353k9wtme0x7ulep80vkfat3067nnchc',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AoGnDTd4WVufBRgSORUmDp3/lmhdASPUNKelIR10Gmlf',
    },
  },
  {
    name: 'account-e6n24t8e8mj3ear7u4ed5jb8',
    type: 'local',
    address: 'agoric1vz9ytzu78dwpegyw07klr8m667fyurqjevx69n',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Atasedotnm7s+TGEMhOhd+GKHGoal+tn/avmzmapQJJ1',
    },
  },
  {
    name: 'account-e89g2qriudm7p8cli4fl52l8',
    type: 'local',
    address: 'agoric18m95j286u86gvdpmpps6t0prw75jrh4xx5txev',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'ApivgCSRNfjSB506vGUXWZuHzKDaTfX46VprcR6+Oq1o',
    },
  },
  {
    name: 'account-e8dq82jrqu5bxfqlquqbdht1',
    type: 'local',
    address: 'agoric1vcpxngm7qla7fyhern6evnskwmmh7hagdupkud',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A5DqXPqs1NogEIdFRaCyCur6W0SFQoTJoZWXcivF4l+y',
    },
  },
  {
    name: 'account-eb4n5efjht1vp5cmz06vruqg',
    type: 'local',
    address: 'agoric17udqyqdecare4ptrn5neg02eqx2nlx8fe6mpgl',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AzKsC6QwQoTwQytDFmWUBSHf/KdcWoZKj2MzkVP03R6I',
    },
  },
  {
    name: 'account-er2ogonmdrqvqx1axdd32h2f',
    type: 'local',
    address: 'agoric19tsnghynde6g3vs7qzxvl7ftcztpkc4t7l2nye',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A/AET2EdHa88ACbMRNgATSAMDSv6z72c4yE5QG1dg6fX',
    },
  },
  {
    name: 'account-esihlwpmur25ze163wyme5d1',
    type: 'local',
    address: 'agoric1nu38v4a2ylz3plpyxm4zx4q5zfa54ktdchrk6h',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AwgqNP1Uu9KrraRrLLktdEC0MwIX5Clh1LXOk+sqMB0c',
    },
  },
  {
    name: 'account-esr01e2eqhpambbarb5g8q5f',
    type: 'local',
    address: 'agoric1teqmuyuuud4756u5d79nvt236q75xu52w55r2f',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AgxMVw8QG4mEGSLJhsWi87Peyf91I8gb0+V6HUcn7OdR',
    },
  },
  {
    name: 'account-ex9gmwuk0opirsjcdi3audqr',
    type: 'local',
    address: 'agoric1pu9wgsdl5fnptf3n3cq3s56vsft3k9yspckqem',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Al8DPHOQEvLrUn7YzbKf82VvNp2La5ZV6BvujiHuqPsa',
    },
  },
  {
    name: 'account-f7snpk0pt5x54gf1ef43sdd7',
    type: 'local',
    address: 'agoric1l7tucz5frc7ghzqfw53jjjcfvxkvc80jd76ccs',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ayxda53QIeWlp5FVMkQKDcET02r1Aeb8Fx4t/ywU5I79',
    },
  },
  {
    name: 'account-fbln80bc0k4pjok87umokvja',
    type: 'local',
    address: 'agoric13tal5ghumguws9enw7y0cggyvvxfcfmwfccvk5',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Aiyu59KbDtwhK77L1yXM9og2kFZAmWp+mjGxc+lP8wsq',
    },
  },
  {
    name: 'account-fgzwrj26q8e1wrmecocany09',
    type: 'local',
    address: 'agoric1z5r9ze7h26kap0tgjk0utj0p3jg7wykpnh7rk8',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A99/r/vxDSCjoKdUG/MAcRTT/qcGjPeL+jDPhKf0yLOB',
    },
  },
  {
    name: 'account-fh8dmczgplvojc9xqpm6buz5',
    type: 'local',
    address: 'agoric1nssxgw54mlvysxrhxjknqq2ps48s9lkkqhhqu0',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AwkpYYLvA2kabVBvir/a1dPVrpE+IAI4pBQXZPdSc+Ac',
    },
  },
  {
    name: 'account-fk5ipvf97vjw9dl639ntbn55',
    type: 'local',
    address: 'agoric1svanxqxvud5tt60nw94sacfsgpljuqywe2xze7',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'ArQ9DLWQmRMnrq0Q55xqInqmDN3CAwHQnlhQxs9Ku0Fm',
    },
  },
  {
    name: 'account-frxe0hznnoy7weg8xk1sx3by',
    type: 'local',
    address: 'agoric14v48u8fu6mrmyqmrt3varhvvlc9lv2t9n5tv7v',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ag0ave6P42F03bIwQvtmeFN9KaOpOvlO2jSZIlwHTnB7',
    },
  },
  {
    name: 'account-g3iulttv1qyu4wtpx5ofhnfy',
    type: 'local',
    address: 'agoric1atrpp0kuwgq4wrduenks6wf6ll2y9np6v9eg04',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AwSzBntNOvdS/Wl0o9qGEsKIYTYv3XNbH2YJFY5dk6ex',
    },
  },
  {
    name: 'account-g6sqcrwi8q0haks78hyso4om',
    type: 'local',
    address: 'agoric13xyw4fg3sjfamqq9fk8n29d09d075rpux9v5em',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A0sVKeWCuwchm8wqvYdMprEoosY3RNN/0FVypITjUEPl',
    },
  },
  {
    name: 'account-gbiygu8ua28maughv9ru99xe',
    type: 'local',
    address: 'agoric1up4qa8t5hv7dush2ffvyszlczlnv0f50mj0ncw',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'ApVFfMyq+mZpKsnYcBziecVkVZPU+v7X+D/GZcsRbqZI',
    },
  },
  {
    name: 'account-gfgq64s2udwsfdcmezkmlzww',
    type: 'local',
    address: 'agoric1qxhedqcv4j36xvp3qg0rzesn7hj8ka99uxdm5q',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A9OHPbXEPkCvA766rpvekuwRUy19M+HJ3dJVwnSQUYnt',
    },
  },
  {
    name: 'account-gfnljhyh7165wbudljti6xt7',
    type: 'local',
    address: 'agoric1vy7nuxw6pc3xt0uxu8wa2g7hzqpcspw92av0e5',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AiLPxfAmsM7wB/6ef0u8QyPX3V/nz1k4SVMRI3cez7gB',
    },
  },
  {
    name: 'account-gn0x4i0t06m9quz2ieh6htzp',
    type: 'local',
    address: 'agoric1mzlp2sj45rfjvm8f9laye89jqj3uj5q5r4tz8e',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A/nkrQWdZ7vYhZlMDyeClIsOT9lrMtps+1Uytx4IBf0Y',
    },
  },
  {
    name: 'account-gnsv1cclodyqqht4awqov9bw',
    type: 'local',
    address: 'agoric13l6d4zjd8axdaaekgwzapwvcjk0zrcrl6jz63t',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AkP8MWQbOjsBsLuxW9kzr/cxdVam7bSTLFDQ745Fu+zg',
    },
  },
  {
    name: 'account-go6os3fmtxxkqufpp5vmox0z',
    type: 'local',
    address: 'agoric1k6p6umh6vrs8sc3a43eedjeu5rnl0tsnmplfng',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Am/JZVG2lOBkHcbSV6yREOcgbeUwaKwHEm2Zw0yln+IM',
    },
  },
  {
    name: 'account-gsnnz9j7r91msyrloze9krf2',
    type: 'local',
    address: 'agoric187vschmyl26zt6kq4vsasxfdy2vdm4dv5nfpxy',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AkBc8CPPA/sIR1WutZFqjgIl5SSc5Zgm9rYthFxs/f9u',
    },
  },
  {
    name: 'account-h110nan2s2k6li6m0ur1bkdb',
    type: 'local',
    address: 'agoric1zh3c9suekyjw5tx2k22rf3c23t6p9rptne5jkk',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AkY3LzPT5a4uijUeki+pzvGpdEJp4bupX+sN+ZKZOYgF',
    },
  },
  {
    name: 'account-hch0h3wyrl830sd8xfo22j10',
    type: 'local',
    address: 'agoric1307he3cpvshzg2skhlhmszs0w6k8gfeuc8ac8m',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AoEt1HXUF0Mk9rMsaa+ROhpukRpQUs+i/1k2goNimBXU',
    },
  },
  {
    name: 'account-hjraalfouzbggdoy05iq26qp',
    type: 'local',
    address: 'agoric1yaae05gl4eqfvm4pu04qh2c3vpwdks5vta2h4u',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A8KH3dQSWCse047JjwGJYRR32e5/iAEmSOeJJj0nVmnL',
    },
  },
  {
    name: 'account-hp1j75l6lw7pk5c9ww78t7dx',
    type: 'local',
    address: 'agoric1zzerfx0m2r6etfx0xnvjdrelhqkc4pj3gf820u',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ayma+BQmN17Nd1bWckXiGVvNQdfKmLOWIpDjEc2e9ufb',
    },
  },
  {
    name: 'account-hrghnhwht3736twiawq92d5o',
    type: 'local',
    address: 'agoric1yd56ly97ekdupl96k6s7ye9580g58jqwycjdtp',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A9XuYmkf45w3lfNnfWrUEAmDR49idera2rnvoRDqV2Io',
    },
  },
  {
    name: 'account-htl4ktn820kssmvgqlhrqkp4',
    type: 'local',
    address: 'agoric1xjulxrz0l4gswylc4tzvrrjurve79sds6d3dph',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A1V4Eyqks4/JFwgyfaXJZWEGm8hS2Ufjgp+mtQok9gXP',
    },
  },
  {
    name: 'account-i1ycgwcpu69w8i9m1xmucxc7',
    type: 'local',
    address: 'agoric19jm089axqdddr6uwz4524lcem3us8v870hqr6a',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A3fFpUgB1/M/Y7h+rU72ucFi2iHNGD7FsJl/KoR5TPCo',
    },
  },
  {
    name: 'account-i2avqwo56btsig37pdu9i5n5',
    type: 'local',
    address: 'agoric1qlfhyr2jtu7nae0c9a4que27vk3upn443yy4ye',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AjBRHejb46qc1wbR7mOTud7Jj4cvJXzxnzCQws4MubJx',
    },
  },
  {
    name: 'account-i6m70erruv8uu9ba525gdfjo',
    type: 'local',
    address: 'agoric1g0nr9akk6vfnf2mg79fcy63unx2zjrsy3hpee0',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A5BNihJF/ZR5Mt4PHYsnu6zRAyhaSM6W8oql8VcX5O/g',
    },
  },
  {
    name: 'account-i6nlcnt0o0v92t5np8tdx4sz',
    type: 'local',
    address: 'agoric159rskft5cjhn78a2vxq4q70r6qy0jah0dzfneh',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Aqu4U3cZLGlj2AVNqIk3BwmelBHaNVkoyGpJVlECi/tz',
    },
  },
  {
    name: 'account-i7gv3bezm2706i308vsx4q8r',
    type: 'local',
    address: 'agoric1s5dandfmdjewz2w0zusnvz3ejj7xnhfs82n2ks',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A/bP8VR7sLkNtbnH8sGAr4k24gdR7Yua3q4gIUwF2VEZ',
    },
  },
  {
    name: 'account-ilxlkanc9csbj826ejcbrx4q',
    type: 'local',
    address: 'agoric1qz2u44zqdyda3d52tvegvz6ee0tptgjt7fdr4y',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A+VmpwJTFr++t8E5tEk8Nu34PUgUiYzPzmXmj1f0Be8L',
    },
  },
  {
    name: 'account-ip01fdi0407k3ep7q01deh1g',
    type: 'local',
    address: 'agoric1ppngcak7e58w222y4jul8p9w3eezc7hsjvu43f',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AnlMfIKQiLJbVlaBZ71qR7PvRAj8r8bvXeJEQpQkvsWf',
    },
  },
  {
    name: 'account-iqfg7np77qguv9nwchrerdyu',
    type: 'local',
    address: 'agoric1qhdqkwkls3sepg9876sekavesugpwa4jtrldck',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AhHsGpyfvB+lSGGxxXW0F5ceIzkM4xdTlTgxXQftA0PM',
    },
  },
  {
    name: 'account-j4n6ebl7mj4xe06z2wx1e65i',
    type: 'local',
    address: 'agoric17dncaf3lcxyfgt8s7yv2fadqw9qx0tqgj8rc2q',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'At0HfrSnAk6azdT3Tv9NZKMP1mOeqPCtLbnnit7lu4Ee',
    },
  },
  {
    name: 'account-j561nka2rkvk5tni76yg9i52',
    type: 'local',
    address: 'agoric1chz89zzjsrgu0f2s0ftawyfs9ejzfmwm99at8p',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A3FjFkZhD+ys6fqeSttfaYgHRbqa3cHWKAqfbvGXT2/e',
    },
  },
  {
    name: 'account-jd6co1t527j9xukb5gqnndm9',
    type: 'local',
    address: 'agoric1j9zs6cdnk3zuwmzlq9wejyjc9dq3ltakx8jgqn',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A0ouyL5OSYyZa2tSXRB71rJlvoErHZ5i6DhTKSntTZyP',
    },
  },
  {
    name: 'account-jgtml0qbgtx2cd0om6m45utl',
    type: 'local',
    address: 'agoric17h0l2vwm2s65ucmekhaks68fas6x3ayey0shfn',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AmcygJDTt490VGQlf0INaZeQSYd70Rre8eL4NpeWKUJT',
    },
  },
  {
    name: 'account-jnlgv88zgl0qwn2ga0qpfpz5',
    type: 'local',
    address: 'agoric1sr0tnq7uxd9zp6e086ja9mja437k9qtupxlc20',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AkhICsA6OD/rDbVwx7jXKU/ehUJLdKqjw71FcbUVsciB',
    },
  },
  {
    name: 'account-jphmdwoovhw5li1it7rtuskc',
    type: 'local',
    address: 'agoric1q2d2z26rvk39hwlawkl2luls0aac7e4znfzwxy',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A7nn671wEiUpPn4eG0xCtapIy1iTnUupe45mOUjMMMBV',
    },
  },
  {
    name: 'account-jpw0kd5iim4o1uzfwdmpvy6h',
    type: 'local',
    address: 'agoric1veprc4z3z7v3whuqa42uvwxnp4ned2v0y0zjdp',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AgB8NePZmmEgYVhqKST+Mv1FqcxKFP6qyN4bJSZyOKc0',
    },
  },
  {
    name: 'account-jtke16n0zqopogb7dtp9mrg8',
    type: 'local',
    address: 'agoric1afs5d4lrktnnxyymx25trd6lvxsmwkeu0ja2q0',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AuG9lZ/0eS/HkRlcNSsH1dqnytNz5VroZF/+5j1e+X+/',
    },
  },
  {
    name: 'account-jugqgxr8mxk4j0gkl1tjgcp8',
    type: 'local',
    address: 'agoric1x3dm5z7g7qku39j2gcswc7hun52cqc9wj6wq32',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A24Tv/F8dGjIN0gp3ChOG2uPK0VktGvvt7xKFIICUtd1',
    },
  },
  {
    name: 'account-juwy1o27u061nr6erjihozqv',
    type: 'local',
    address: 'agoric1sfh8rqx6u0etdjar6zlma6479se7xmmhx9znxl',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AngP47Q9CL0YcFItk/LAqsDD7/tX5cJUv673C0+aoBy+',
    },
  },
  {
    name: 'account-jvdy0yq7f0qex8hdbbr0fal0',
    type: 'local',
    address: 'agoric1gfhf32cqyx5y7xaylk6t2d5ncrrzy59w9wvjj0',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A/k0phJMZTdYdwNv7qreNltOZ1FGXlqUSAQfepdeaKs9',
    },
  },
  {
    name: 'account-jwwufh8oavds31yay4car47k',
    type: 'local',
    address: 'agoric1pgfdmeszn2c962etk7zj7ga4zz8xrdkmwrcfz2',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AiNaz+QfMUBcDkJ2kR2pBZfE0ouB82thhnc8aZO3pCFo',
    },
  },
  {
    name: 'account-jyyvm6w0op4t82ms0f9tm2sn',
    type: 'local',
    address: 'agoric1c9sn7j0anqaxlu7rfhpmmjxyrs7dg64m0ucepm',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'ApEUUTeulqQvhOVae23Lfs962sKOd+3eb5tA+jTBOf8F',
    },
  },
  {
    name: 'account-k0l8m610gpz7ll65xolk5f9a',
    type: 'local',
    address: 'agoric1482fymatcs39dt3jx5zdaf9wuv9808dlxxw9ja',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A62ljYVRhyzTSag8Ewq1m3sYKbs1vrfbrZjJqAr5g/Rw',
    },
  },
  {
    name: 'account-k20c4n03fjdjdr72rxmf8h61',
    type: 'local',
    address: 'agoric15ermkst2s6pya9sdcc8z06vdpuchmn8re3q5l9',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A0xFPIGT2hDG/rfUSbYpoUS2VnnFKcRp3qVPJvbQfA0F',
    },
  },
  {
    name: 'account-kbjrdgf0xzr03jsvv7ws4mjy',
    type: 'local',
    address: 'agoric1vjshehv4y0tkzrn7gehtqwtpwg40738yg7fxh9',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Aoa1U3EE3QRl6VIfuJhRSL9Xx5j01L51+qyw3k+Vc1qJ',
    },
  },
  {
    name: 'account-ke4rpct47ylirh92o66njowc',
    type: 'local',
    address: 'agoric1qtjpy4feaqjdxzs92yhrvttuqp2p87hqfadxxj',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A7WMoflNDARetCcO66VUZZ8RcUpV8TmVlFhgEWDK4NaN',
    },
  },
  {
    name: 'account-kg5b3c4y2ecrfppbsn7xkgj5',
    type: 'local',
    address: 'agoric1vj2hedcnnalghscc5e5mecc4quyuvskvzs7t89',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A7AplvSyH8ykxASllptfxGdIevpZYoWz1GmZxaiTdsSq',
    },
  },
  {
    name: 'account-kl0m2324cn1xpubbigxfkm8o',
    type: 'local',
    address: 'agoric1jw7nkx08uxtesdjz5lv3e7q05cm4nnlnwm2yvr',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AqgqtfCd7/o/bBhwTTjyc65UZxrR87zcZVaAy2y7MiGT',
    },
  },
  {
    name: 'account-kluihsqrooudb7sgbg5fwrdu',
    type: 'local',
    address: 'agoric1gf5f5pj5tg7eyjrde9nmgsjm2gnhlku8kheu8j',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AoDWqaXT6/vR8D8fGZWaL1JPMCqiJU6nY/ZsmmN+loLz',
    },
  },
  {
    name: 'account-kngq4gv523w5vlxx8ph09gjw',
    type: 'local',
    address: 'agoric1vp4ntcfh3z0dq3atyywcaxexvkdez2zr2zzax5',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Al+yx4qTa34Q29XwEcnRI2TPFj6Hv1WMzRN3lFvS8QQ0',
    },
  },
  {
    name: 'account-kuyud8z3m10bqw8nc9wlog66',
    type: 'local',
    address: 'agoric12r0m8u3jt9x84s0rdk77n5gy445lypghszyzam',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AvJx9Sj8ODz50h+kmZc82Af8TXB2F8FqQcsir8/CPFZC',
    },
  },
  {
    name: 'account-lfifrbyva7gjr4ra2ndfip6h',
    type: 'local',
    address: 'agoric1qghf0qe9670wrsmzzk9358m9lu7dd0f5n9reza',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ard8PdnPYCw5GnzNLPne8o2G+O4epRtJbmciZxstRYU3',
    },
  },
  {
    name: 'account-lh49jd3uey957ogxlf4ypvqx',
    type: 'local',
    address: 'agoric1qmsx39zvu3jjcfhwetgray9pj8x08cpnuxfd47',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AxzrvYWDHsA6tQ9JWE/mwYgw+UgCRrOPy+++ojbtpJ4w',
    },
  },
  {
    name: 'account-lm0ikophbv7mcmwyc5mw0uh6',
    type: 'local',
    address: 'agoric1rwqj7atxw4e4grtuysvm522gq8fprexgyvac2r',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AouAicIIhuIYT5H23vDdEAxyPWL5WfpNhspIURjpCzaa',
    },
  },
  {
    name: 'account-lmjgnxbz7ht77cgvj3jocv3a',
    type: 'local',
    address: 'agoric1hmzuph89ttj4vzvw8unnx2pjhp8zngkqnv2qt8',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ao/Hf4XyxN1Uy3WAxdJXwSLyAI7qX9+Tz64NVxcKyPpX',
    },
  },
  {
    name: 'account-lnjsdjd15fi8rak8ewp5cbff',
    type: 'local',
    address: 'agoric1ccxn46yak8kcqhpgusky5f7httl6d28hht3upu',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'ArDSbkp2raC1OsSiIhWhuytE6aWQzVe5l0AH4bnwBkZC',
    },
  },
  {
    name: 'account-ls5bf92e2js28zs7gjpy1imr',
    type: 'local',
    address: 'agoric1eraahfqlqcs3sr5zp52v3edk79wa4vw2df77ry',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A3VtBpKLvVT2088U8QULpcxPjs+lC1q3jH/DUJu99jlT',
    },
  },
  {
    name: 'account-ly235o8yzjxf2xnohni609tx',
    type: 'local',
    address: 'agoric1vph6t3czn0lyyasuq0pdmvfukyf8u8z0g9sz9j',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Aliltv59zzaTT0qLk6w4dxwI2jSoYoY2vQVcZfozarYI',
    },
  },
  {
    name: 'account-lyw1bxaujy203206yrvmf972',
    type: 'local',
    address: 'agoric1fv0gvpqneawg4lu3ylw2n4atyaqhtxevrsp89u',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A0ncwxTyrmjWI0/sCGk2pFN2KjrwJ2ta2xX+BJnQCHfW',
    },
  },
  {
    name: 'account-m8qmrtuzs6ln1quuwelma6qt',
    type: 'local',
    address: 'agoric1jdrxk0tk72p699j4az64ya329safmgnsve24tp',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AvUFQFNoLX/K04ByPuu5smvcOYq5SC3IPxP4QXCMygEi',
    },
  },
  {
    name: 'account-makzt6wh8pxlvo6ug574f5e8',
    type: 'local',
    address: 'agoric1gcdc7fn3j3nts4p6r5cfplrn5y5ec8yecv36s0',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AtMnKYm8Nx5pL8to6o2HpiHaBsskRaBCTXNPN29re4mE',
    },
  },
  {
    name: 'account-mf1e3d6l6s8rx8xf1mtvr6ns',
    type: 'local',
    address: 'agoric1tyrddy27kjttkvclr0h724jx7z20esgrv8d20w',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ag2JEIDCoO/JBTTrpqZu6PAlCF4ldS6QMEiufyum6U5e',
    },
  },
  {
    name: 'account-mjpajykvw6tdo2ggxdlyf9uy',
    type: 'local',
    address: 'agoric10czdp5m2xus0wtdfmq5nhcauyxnzawj63wyv6t',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AqR0+vqBu+7hX04Tcfq2M9VeZgY+HlLtOH7NPDOHmmsD',
    },
  },
  {
    name: 'account-mpri67xyhnpxmf43jf9oq02o',
    type: 'local',
    address: 'agoric1hyykrldex2x8cs8em4vqddqqazxnlx7fxc2udm',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AhnUJOhVy/ovfi9ZhLhk/wubKco9uaDkTm+YQ56ZZADK',
    },
  },
  {
    name: 'account-mtx9q08ad0fds56c3xwzj1t0',
    type: 'local',
    address: 'agoric19y6g6v77neeat33q3ztgqjjmgk6hjn2459wjpa',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AlPrNRm7gD22hx/4ckVDOr5iH/xMnjfDWTv5Mu6nRQYO',
    },
  },
  {
    name: 'account-n5tb58hq0jlcb3cdzn0wdt8l',
    type: 'local',
    address: 'agoric1autxhswdhx8myvkay40ww3t6aht8qctskn7xg2',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A8Nb37a1Ybw5BXXWbz2R5Jxc89n/4VLriwZub00EfKCH',
    },
  },
  {
    name: 'account-n6relaok385jzub661xv2rah',
    type: 'local',
    address: 'agoric1r4vffmux5va2xd0vkltr9u55ava2ag4nwmk69y',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AsaCXfM8PzzYQ8mRApDZ1h1t6bipl6zYI6ca4Q4NrAZf',
    },
  },
  {
    name: 'account-ncw8bebpshm1cvdiaxxhoyce',
    type: 'local',
    address: 'agoric1ssl556c7lnxyzw083426gqseh56cpzx8ayyxg6',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AnPd8lsbZW0BhTYhHwYNjX4P+S7m8f2b1gYP+dqKa2fa',
    },
  },
  {
    name: 'account-nj0tyekkeujnj3kit8vbvh3y',
    type: 'local',
    address: 'agoric1y0yahaafpcx6parkuapwp5a6k8cx53wx6spy3c',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A2l/iAFFKQXMl+qbfkIWyAjkLvZFJaFAdJSpwjQ3IIaB',
    },
  },
  {
    name: 'account-npz1cgoh4zjfwoxo89nm7dtx',
    type: 'local',
    address: 'agoric13544vkhu7el2xc4989ndvx560uuw69ls2mpaft',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A9QMzAUmNDvQVWOD6Z+Ejcq4JBPfLcXuVJupqPrvILrL',
    },
  },
  {
    name: 'account-ntptbqbm2e0b6pkzgn054zfs',
    type: 'local',
    address: 'agoric1ru0w7va438vmnj6k05zysvk5dmwk53x3z7p87z',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A+nNTSacVduU7QAe8x7KFHXcbobsBXiSlzWnS96oF/kt',
    },
  },
  {
    name: 'account-nz6ofm25f46f5m24fh3bbfyl',
    type: 'local',
    address: 'agoric1kl5y53cv2ymdpqr5f5mqpa25535tfvgtct2xm2',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A0hTYP9Q9PgvVDsPvzpuI+ZeIh83FLMgc2Arwjhce8px',
    },
  },
  {
    name: 'account-o413xyh8zuqdmstvipcin1c3',
    type: 'local',
    address: 'agoric15frcawpyytrdtc4uwxw9qysexf7et3my05y270',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A2r5AowLkFTRbr6+9wyxhx5eGGTxAopLmTKuKKOyDS1s',
    },
  },
  {
    name: 'account-oa1mx16xlfbm2xohdfjvat9s',
    type: 'local',
    address: 'agoric1nawxsra3p0h4au2p58ula9hkrth5thzr0wna6v',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AvfIU0YAZBs9x8TRTnIUZjNGIkKvAUYEyl6PTVUQvfQT',
    },
  },
  {
    name: 'account-oaiux8c8e6yp9d59r7gxg3p1',
    type: 'local',
    address: 'agoric1k6x4urha94znapu38ecyw9vl5qme08kk0tf09a',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AuKl3mo0M7xMIm9yqNP0VLCPRegUAeQttE1TJWUK7wN3',
    },
  },
  {
    name: 'account-oicjletrvvbd6w27x84t9jut',
    type: 'local',
    address: 'agoric18nwa8j66w4ullfj7flz4nuqswcetw7q9gfc89m',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AqCbM5QTrp3fNBWzMpGJ7DGjaONL/NmaEinoKWygDhoq',
    },
  },
  {
    name: 'account-oxdq0ar2szwctritf79xi2k7',
    type: 'local',
    address: 'agoric1qfj4lh8n4wkrckdkvf2mt86e2a58nlwknmwfmz',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A4a5YcqzY9A6wTkHYBqhwL442mWWaEooEplTBVpAnlut',
    },
  },
  {
    name: 'account-p3ynty1wj9jql8b8in3pyl9z',
    type: 'local',
    address: 'agoric19xktr8vdma6jeh0tx6zgtrfkr2ejgftnlmpk45',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A5kL8JHg5wpD/mMFbp40IugU6O2XCCn1863NhrOxezNk',
    },
  },
  {
    name: 'account-p6rkhvwrtnhwfj5m90fhkqg1',
    type: 'local',
    address: 'agoric1mznxh0crtf2tv8vpx5m62lz4wykakndsc0yutv',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A0Rz/eJh2EfJ6m0MHHLB/t9tvCQPF+15c4WLuzHXmumZ',
    },
  },
  {
    name: 'account-pd7bp6b70167xunhhf1m7z2l',
    type: 'local',
    address: 'agoric12az85p024n2ql7s97ystaj56sy2yzz3jpwzk54',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Al/2k2pqsVt/LU8nAkT+p+0BkAmjySqbSRTkJgxyjE5p',
    },
  },
  {
    name: 'account-peaf0rbwsyubz0e9rdzxiduv',
    type: 'local',
    address: 'agoric1t9a00x2kj5t5cs6s3wtfcgnd9lkzsl8qx4l8ah',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AoambYC/qbCJeZiF5HsCLEXt+1USkEvoRn+thylTaIrY',
    },
  },
  {
    name: 'account-pgkuc505ckl3g7zr816ccq30',
    type: 'local',
    address: 'agoric1f6ansuqr67c5wepjwzs9klsd700wrlq9mv3k6u',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Az2mZcZTkfEMngpmA8mDafj1kKJvN1+Rz56miRngZSMI',
    },
  },
  {
    name: 'account-phc1ntzcebe5mhg2u2aaazxk',
    type: 'local',
    address: 'agoric1ctz2h79jsxslnrpf2fu4jlswhv6jlsyps9r989',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A1SWioqOMAPkwDF3+Ksl0uVDuhAcknKOvxetkxaegghu',
    },
  },
  {
    name: 'account-phjrxntyeyydyawla3jy25pl',
    type: 'local',
    address: 'agoric1y2glymv67stftupwwxhczw4u5yd49n9mg4jm9j',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Aza4OSzzu8uubKJzPZ6uAMgU8ebnKv8z2g/rsf7Ln7ff',
    },
  },
  {
    name: 'account-pm92hyypsz563maox84tbxxq',
    type: 'local',
    address: 'agoric15e8hz3dc7uz9jsrhnlfzahzf763h6ma46n6ef7',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Aq4Q/BNBO8lFSozAhoVURdrCYamkGkbYaFc5VmIAu48O',
    },
  },
  {
    name: 'account-pz92y7faf5ouqmv9765v0m9x',
    type: 'local',
    address: 'agoric19u0rr0zg8x0ugt9yak4fjrjsu5m40lp2jn0sj7',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A11osgf6CC2OmbC5K6+peTRZcXZ3uNdazva9vFaOgmvh',
    },
  },
  {
    name: 'account-q8ahxnf74yhvfoajjukrjbha',
    type: 'local',
    address: 'agoric108aq05u9xj8p99v3c2sazls8sd0t2wk3hj37ez',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A1MzY4zZ+fZBpQ7VfW6gjaCg/V30ZEejhtkpFPmbwGgJ',
    },
  },
  {
    name: 'account-qb4o5zu3zfgpa5q7733alluu',
    type: 'local',
    address: 'agoric1qwvfkuk9ltd6d4jfrhsqt35tf2mjn0whdrwzhx',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Axhgz7BNWEDyHnsulN7H4Al+NtxDnJw7NEDL1r0H/AuM',
    },
  },
  {
    name: 'account-qcilu9emqhnszugpeepyon6i',
    type: 'local',
    address: 'agoric1zn4n8yq93ep2vjd8932yz8p8rzmsg5q4j0pw3g',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A/ujV6uvBYbcAVSDwGIp5wamLTk+227tmPA/Qcqcfsu3',
    },
  },
  {
    name: 'account-qfl206s7yyzvlymv6bu4vqgs',
    type: 'local',
    address: 'agoric1q7tn74auf6zf3dvadk45zhlghef9umn4y49pts',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AgUBBNukCJ1BGF2Jach8hWSst+pZjaZBTI9Iolm0n2gf',
    },
  },
  {
    name: 'account-qib9345r5wykafy76mmmofyl',
    type: 'local',
    address: 'agoric13rnyf0gnph2dn0nvuldvm22gzd3dum9arrd3sq',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ak+D1hMFP9R1KBo82CFq3aIQb31Qn8bWOQ1RcmfOCEpY',
    },
  },
  {
    name: 'account-qp80wsy2g2d50lcea0qlj5ty',
    type: 'local',
    address: 'agoric1sgy8cmc8962qu7yl2qvphszqj37y76mz404t5a',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AsXzqfvJwI4cP5AL8oXt11FbvRvvzlDHdcdKOzrl4WMH',
    },
  },
  {
    name: 'account-qu7qlymp0v8fw9q6y9zd27h6',
    type: 'local',
    address: 'agoric1tpjwemsaa2cs50fad8sr9gzzd4rhp78q8c2v8n',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A2H3ybQplOLiA+Ki5UAnRfkA844SJYHfM3YLKSNmA0uo',
    },
  },
  {
    name: 'account-qv6bx0y8s3b73ocxqjl4kx6s',
    type: 'local',
    address: 'agoric1y9cf2zv0jvlejv8nwjafq904765dy9wnfdavt8',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AxUkTs+Q6e2nsgn2ePPHtpelp81NmudcAXR7Rb+/oT3q',
    },
  },
  {
    name: 'account-qzq6vw7urx5djyp68ntrqvp2',
    type: 'local',
    address: 'agoric1k7sa2s7tzpdeu0qreuhg7hsk3fjyk4dy44mwe3',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AumNF4aTP8Xl150UPAPqZcgrzub2khZtsj66VTdtAcC0',
    },
  },
  {
    name: 'account-r3y9r4zwbelnhagbll5p02wi',
    type: 'local',
    address: 'agoric1cnp7p278qajzlg99usa0k5nstwqenreeavqla0',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A2UyMgLZB9WgF1NeACmkHbIfJp/8IuiCwjQs19bhyAIR',
    },
  },
  {
    name: 'account-raapkgwe6dc50mufo1m0hy9s',
    type: 'local',
    address: 'agoric1cfc35m3kl6kznz4fmt6q0a405c8w00wn68xlxm',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AkXy6lb/8p5TyFtewXPPaDTsbawHfknCsIq72TJHlaLV',
    },
  },
  {
    name: 'account-re6qpz59ub2he7vu1ves56iu',
    type: 'local',
    address: 'agoric1mgnze25gr37x3ssfx3mhkjsvvxm6jldmj8635d',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AwYBHkDGhpTjHa23GAe6Y6MNayquQvrVHespxBKY1Ifs',
    },
  },
  {
    name: 'account-rur04i5ho8fqxz9vhsqzsy9e',
    type: 'local',
    address: 'agoric13anj68y3jzqj52xfkg8zzvt86acj9ch0yh5ady',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AvbIBAbYP5zWQ8QGPKcWv+z/m83gRBimkvB/WXqSCfXd',
    },
  },
  {
    name: 'account-rzuw96cherdzlxkr0aivo2z3',
    type: 'local',
    address: 'agoric1jjydrl74tyhegjnswt7cn06z4h5m6wx2vhp98n',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A4Trw3oDKWJ34x9pveEp4QOwP3oNaXpeuwzEYf8Q7BTb',
    },
  },
  {
    name: 'account-s1t5kw7lck6h8x4qvo6bfhng',
    type: 'local',
    address: 'agoric1cyuhtq9f6jjvkrsxctk4hsf5t3v2jcp5muhgm8',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Aw1sg7D0SaMZPW4dEO9uxQCImKFhGdyW+tYrITEnX5Uu',
    },
  },
  {
    name: 'account-s29zi8btvs015rlmlovh7hol',
    type: 'local',
    address: 'agoric1yjl3lzfk6t9fsa7sj8xdajwqakywmwzxfealzl',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A/I0JPhuD98NpllsOGXgLrI8DaH6wV7yXF2TQEK7v6Ov',
    },
  },
  {
    name: 'account-s3r1w8luldu25zaqw1wf43yb',
    type: 'local',
    address: 'agoric1fln3fpus89zg8yt6x29ha4878qkh506pegk9vp',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AmoIdDVnY/73/pxWuZaIUa6ejYHJor4c041w2qIAtnvO',
    },
  },
  {
    name: 'account-s7zb4b2euc3bx9it9q041qk9',
    type: 'local',
    address: 'agoric1n0xm6kqk7y2883a0hhrsy5g957r92d9crpc7c5',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AxLUQItjxPd2SIfZogoWnEAvq3i2fWbvPsvTZK76YcFD',
    },
  },
  {
    name: 'account-sdxu5haxdvm3aw9prrkygcts',
    type: 'local',
    address: 'agoric1x0aahcycghvqpnjqqheu7khdjutr4zu3y48pya',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AuRCLATdQHidUg5a9mVuUYblmeLaDY5yPD4p+ibVd80o',
    },
  },
  {
    name: 'account-shd8zonm8giqccsyprhz5v34',
    type: 'local',
    address: 'agoric1j3kv637p4nzva0epz4t4c9tv4fyfhg09npep8c',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AoNwhzGvBtPwTBYp0+bJd23wnKNDIfJoF/4F5v7ehfUU',
    },
  },
  {
    name: 'account-snwkly3a2nv2gv35mnyl0ldk',
    type: 'local',
    address: 'agoric1vpns0huxyfhf9qtrt97p9t8fddsdd095f2g5nf',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AhNL1qMC5zHRJUApGxglErljnwzhCFlX/9pIlt74irZc',
    },
  },
  {
    name: 'account-sqy0t588j3aeb46ociuntec0',
    type: 'local',
    address: 'agoric1ttfc7620ufrzv34f7vwvujzua2t7zx8ppx7sn5',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A7YYlOQURlhC2lPxaxlI/2ApuKwP1+zMxf859Yz76rhD',
    },
  },
  {
    name: 'account-stu9ioxp23leqgxkaesojq29',
    type: 'local',
    address: 'agoric1p6wtr2kxz609w07ktzv2us79ss4mdqrsz0udmn',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AwywXc73kEhhHyPRtO/3rZj381h535YaId+ZSUOEsN5s',
    },
  },
  {
    name: 'account-swt0loyw9kh7ohcd9qi0oj42',
    type: 'local',
    address: 'agoric19u855nhcudw8geyt4c9lp9yeu4q2mv67vz8wpv',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AywGCswKvlylq5F7NsBoaRsCaOEkN7rElyOWTCrldxx0',
    },
  },
  {
    name: 'account-sx05ds7zpg53bex7yk0t40m6',
    type: 'local',
    address: 'agoric1feqfs4lye00drz7vamr5v2cdu69zhagkvxdd78',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AyhxcJ+nOqDWSjKdiDtWt+nxk4UipaSNxbRptcjfIV+B',
    },
  },
  {
    name: 'account-szf4hze76zzq0jxnugf0m47x',
    type: 'local',
    address: 'agoric1w0t85fd3cl8sjjsqcf8qft07ygjephran9tnkt',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A+Kygok77eBalazFBW9hXgcGetNQ9L+XSSjzChkQ2ZMA',
    },
  },
  {
    name: 'account-t1katisorg7n5peggnr6lnq1',
    type: 'local',
    address: 'agoric1d5mghs4zvcyhszeqnxvkfgpgfl5amy97snk38z',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AqCoiMsiqpy6Bi6iPcAtFNbIJWtcpAuNYPBorMKcf0gg',
    },
  },
  {
    name: 'account-t5v2loonkrhrsr4da5eqq7go',
    type: 'local',
    address: 'agoric14vuzz0d0nyhzwu4q942qpm5nc9lv589zhxta5y',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AyIMO7HgYKv2JqV8YwFopm/UM7t0WGhBQgWtanT6uX4I',
    },
  },
  {
    name: 'account-t9203xbz3abk5vmp76gn4gp3',
    type: 'local',
    address: 'agoric1uk3yy29q5jmly6p6xz8cevvz7h5upc83han0lc',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Akz4KM1hsmuPG5bBuFSFHbI7khQ90sKtSer6L4VgNt2j',
    },
  },
  {
    name: 'account-t9ffsvc4qr9j93qde0216def',
    type: 'local',
    address: 'agoric18z3ymtmyqz9pst5hkmp3eyssl8ka5ted6eg4yz',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A+2sNeJT4aj0bh/G4zorD0oSM5NuArORbLVc5r3+Cck8',
    },
  },
  {
    name: 'account-tdendugisre8cl36u5knqb5a',
    type: 'local',
    address: 'agoric1zhsh6d07nlfm7ka9l22zyaxyqnrfmnd7nvvfp7',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AkYNX5H/K01MINgwXFnlEzDkf7eHC0NQNS8jRrcWG01g',
    },
  },
  {
    name: 'account-thrdepa6yjewpixfyhwntprq',
    type: 'local',
    address: 'agoric174670j49nty84m8yzcy3a6d6w4latfxmmd2n39',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AuXBDMtzPWrlTHiBe+MGIMJzRX73jztzO67ZoRtnACt7',
    },
  },
  {
    name: 'account-tkevbr4rhsd7ysshiv9op26f',
    type: 'local',
    address: 'agoric14fns8vzlu5mjsckd7v8mvj8tlp58vc8w03k65k',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A+hmzyXP2pwuTxKJxtCbUtOTV3EnDl+RxkYdOcjzEXbS',
    },
  },
  {
    name: 'account-tmstqnum4dby169fmvhbpjlx',
    type: 'local',
    address: 'agoric1a567xch2q47hgtjk7yndskdjym38ewxyzywknt',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A8tYLrgp71TW0RhrXFu/DlBQoh1cGaT3rW4zA9W5aBSG',
    },
  },
  {
    name: 'account-toyak8cx1z0zqxpxhm81d9dx',
    type: 'local',
    address: 'agoric1ttk5padf7jn95cslwwj0kcetmat42ped7vkzmz',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A9z0U5nI1mmU9h7SVTdNV4muv/Lumt4Fk6SYboJx13HW',
    },
  },
  {
    name: 'account-tr1i4jbtaw2c3exxvqu5amh5',
    type: 'local',
    address: 'agoric12ehe2s9f0f8mj72dx2u6lcn3hgdeu8k0cpm67h',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'At2JVhm6BW73n9mcg18kqAVETgXfF6ma2wzDSTyOaRE5',
    },
  },
  {
    name: 'account-tv6496hy2k7g56qrwpkb856y',
    type: 'local',
    address: 'agoric1grk8xrp5pt9vyr47zskymrz7t883942geue2mx',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ao+Mn5SVv+h5Jc8iwQPd79Sjc+WlrHUvworUyeBGMn/L',
    },
  },
  {
    name: 'account-tvneuzzp0tnsljkfiawvgr74',
    type: 'local',
    address: 'agoric12yh7x3ha86sylnjjy8lmw8x6654dzf6g24p687',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A8OHtIu9/hmDBYw0wyOUc8VN7aGtWAiYBUm8aiYtrket',
    },
  },
  {
    name: 'account-tw3wkcsvifhfr3yz5s7xgxmr',
    type: 'local',
    address: 'agoric1afphwe3vtlsueeryycaz8wegcrwf9jpagmjghw',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AvEhOHZ4c3kR1TDIlV72j0iFVOBAEdMS0JIaFChaFakt',
    },
  },
  {
    name: 'account-u47clxe3gjj1de80emd2xj05',
    type: 'local',
    address: 'agoric1n5dallmte0xf0wpz7few09pz2ukj3e6kajkqlp',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A0n2pR48PL7H3yXL/xvC2eKiYh39DHRUv0M1gtUwquf1',
    },
  },
  {
    name: 'account-u9cd810dodgd3944mkdyd7oz',
    type: 'local',
    address: 'agoric15aaxlcxcykddyhx4frrcw3akrvvrgrd8zppmwe',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A2st5vI3IGXxvXWtHanqTl5LX+k4eduMwSjeZvlv8gaE',
    },
  },
  {
    name: 'account-ubsoncwi4yn84bhk56s0i91y',
    type: 'local',
    address: 'agoric1ya803qrzy6l5j42rjarsysx0wnnr0cuqltx5f6',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AkH4aQ6lL+QlNQkobMT+XDsI+vs7nkfvr7lDXvH0M48c',
    },
  },
  {
    name: 'account-ueo8zs8mdbs203e21swms3zm',
    type: 'local',
    address: 'agoric1rhzclhm9fa65kua7k0qcghyw42cedp3pds5zck',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A0WOWkYyA+ba35lsGtWaRioBKtcnFFVMLsQVvui0YQoK',
    },
  },
  {
    name: 'account-ujrla424k0ywg7x650ojbngs',
    type: 'local',
    address: 'agoric13kterreeh90yp846uvyr20cjmqet7jyldvl5u7',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AhimjdduUtTnsmTGNRJk8OOY+vuE/xbMvPoXAkyXaOMz',
    },
  },
  {
    name: 'account-ujvaz78m18x662dfyat7c9ly',
    type: 'local',
    address: 'agoric1p4sgf04dh2wcgc9clz0ep75s0mpwn4rfw95r32',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AtBDKLfjd1r2DVUb6h5wgY8sGYJevlTSz376nbqYdM00',
    },
  },
  {
    name: 'account-un4kt0bk3qmepja5la9tcww0',
    type: 'local',
    address: 'agoric1lwlgsmnuq73xhnccudgl0smx9en7dlug9kr5ts',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AgtrKJkx0BW6DXDEQMWRvdGyDW+/TM9zdhWKBnYmGLl+',
    },
  },
  {
    name: 'account-upemy6u7iqw1cboxkn0k9jkq',
    type: 'local',
    address: 'agoric1gxu5kudwdewac8kwz4nkpfyfqv576z0kvk3ahd',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A+qhrf/RVpHjqZknCDJQyyvsWpFYO85nqh1A+47CqZkT',
    },
  },
  {
    name: 'account-uq5zujfcbxgsf0k0gk650cxe',
    type: 'local',
    address: 'agoric1lk22rzxg9dncdnr968hayz57r4u0np5q022szm',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AwfjnADhtyCLWBQaHuv5YaIYyINT3rT2nb6BlXiadMhR',
    },
  },
  {
    name: 'account-utzsajp69xxt9fnp0z9cwy2j',
    type: 'local',
    address: 'agoric1khr58efm0m4vfarz7jeajskpklzsygn87eaxfd',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AsAFjB9oKGUiPdAQw8bTMbjOJ6d9INIOdwQ1KHekKrkb',
    },
  },
  {
    name: 'account-uzbw9b8xaatf6q7s0qre3vtk',
    type: 'local',
    address: 'agoric103y8s23znx4n4m38hyzfvh28w74t633la96jqn',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A9afvOUvemNnUPSOFRBTN896DrZnt31TQ7pc325DZjem',
    },
  },
  {
    name: 'account-v3uamdqcpn75enk48k6fqegq',
    type: 'local',
    address: 'agoric1aaf90ezklcynt38gddkcfx7xctecp4zjwjkwn4',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AxcVYEKRkyjaLi1A1GhDEvKafkqyLjlJvJCQIwjs5j4g',
    },
  },
  {
    name: 'account-vbya3wvz9b13nwyipzcgxnc1',
    type: 'local',
    address: 'agoric1md46563g4e56dgrtlchkppjr9hk2dezc0exer3',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A5uD/Yo3E7YWs/hyYfqXIO4sxx9lPxY/fvPl3A9pSRsS',
    },
  },
  {
    name: 'account-vcsnfvfljlaqul1xmxzemkuv',
    type: 'local',
    address: 'agoric1067cktnnx4jmtmvw3s6lcvlyajg0ysjhchfnz9',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A3E8LGtvpmV9AxrwcDMosNgdQTQeHIwrvEi48gCpMOCz',
    },
  },
  {
    name: 'account-vdzalpcjky2dr7z5zur17wyl',
    type: 'local',
    address: 'agoric1nr290zm5e5hqva4j0pcyenhak67qgwptw64hsa',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Amkh1y6cwFrzXGAqSrvrHAIVTCMKqoNPRwzGm+Yyd45I',
    },
  },
  {
    name: 'account-vgvd45rj3bwoqk9t0asast3q',
    type: 'local',
    address: 'agoric1ea8feltrrx6kdvy7p9mtm4mducax04fr8tmqqd',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AlPg05KLWOibm/OJojob1DhMQggT464hp7cqZXZDzb1U',
    },
  },
  {
    name: 'account-vjghb3twxflxmcd0zqpg7963',
    type: 'local',
    address: 'agoric1nf69a07p749664l5wc5wzn67clvc0ls3j8h99f',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ak21jyFoawqRGFvDesLJSh6YpLjv86bhG49Zf5UVteXe',
    },
  },
  {
    name: 'account-vn4onc59jvtc3k0669rjp4vv',
    type: 'local',
    address: 'agoric1s2fg4sphj5ayf27kgz50r83vfd8mudzqgq00p8',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Aop20kmkTdXuJF/cGZkRoGltzJSwnTBYHGzIlOmLwuiv',
    },
  },
  {
    name: 'account-voe5s5ibq3wndh85fudpkp67',
    type: 'local',
    address: 'agoric159rffkjnrtkt4hp5pd8mjawf8yp5498vgv2jlh',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ag4wx4RqOjXX5DMLdU2MtRw3reMAJ8PfjfWDipAfKjh8',
    },
  },
  {
    name: 'account-vt7zv006lxql5zls7ax62duu',
    type: 'local',
    address: 'agoric1qh0txwm7urrsgs6tjdqmeahfx7mafld9ntq6ja',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A8DXa9U7TZT+JlqgB0L/bmd0gpEn+YVvPcaNEM/s+nsN',
    },
  },
  {
    name: 'account-vyfu8vtqos0grbbkpco2iq3o',
    type: 'local',
    address: 'agoric13648ujpp35x2ykdy9gdqrelxp6j680c86n4fvn',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ahna/hcAYCyB3X6Hek2mjXdKgO0GroAKv7Y6dSubvoeq',
    },
  },
  {
    name: 'account-w8tj1t1pcju197ieq4w4v24m',
    type: 'local',
    address: 'agoric1my6gxyfkk8gnzxw8z34hmmzat75447x6l5nmej',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AkVlJht9pEsVoLnNMO38kKTO/hCALwvkuam9BayjLPMS',
    },
  },
  {
    name: 'account-w99b8dxt2q0pulc5x5x9pjmz',
    type: 'local',
    address: 'agoric15e6mfmqky0czs3jjyp870uucy842xxvstsrme5',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A59EapSV8PVyK5peuv2bQx/0lt/5OgYU2pt8LhECWlaz',
    },
  },
  {
    name: 'account-wbem0gksfxbmeplek10ovs3a',
    type: 'local',
    address: 'agoric1j7rwf46t2v98wdmt38lm02qg8c6wttqrzdd2v7',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AijZalHxI9XiwNY/Nw+CYZ/yhlSSPyUtbiU/hr3rPQn7',
    },
  },
  {
    name: 'account-wch57qcvxaauhiajas5dfqv9',
    type: 'local',
    address: 'agoric1v2lmwzeecgqksyxpkk7lylzl0a6c38v5jylva9',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AqAT3366aqhIPOwwBtuHNhUlaDj/BzWylxWfS2ZZHJND',
    },
  },
  {
    name: 'account-wi7aqsqm0ehi4gtd1gabovhd',
    type: 'local',
    address: 'agoric10vl6lgxckuanzz2kfkhd8mnp3uhueat9djk63p',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ajm1GHaozFGiFj1xYEQlrh1wMLvae/QON289yaZ+tLqt',
    },
  },
  {
    name: 'account-wles4f3wngradq4r95i202ch',
    type: 'local',
    address: 'agoric13vewqqczc0ds4lshwpgkxgc0tm0fjaradss4v0',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AqmaW1TeUZNRu/qgg1ed3qNewrvTiza5wvfVvQOar9La',
    },
  },
  {
    name: 'account-wojiz0pizcejendx517vwomm',
    type: 'local',
    address: 'agoric10vnrm5m2gzuhankahq2rcy6vardd7tjezvlmhu',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AifDiWWXtpBIUBjs6S0v0q7y7073EPETI8ncy+z4KnVj',
    },
  },
  {
    name: 'account-wpf74tefgrsi26530ublbynq',
    type: 'local',
    address: 'agoric1dvj4xzqshggtyzva3q822sryr8px3fy2lyd0gk',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A3wai2WxVJYgHcoEcs9A3po93EaFIUXw70gNrPxgoqhn',
    },
  },
  {
    name: 'account-ww771vdujms1nmddfaczjg76',
    type: 'local',
    address: 'agoric1guvm4wss24tdks6jxjhecv40e8gyn7ygw3rsm2',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AwhMy/DbRGPvh2hiLc9xaD7dFA77A/V14Rz3j57JQrEX',
    },
  },
  {
    name: 'account-wxu1y9gyttm0i3z9q6woefvi',
    type: 'local',
    address: 'agoric1ntvtyahntzjksn7tgu5f4n00lu26pfyjt8hlpu',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A6C+5XJr3YgUbNBUouHRhiI8o+UEGTeaZbX1t7Klm0d5',
    },
  },
  {
    name: 'account-x0btl92t0qtyvxslge2aoz67',
    type: 'local',
    address: 'agoric15shckqqkpfn322rdr999txg29wxkj4pgczkc3w',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A21lO5z3Dt0qT0GWbwJhMfiE87pUnp9VypUGkR2l4cbG',
    },
  },
  {
    name: 'account-x0j817fhoy9nw1sjhthjkrru',
    type: 'local',
    address: 'agoric1rnlas5wharpqt46pwfj3s8a69nwmsat6w9r6f5',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AvuIdx9IfZXc26Qs72WtGzFuCZacO5crXmt8jHNfEQH5',
    },
  },
  {
    name: 'account-x6i7umf351iqfbv39kj2jcyb',
    type: 'local',
    address: 'agoric19wdnzn953sdsn3x3n5uc8ydmu8gq3vzpfup5hs',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Avhzpk0gfWGHDN9fkbOFc95AoY/S/TMqRdOI2Q8koB0q',
    },
  },
  {
    name: 'account-xct7ow5xh3351v1j6kbwsurc',
    type: 'local',
    address: 'agoric1n2683v72s07hekzc3lvl6e0520rx43sg3rs3pw',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A4Le9pznbBACee9JqRSM8qjEGIwhCbkVXuDGsKDneGur',
    },
  },
  {
    name: 'account-xdxj7x0jn6rci5sxhh53907a',
    type: 'local',
    address: 'agoric1cl97j6y9s9f6ulvdkce4evpt2gz3da9vj44f27',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'At4SUYx3phAAC2wpIbh9SoK6EgxCFJhCzlyXy1m/FUVS',
    },
  },
  {
    name: 'account-xhgvptqv37y3zeaxebtbcis6',
    type: 'local',
    address: 'agoric1am0ft5qlzagl8ajg2s90xsxddxa29uavlfn65d',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Amq8OSff/YjHjB80/H3CQ3oqbqvjQ6XRE1+JmBfjDw3W',
    },
  },
  {
    name: 'account-xjjcqu159w21rltbeopscs2x',
    type: 'local',
    address: 'agoric1ususuzj7v6k4z5am8sgpgamlzt2xtntr7lwmmj',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AitbtMsHPkvTiz+BuRTpRFFiK0OpaedTgKPGddYMSDDS',
    },
  },
  {
    name: 'account-xtnjwvvkaq0jdd0o9k03q7yx',
    type: 'local',
    address: 'agoric1n8xvpf9pg5t5j06wscc5z8922safspe8c5lz39',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AgyturkW/joySDzCifibD/2Dguw4zrZSEoaRrvoslWvq',
    },
  },
  {
    name: 'account-y2f9cfqzi8tfghd8a80c3znv',
    type: 'local',
    address: 'agoric14dnwml2sfne7x4hl47smttxdw6n5239k6exzsd',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A1VHRTi7j5nA2b7voB73YKdF/kPAp/VtI+3RincKr3H6',
    },
  },
  {
    name: 'account-y4shgk4zf29cei9ccj4c3yi8',
    type: 'local',
    address: 'agoric1ceyxagel6ndc25rcxus4q73tvzqznhjyqjt47j',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Akf7x6pOhBxmfvk29xRbGyS6krZkFHO0Y6j3NlSVV40q',
    },
  },
  {
    name: 'account-y526kcmis3u2yb6w6s9cyrkq',
    type: 'local',
    address: 'agoric1es6v3vhwvwcfu2k8acf6v9hg5d2uu6tgwl2xz9',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A7hrqLLH1JZeBxFzROlxBir/zDROkg4/3rzsGF/gDowX',
    },
  },
  {
    name: 'account-y5hprfritzhr0y52he6d7ze7',
    type: 'local',
    address: 'agoric107x39yj2qyyvcefkz0g25mth3s6vlf5f0zelyg',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A83bkfvWUxsOH1z1C5+cExSNkR4e5XK6OsIjQC+ag8gZ',
    },
  },
  {
    name: 'account-y5i316l8cgx5axb5smchdvq2',
    type: 'local',
    address: 'agoric19yzvhcd2cqvhtjcqx8akvuj2fwa6svflhgnpxz',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AiJdTrQOWEZ1XMtS2goSXvsPE1/WZRZfeqmZhgx2HOV1',
    },
  },
  {
    name: 'account-y9286ov7jcoeq06zw6yc4o18',
    type: 'local',
    address: 'agoric1uv2n80s82twdgn3ccr8wutws6e3gh3zhxdrehn',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AySw7MIpNYG2OV1fHu0HjguyJOQlge/3a5a3BJCLftXT',
    },
  },
  {
    name: 'account-yg464qk6vb8une4v93qc51nm',
    type: 'local',
    address: 'agoric1enhglunxxanu6au5s2467sf8hdlrxaum6lg8yt',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Anbh2HwNVtDKtly9A1rHFcWC+85/NFbqn9EER5UESFsJ',
    },
  },
  {
    name: 'account-ygk4qbt7hryt3iduul5d38ag',
    type: 'local',
    address: 'agoric1592gv5dx9cn7lxtah9vr829quk0zyv0gvaw5ql',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'As2p0JorGWdl3c7vDejwfDEqU0GX+TZOmjfh7EfotZvd',
    },
  },
  {
    name: 'account-yh7h8yqtkntqzkss17fgb6l3',
    type: 'local',
    address: 'agoric16mm9pt4ka6f6vxekwd20gzn6gphk0u3kse0c96',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AzTppxtsaHOPsRJEzLu6QEZ4idRbIJxl/dpPXzixYt1c',
    },
  },
  {
    name: 'account-yihhwfcwa06sh0mqexi7sqmh',
    type: 'local',
    address: 'agoric16274ufvwfjlxjh0hvwmt3gmdnajqmakfw7krn0',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AlDLYpyzX6ytNNANH8aG/9ED+epqX29zFp2s1apGV9Dl',
    },
  },
  {
    name: 'account-yiil2jaf47hmbbihrrzre1e9',
    type: 'local',
    address: 'agoric1c5fl0hxzckdg7d7amy2w0dqlxy7jmafav8n28g',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AzmWzUy03q+R+YR6qfaP9wECTgDWiSr7xyaEpiCDM2/S',
    },
  },
  {
    name: 'account-yix0r9gn1borghr7aubctldg',
    type: 'local',
    address: 'agoric1s4z6p0ger50nkatdmv4ae8r0xpy8u6e7wvtp4s',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Aq76HFnTPHnHPp1HFrVCPCE5ybsyPdid9YHlfqxUxoCH',
    },
  },
  {
    name: 'account-ykjdp6ix50xcwa1ljj4z04ho',
    type: 'local',
    address: 'agoric1s03zytsdrm6cu0hraj3hm5em7l53rk8q9luk7v',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A9YFQsqCxQpZG+Sg83LIrqh15q400Y8wAbdkUxNCgNaP',
    },
  },
  {
    name: 'account-ykyzyz9pcbewi2aci37zgbus',
    type: 'local',
    address: 'agoric1cgfthy77psyfkhtnsfjvug7jk34xlrl2pdeeey',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A4wPwnj1UoQrdp06gJoFNkhHCl/Bt3nVO7IP2nvp4kuF',
    },
  },
  {
    name: 'account-ywdxxnzfdxt35llwlglevujy',
    type: 'local',
    address: 'agoric1ftae3ef6y49nh5h4gm3ue52udyw9cgfy68w47w',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ash1idrDBjWVNWjE5FGWJU+6cuivKdsrxsrpgGuN7hTe',
    },
  },
  {
    name: 'account-z4q7vyu9an7g13byqb3ecied',
    type: 'local',
    address: 'agoric1a485ktzy8ujdedq9eutsy4d5cft0taauw8nw8h',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A7qbhTSOwmSiZLtdYPvNoSpI4Nr7hVYSIHp8ALB9eJPk',
    },
  },
  {
    name: 'account-z9kja8uw4ph2v3xcshu5ysbg',
    type: 'local',
    address: 'agoric1nsnxfam7qpe57aly3ga57nvhnvg7lueryt2774',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A6eKHDk91Ns5kUjzzUBesFPJKigCyzTGEptYh6f7aX5w',
    },
  },
  {
    name: 'account-z9pqqb01mtxj1td6unebz5v5',
    type: 'local',
    address: 'agoric1qgxwqcg6pzpupfcuf4gpp67xz5fdr7eq4r46nr',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ax565rnWXQWX/1nQFo9sFlVadoYtmXKf30iLDstSNx18',
    },
  },
  {
    name: 'account-zef71xc81rnodft1m63wv13s',
    type: 'local',
    address: 'agoric1h9sgyp8huq7ax4m4yuzcx4kxeffsrr8wedqrjj',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Az6cAopG0uwliTsoFStD7N0K641DTFZuVHtm2ZN1rtkV',
    },
  },
  {
    name: 'account-zgfaydduvy0l2i5hqfftf6l9',
    type: 'local',
    address: 'agoric1a2c2mrhp3ujwezgz323m46mv003xgvmwvg9np2',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AkPi99UwePhmnhV5QjoYDgecQmKKtVJf/JYuRpF9mf7k',
    },
  },
  {
    name: 'account-zqo3xuww5ka4cishu3atiw38',
    type: 'local',
    address: 'agoric16kvcagzg82h0hayf48ph0fkyh5hket2qd37a74',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Axru125WCqGW6hS2tVJkMhil3+dGI+jT5skHN2qywRjm',
    },
  },
  {
    name: 'account-zs5k1dk4h8z8tk6qcni7mzi2',
    type: 'local',
    address: 'agoric1k6j3ekncunguc9zf7wgn5ln7zs47vy63377wal',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AxnVYDlKLeXVsfZJgQYJtxfGmhm2KRJknoU5b87wtfDO',
    },
  },
  {
    name: 'account-zv41h70d3qh8e773oeklaj70',
    type: 'local',
    address: 'agoric1mrkf5x8vlcmmd32428sr6xlr4d5rzvgdlzzqcn',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AhPu4eic7ihYlh //DlB097H3PlbA0kwh1t7qQqTLpVJ/',
    },
  },
  {
    name: 'account-zx75czq590ruriztmwora1el',
    type: 'local',
    address: 'agoric1346ysc7w33kjv5zf4axpdv2wgtfuu0f4ku5rmw',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Al7iLeax0bR+fAl0yCLQMDZBoNoPPU9B71i42cSb4Ppd',
    },
  },
  {
    name: 'account-zzbzwbd71088baw3a4b6i6j1',
    type: 'local',
    address: 'agoric1td0agu3rer44ypyedavvhk0pxq2csl3lgw8gag',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AiAsuXVrbWkpbQBH2pXNES8Y+gEWRs0uZBPFiHxTuRTB',
    },
  },
  {
    name: 'alice',
    type: 'local',
    address: 'agoric1mnv4fzhcg72fe50nmrdefjuftgdjqfwfasn3aq',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A+5irxIzJdS2whyk8xhfdegep+qCvVTaqORm5RcoZzAl',
    },
  },
  {
    name: 'bob',
    type: 'local',
    address: 'agoric1x67ucjwnap0g6qnrqn353u2g22m5gzj5g99sst',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Av7xB+fQefn5ugNQxqXluzkF3+3v1NogwnbDV6p+m+NS',
    },
  },
  {
    name: 'carol',
    type: 'local',
    address: 'agoric1hgkpfuf3ah7vamux08jy0sdxg6p9jjmegsacnc',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AuEDDpuv8jbw/Le70Ul2s5ES3L2t+idQ6YnDr0sCPVj/',
    },
  },
  {
    name: 'faucet',
    type: 'local',
    address: 'agoric1hm54wrxsv8e3pnw6lxj5lssfpexn48xtj6fhxw',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'ApbVlMcmEODtsa0hKbQDdfP6yDCVDtNsHfa0eJDYUlMm',
    },
  },
  {
    name: 'genesis',
    type: 'local',
    address: 'agoric19rplwp8y7kclys6rc5mc6pc9t393m9swzmdjtx',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AypaDjnPmDIfxBX2Tt6UQjeQq0ndaG5rQDbD4GLmwUQ5',
    },
  },
  {
    name: 'relayer-cli-1',
    type: 'local',
    address: 'agoric1r4gpq0tyg8jdm9mleq47f7k569yhyfnrx3p6da',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AiVRzInOYZGPadFqE1fmybdO+lxt728mOODUT+iCUIpW',
    },
  },
  {
    name: 'relayer-cli-2',
    type: 'local',
    address: 'agoric14edd8dcj4gm0rjzkfeuxyxmjtewfz8cwu6hc99',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ay1a99eE/NDlBCfltOBZJf5FEjJd7od3XRPykbdHOFj6',
    },
  },
  {
    name: 'relayer-cli-3',
    type: 'local',
    address: 'agoric177ttev07yagvyr4jmy94wnwma5nm2ctvj076g5',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ah1d0p817qdFQizepUhcj5wkhdDl8BkBoEpg0aFDy+dz',
    },
  },
  {
    name: 'relayer-cli-4',
    type: 'local',
    address: 'agoric1znrgxra5f9evjyuk5tkwttgdeakevp2ahlm3nv',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A8Gv8NXPOTgFWpTv2MSX76Xl9sZE+65bvRceRZbphpQv',
    },
  },
  {
    name: 'relayer1',
    type: 'local',
    address: 'agoric13pwxrtsdusljz8wc4j2wjec009cm0p38zr58hn',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ap81RxuzlZbd5+3ybmq+8sl3Iv1VXjJZPr1be+biVRg/',
    },
  },
  {
    name: 'relayer2',
    type: 'local',
    address: 'agoric1y73xu9wt3xm93wkk3d3ew0xwvhqmyu6gy82t9x',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ap7zXOumBCVg3Yf2carRdTbXFn2h/UGE2QlJzshomwpe',
    },
  },
  {
    name: 'relayer3',
    type: 'local',
    address: 'agoric1v97d7sgng3nke5fvdsjt5cwhu2tj0l3l3cqh30',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Aj5lolSVU/bw+e3kdMyQclfHpxO8E5kIU8o1XKJ8JjNO',
    },
  },
  {
    name: 'relayer4',
    type: 'local',
    address: 'agoric1xry4gpu5e63yv9f0v2p7huu767g5jm84e82t2m',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ay1/r8XmHU6cXNnRHaxu5QP4Z2kWfIi11ZUNbKQhnd5l',
    },
  },
  {
    name: 'test1',
    type: 'local',
    address: 'agoric1elueec97as0uwavlxpmj75u5w7yq9dgphq47zx',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A4PYpxsDLiygz7aqiBfjl8IpuSqmKHEg3Vf9r2EPXN1A',
    },
  },
];

const pubkeys = accounts.map(x => x.pubkey.key);

const root = merkleTreeAPI.generateMerkleRoot(pubkeys); // "236622f77321731f25d19cef0532d2f55287fc58608d74f694ce8ea3e7e91f61"

const AIRDROP_DATA = {
  merkleRoot: root,
  pubkeys,
  accounts,
};

const getProof = pubkey =>
  merkleTreeAPI.generateMerkleProof(pubkey, AIRDROP_DATA.pubkeys);

const testProofs = AIRDROP_DATA.accounts
  .slice(0, 20)
  .map(({ pubkey: { key } }) => getProof(key));
const trace = label => value => {
  console.log(label, '::::', value);
  return value;
};
console.log('------------------------');
console.log(
  'testProofs::',
  testProofs
    .map(trace('proof'))
    .map(merkleTreeAPI.getMerkleRootFromMerkleProof)
    .map(x => x === root),
);
console.log('------------------------');
console.log('pubkeys.length::', pubkeys.length);

export default AIRDROP_DATA;
