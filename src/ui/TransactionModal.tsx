import React from "react";

import { BLOCK_EXPLORER_URL } from "../constants";
import Modal from "./Modal";

interface Props {
  chainId: number | undefined;
  transactionHash: string | null;
}

function TransactionModal({ chainId, transactionHash }: Props) {
  return (
    <Modal
      title={
        transactionHash ? "Waiting for confirmation" : "Complete Transaction"
      }
    >
      {transactionHash ? (
        <div>
          Waiting for transaction to be confirmed. Check status on{" "}
          <a
            className="text-blue-500"
            target="_blank"
            rel="noreferrer"
            href={`${
              BLOCK_EXPLORER_URL[chainId as number]
            }/tx/${transactionHash}`}
          >
            Explorer
          </a>
        </div>
      ) : (
        <div>Complete the transaction in your wallet.</div>
      )}
    </Modal>
  );
}

export default TransactionModal;
