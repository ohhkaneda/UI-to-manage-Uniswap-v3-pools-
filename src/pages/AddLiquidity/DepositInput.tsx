import React, { useState, useEffect, useRef } from "react";
import { Token } from "@uniswap/sdk-core";

import TokenLabel from "../../ui/TokenLabel";
import TokenLogo from "../../ui/TokenLogo";
import { formatInput } from "../../utils/numbers";
import { WETH9 } from "../../constants";

interface DepositInputProps {
  token: Token;
  value: number;
  balance: string;
  tabIndex: number;
  disabled: boolean;
  wrapped: boolean;
  onChange: (value: number) => void;
  onWethToggle: () => void;
}

function DepositInput({
  token,
  value,
  balance,
  tabIndex,
  disabled,
  wrapped,
  onChange,
  onWethToggle,
}: DepositInputProps) {
  const inputEl = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState<string>("0.00");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const input = formatInput(value, false);
    setInput(input);
  }, [value]);

  const setInputWithDirty = (val: string) => {
    setInput(val);
    setDirty(true);
  };

  const handleInput = (ev: { target: any }) => {
    const val = ev.target.value;
    if (val === "") {
      setInput("0.00");
      return;
    }
    setInputWithDirty(val);
  };

  const handleBlur = () => {
    if (!dirty) {
      return;
    }

    const valueNum = parseFloat(input);
    if (!Number.isNaN(valueNum)) {
      setDirty(false);
      onChange(valueNum);
    }
  };

  const handleMaxBalance = () => {
    setInputWithDirty(balance);
    if (inputEl.current) {
      inputEl.current.focus();
      window.setTimeout(() => {
        if (inputEl.current) {
          inputEl.current.blur();
          inputEl.current.focus();
        }
      }, 5);
    }
  };

  return (
    <div className="w-full flex flex-wrap items-start border rounded p-2 my-2 relative">
      <div className="w-1/3 flex items-center p-1 my-1 justify-between bg-slate-200 dark:bg-slate-800 border rounded">
        <TokenLogo name={token.name} address={token.address} />
        <TokenLabel name={token.name} symbol={token.symbol} wrapped={wrapped} />
      </div>
      <input
        className="w-2/3 focus:outline-none text-2xl p-2 text-right bg-white dark:bg-slate-900"
        type="text"
        value={input}
        tabIndex={tabIndex}
        onChange={handleInput}
        onBlur={handleBlur}
        ref={inputEl}
      />
      <div className="w-full text-sm my-1">
        <span>Balance: {balance} </span>
        <TokenLabel
          name={token.name}
          symbol={token.symbol}
          wrapped={wrapped}
        />{" "}
        (
        <button
          className="text-blue-500 dark:text-blue-200"
          onClick={handleMaxBalance}
        >
          Max
        </button>
        {token.equals(WETH9[token.chainId]) && token.chainId !== 137 && (
          <>
            <span className="px-1">|</span>
            <button
              className="text-blue-500 dark:text-blue-200"
              onClick={onWethToggle}
            >
              {wrapped ? "Use ETH" : "Use WETH"}
            </button>
          </>
        )}
        )
      </div>
      {disabled && (
        <div className="absolute w-full -m-2 py-4 px-2 h-full bg-white bg-opacity-90 dark:bg-slate-700">
          <div className="text-sm text-center text-slate-600 dark:text-slate-300">
            The market price is outside your specified price range. Single-asset
            deposit only.
          </div>
        </div>
      )}
    </div>
  );
}

export default DepositInput;
