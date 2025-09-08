export const BITZY_QUERY_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "srcAmount",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "encodedRoutes",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "parts",
        type: "uint256",
      },
    ],
    name: "splitQuery",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "amountOut",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "bestIndex",
            type: "uint256",
          },
        ],
        internalType: "struct BitzyQueryV2.OneRoute",
        name: "",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "uint256[]",
            name: "distribution",
            type: "uint256[]",
          },
          {
            internalType: "uint256",
            name: "amountOut",
            type: "uint256",
          },
        ],
        internalType: "struct BitzyQueryV2.SplitRoute",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
