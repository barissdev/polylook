// components/Web3AuthProvider.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { Web3Auth } from "@web3auth/modal";
import {
  CHAIN_NAMESPACES,
  SafeEventEmitterProvider,
} from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";

type Web3AuthContextValue = {
  loading: boolean;
  ready: boolean;
  error: string | null;
  connected: boolean;
  address: string | null;
  user: any | null;
  connect: () => Promise<void>;
  logout: () => Promise<void>;
};

const Web3AuthContext = createContext<Web3AuthContextValue | null>(null);

export function useWeb3Auth() {
  const ctx = useContext(Web3AuthContext);
  if (!ctx) {
    throw new Error("useWeb3Auth must be used inside Web3AuthProvider");
  }
  return ctx;
}

export function Web3AuthProvider({ children }: { children: ReactNode }) {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [provider, setProvider] = useState<SafeEventEmitterProvider | null>(
    null
  );
  const [user, setUser] = useState<any | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- INIT ---
  useEffect(() => {
    async function init() {
      try {
        const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;

        if (!clientId) {
          console.error("Missing NEXT_PUBLIC_WEB3AUTH_CLIENT_ID");
          setError("Missing Web3Auth client id");
          setReady(false);
          setLoading(false);
          return;
        }

        // 1) ChainConfig => Polygon mainnet (Polymarket)
        const chainConfig = {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: "0x89", // Polygon mainnet
          rpcTarget: "https://polygon-rpc.com",
          displayName: "Polygon Mainnet",
          ticker: "MATIC",
          tickerName: "Polygon",
        };

        // 2) PrivateKeyProvider
        const privateKeyProvider = new EthereumPrivateKeyProvider({
          config: { chainConfig },
        });

        // 3) Web3Auth instance
        const instance = new Web3Auth({
          clientId,
          web3AuthNetwork: "sapphire_devnet", // şu an devnettesin
          privateKeyProvider,
        });

        setWeb3auth(instance);

        // 4) Modal init (login butonları vs.)
        await instance.initModal({
          // İstersen login butonlarını burada kısıtlayabilirsin
          // example:
          // modalConfig: {
          //   walletConnect: { disabled: true },
          // },
        });

        // 5) Eğer zaten bağlı bir session varsa
        if (instance.connected && instance.provider) {
          const prov = instance.provider as SafeEventEmitterProvider;
          setProvider(prov);

          const userInfo = await instance.getUserInfo();
          setUser(userInfo);

          const accounts = (await prov.request({
            method: "eth_accounts",
          })) as string[];
          setAddress(accounts?.[0] ?? null);
        }

        setReady(true);
      } catch (err) {
        console.error("Web3Auth init error:", err);
        setError("Failed to initialize Web3Auth");
        setReady(false);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  // --- CONNECT ---
  const connect = async () => {
    if (!web3auth) {
      setError("Web3Auth not ready. Reload the page.");
      return;
    }

    try {
      setLoading(true);
      const prov = (await web3auth.connect()) as SafeEventEmitterProvider | null;

      if (!prov) {
        setError("No provider returned from Web3Auth");
        return;
      }

      setProvider(prov);

      const userInfo = await web3auth.getUserInfo();
      setUser(userInfo);

      const accounts = (await prov.request({
        method: "eth_accounts",
      })) as string[];
      setAddress(accounts?.[0] ?? null);
      setError(null);
    } catch (err) {
      console.error("Web3Auth connect error:", err);
      setError("Failed to connect with Web3Auth");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGOUT ---
  const logout = async () => {
    if (!web3auth) return;

    try {
      setLoading(true);
      await web3auth.logout();
      setProvider(null);
      setUser(null);
      setAddress(null);
      setError(null);
    } catch (err) {
      console.error("Web3Auth logout error:", err);
      setError("Failed to logout from Web3Auth");
    } finally {
      setLoading(false);
    }
  };

  const value: Web3AuthContextValue = {
    loading,
    ready,
    error,
    connected: !!provider,
    address,
    user,
    connect,
    logout,
  };

  return (
    <Web3AuthContext.Provider value={value}>
      {children}
    </Web3AuthContext.Provider>
  );
}